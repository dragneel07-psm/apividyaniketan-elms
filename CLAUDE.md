# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant school LMS with three sub-projects:
- **Backend**: Django 5.2 + DRF + django-tenants (schema-per-tenant) + PostgreSQL/pgvector + Celery/Redis + Django Channels (WebSockets)
- **Frontend**: Next.js (App Router) + TypeScript + TailwindCSS 4 + React Query
- **Mobile**: Expo 55 + React Native 0.83
- **E2E Tests**: Playwright (root-level `/tests/`)

---

## Commands

### Backend (`/backend/`)

```bash
# Setup
cd backend && python3.13 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt

# Dev server
python manage.py runserver 0.0.0.0:8000

# Migrations (order matters for multi-tenancy)
python manage.py migrate_schemas --shared
python manage.py migrate_schemas --tenant

# Run all tests
python manage.py test

# Run a single test
python manage.py test academic.tests.TestClass.test_method

# Lint/format (must be in venv)
black . && flake8 . && isort .
```

### Frontend (`/frontend/`)

```bash
npm install
# Same-origin proxy mode is required: auth tokens live in httpOnly cookies and
# the /api/[...path] proxy attaches them to backend requests server-side.
BACKEND_API_ORIGIN=http://127.0.0.1:8000 NEXT_PUBLIC_API_URL=/api npm run dev -- --hostname 127.0.0.1 --port 3000

npm run lint          # ESLint
npm run type-check    # tsc --noEmit
npm run build
```

### Mobile (`/mobile/`)

```bash
npm install
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api npm start
npm run ios / npm run android
```

### E2E Tests (root)

```bash
npm install
npm run test:e2e                  # All tests
npm run test:e2e:smoke            # Quick smoke suite
npm run test:e2e:critical         # Critical user flows

# Single test / filtered
npx playwright test tests/e2e/smoke/auth.spec.ts --grep="login" --project=chromium

# Generate TypeScript API types from OpenAPI schema
npm run api:types
```

### Docker (full stack)

```bash
docker compose up   # Starts backend, frontend, PostgreSQL, Redis, Celery
```

---

## Architecture

### Multi-Tenancy (django-tenants)

Each school is a PostgreSQL schema. Apps are split into:
- **SHARED_APPS** (public schema): `core`, `users`, `billing`, `billing_saas`, `auditlog`
- **TENANT_APPS** (per-tenant schemas): `academic`, `ai_engine`, `notifications`, `library`, `gamification`, `conversations`, `billing_school`, `projects`

Tenant resolution order (set in `frontend/proxy.ts` as `x-tenant-id` header):
1. `x-tenant-id` HTTP header (dev override)
2. Subdomain from hostname
3. Fallback to `'public'`

All tenant-scoped models carry a `tenant = FK(Tenant)` field and must filter by `tenant=self.tenant`. DB alias pattern used in services: `db_alias = getattr(student, '_state', None).db or 'default'`.

### Frontend Routing (`frontend/proxy.ts`)

There is **no `middleware.ts`** — all routing logic lives in `proxy.ts` (used as Next.js middleware via config). It handles:
- **JWT extraction** from cookies → decodes role
- **Role-based route guards**: `/admin` (admin/staff), `/saas` (saas_admin), `/teacher`, `/student`, `/parent`
- **Root `/` behavior**: unauthenticated on tenant host → rewrite to `/school` (school landing); authenticated → redirect to role dashboard
- **Tenant header injection**: sets `x-tenant-id` on every request to the backend
- **Cookie cleanup** on stale/invalid tokens

Role → dashboard map: `admin/staff → /admin`, `teacher → /teacher`, `student → /student`, `saas_admin → /saas`, `parent → /parent`

### Frontend App Structure

```
frontend/app/
├── (auth)/       # Login, register, verify-email, forgot-password
├── (saas)/       # SaaS admin panel
├── admin/        # School admin/staff dashboard
├── student/      # Student interface (most developed, ~27 files)
├── teacher/      # Teacher interface (~22 files)
├── parent/       # Parent interface
├── school/       # Per-tenant school landing page
├── api/          # Next.js API route handlers
└── page.tsx      # Root/SaaS landing page
```

### Backend URL Structure (`backend/config/urls.py`)

All routes are under `/api/` (aliased at `/api/v1/`):
- `/api/core/` — tenant management
- `/api/users/` — auth, user management
- `/api/academic/` — classes, subjects, lessons, assessments
- `/api/ai/` — AI tutor, learning paths, reports, analytics
- `/api/billing/`, `/api/billing/saas/`, `/api/billing/school/`
- `/api/notifications/`, `/api/library/`, `/api/gamification/`, `/api/conversations/`
- `/api/projects/` — group/individual project tracking (gated by `tenant.features['projects']`)
- `POST /api/token/` — obtain JWT; `POST /api/token/refresh/` — refresh JWT

### AI Engine (`backend/ai_engine/`)

Services (in `ai_engine/services/`):
- **RAGTutorService** — pgvector cosine similarity retrieval, grounded + general chat
- **LearningPathService** — rule-based path generation using weak areas + next lessons
- **RiskAnalyticsService** — attendance + grade-based at-risk detection
- **PersonalizationService**, **PredictiveAnalyticsService**, **AssistedGradingService**
- **ExamGeneratorService**, **QuizGeneratorService**, **LessonSummaryService**

Background tasks in `ai_engine/tasks.py` use Celery with a sync fallback via `core.async_jobs`.

### Async Processing

Celery + Redis (`redis://localhost:6379/1`). Celery config: `backend/config/celery.py`. WebSockets via Django Channels.

### Auth

JWT via `djangorestframework_simplejwt`. Role-aware token lifetimes configured in settings. Roles: `saas_admin`, `admin`, `staff`, `teacher`, `student`, `parent`.

---

## Key Environment Variables

**Backend** (see `backend/.env.example`): `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `SENTRY_DSN`, `FRONTEND_URL`, `PRIMARY_PUBLIC_DOMAIN`

**Frontend** (see `frontend/.env.example`): `NEXT_PUBLIC_API_URL` (defaults to `/api`), `BACKEND_API_ORIGIN` (server-side direct), `NEXT_PUBLIC_SITE_URL`

**Mobile**: `EXPO_PUBLIC_API_URL`

---

## Custom Management Commands

```bash
python manage.py seed_data          # Seed test data
python manage.py init_prod          # Initialize production (public tenant, domains)
python manage.py backup_tenant      # Backup tenant data
python manage.py upsert_tenant_user # Create/update a tenant user
python manage.py reset_tenants_to_demo
python manage.py reconcile_public_users_to_tenants
```
