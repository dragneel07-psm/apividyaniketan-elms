---
name: skill
description: Project expert assistant for the E-LearningWebApp — a multi-tenant school LMS. Knows all commands, patterns, and workflows for the Django backend, Next.js frontend, Expo mobile app, and AI engine. Use this when starting a new task to get a context-aware assistant.
---

You are an expert developer on this E-LearningWebApp project. You have deep knowledge of the full stack and multi-tenant architecture. When helping with tasks, apply this knowledge automatically without asking the user to re-explain project conventions.

## Project Structure

Multi-tenant school LMS with three sub-projects:
- **Backend**: `backend/` — Django 5.2 + DRF + django-tenants (schema-per-tenant) + PostgreSQL/pgvector + Celery/Redis + Django Channels
- **Frontend**: `frontend/` — Next.js (App Router) + TypeScript + TailwindCSS 4 + React Query
- **Mobile**: `mobile/` — Expo 55 + React Native 0.83
- **E2E Tests**: `tests/` — Playwright

## Multi-Tenancy Rules (Critical)

- Each school = one PostgreSQL schema via django-tenants
- **SHARED_APPS** (public schema): `core`, `users`, `billing`, `billing_saas`, `auditlog`
- **TENANT_APPS** (per-tenant): `academic`, `ai_engine`, `notifications`, `library`, `gamification`, `conversations`, `billing_school`
- All tenant-scoped models have `tenant = FK(Tenant)` and must filter by `tenant=self.tenant`
- DB alias pattern in services: `db_alias = getattr(student, '_state', None).db or 'default'`
- Tenant resolved from `x-tenant-id` header → subdomain → fallback `'public'`
- Run migrations in order: `migrate_schemas --shared` then `migrate_schemas --tenant`

## Backend Commands

```bash
cd backend && source .venv/bin/activate

# Dev server
python manage.py runserver 0.0.0.0:8000

# Migrations (order matters!)
python manage.py migrate_schemas --shared
python manage.py migrate_schemas --tenant

# Tests
python manage.py test
python manage.py test academic.tests.TestClass.test_method

# Lint/format
black . && flake8 . && isort .

# Data seeding
python manage.py seed_data              # Main test data (--clear to reset)
python manage.py seed_gamification
python manage.py seed_library

# Multi-tenant ops
python manage.py migrate_tenants        # Migrate all tenants
python manage.py backup_tenant          # --schema or --all
python manage.py reset_tenants_to_demo
python manage.py reconcile_public_users_to_tenants
python manage.py upsert_tenant_user
python manage.py init_prod              # Production initialization

# AI engine
python manage.py ai_index_content       # Index content for RAG
python manage.py generate_ai_reports    # Generate AI progress reports

# Other
python manage.py backfill_gamification_profiles
python manage.py run_triggers           # Notification triggers
```

## Frontend Commands

```bash
cd frontend

# Dev server
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 npm run dev -- --hostname 127.0.0.1 --port 3000

npm run lint          # ESLint
npm run type-check    # tsc --noEmit
npm run build
```

## Mobile Commands

```bash
cd mobile
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api npm start
npm run ios
npm run android
```

## E2E Tests (root)

```bash
npm run test:e2e                  # All tests
npm run test:e2e:smoke            # Quick smoke suite
npm run test:e2e:critical         # Critical user flows
npm run api:types                 # Generate TS types from OpenAPI schema

# Single test
npx playwright test tests/e2e/smoke/auth.spec.ts --grep="login" --project=chromium
```

## Frontend Routing

- **No `middleware.ts`** — all routing logic is in `frontend/proxy.ts`
- JWT extracted from cookies → role decoded → role-based route guards
- Role → dashboard: `admin/staff → /admin`, `teacher → /teacher`, `student → /student`, `saas_admin → /saas`, `parent → /parent`
- Root `/` on tenant host: unauthenticated → rewrite `/school`; authenticated → redirect to role dashboard

## Frontend App Structure

```
frontend/app/
├── (auth)/       # Login, register, verify-email, forgot-password
├── (saas)/       # SaaS admin panel
├── admin/        # School admin/staff dashboard
├── student/      # Student interface
├── teacher/      # Teacher interface
├── parent/       # Parent interface
├── school/       # Per-tenant school landing page
├── api/          # Next.js API route handlers
└── page.tsx      # Root/SaaS landing page
```

## Backend URL Structure

All routes under `/api/` (aliased at `/api/v1/`):
- `/api/core/` — tenant management
- `/api/users/` — auth, user management
- `/api/academic/` — classes, subjects, lessons, assessments
- `/api/ai/` — AI tutor, learning paths, reports, analytics
- `/api/billing/`, `/api/billing/saas/`, `/api/billing/school/`
- `/api/notifications/`, `/api/library/`, `/api/gamification/`, `/api/conversations/`
- `POST /api/token/` — obtain JWT; `POST /api/token/refresh/` — refresh JWT

## AI Engine (`backend/ai_engine/`)

Services in `ai_engine/services/`:
- **RAGTutorService** — pgvector cosine similarity retrieval, grounded + general chat, persistent memory
- **LearningPathService** — rule-based path generation using weak areas + next lessons
- **RiskAnalyticsService** — attendance + grade-based at-risk detection
- **PersonalizationService**, **PredictiveAnalyticsService**, **AssistedGradingService**
- **ExamGeneratorService**, **QuizGeneratorService**, **LessonSummaryService**
- SM-2 spaced repetition, BKT skill mastery, AI study planner, AI progress reports

Background tasks in `ai_engine/tasks.py` use Celery with sync fallback via `core.async_jobs`.

## Auth

JWT via `djangorestframework_simplejwt`. Roles: `saas_admin`, `admin`, `staff`, `teacher`, `student`, `parent`.

## Key Files

- `backend/config/settings/base.py` — settings (AI_* prefix for AI config)
- `backend/config/celery.py` — Celery config
- `backend/config/urls.py` — root URL config
- `backend/academic/models/` — student, lesson, subject, class_section, assessment
- `frontend/services/api.ts` — frontend API service
- `frontend/proxy.ts` — routing/auth middleware

## Docker

```bash
docker compose up   # Starts backend, frontend, PostgreSQL, Redis, Celery
```

Now assist the user with whatever task they describe, applying this project knowledge throughout.
