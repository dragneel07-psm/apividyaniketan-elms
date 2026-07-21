# Project Design Used in E-LearningWebApp
## Actual Architecture and Technology (Repository Truth)

**Last verified:** March 4, 2026

This document captures the real project design and technology currently used in this repository.

## 1. Product Architecture Used

### 1.1 Runtime Topology
```text
Web (Next.js) + Mobile (Expo)
           |
           | JWT + x-tenant-id
           v
Django REST API (multi-tenant)
           |
           v
PostgreSQL (django-tenants schema-per-tenant)
```

### 1.2 Multi-Tenant Strategy Used
- Package: `django-tenants==3.9.0`
- Tenant model: `core.Tenant`
- Domain model: `core.Domain`
- Config source: `backend/config/settings/base.py`
- Routing middleware: `core.middleware.TenantFromHeaderMiddleware`
- Tenant resolution priority:
  1. `x-tenant-id` header
  2. domain lookup fallback

### 1.3 Auth and Session Design Used
- Backend auth: JWT via `djangorestframework_simplejwt==5.5.1`
- API login endpoint: `/api/users/login/`
- Refresh endpoint: `/api/users/refresh/`
- Frontend middleware/proxy validates and routes by role:
  - `frontend/proxy.ts`
- Roles in use (`users.UserAccount`):
  - `student`, `teacher`, `parent`, `admin`, `staff`, `saas_admin`

## 2. Repository Module Design Used

### 2.1 Backend Domain Modules
- `core` (tenancy, global settings, audit)
- `users` (accounts, auth)
- `academic` (classes, sections, subjects, lessons, assessments, exams, timetable, attendance)
- `billing` (subscription and school finance)
- `library` (books and book issue lifecycle)
- `ai_engine` (AI interactions, reports, learning path, study schedule)
- `notifications` (notification and templates)
- `conversations` (chat/group messaging)
- `gamification` (badges, points, profiles)

### 2.2 Frontend Design Used
- Framework: Next.js 16 App Router
- Major structure:
  - `frontend/app/admin`
  - `frontend/app/teacher`
  - `frontend/app/student`
  - `frontend/app/parent`
  - `frontend/app/(saas)`
- Shared UI/component architecture under `frontend/components/*`
- API client layers:
  - `frontend/services/api.ts`
  - `frontend/lib/api.ts`

### 2.3 Mobile Design Used
- Framework: Expo + React Native
- API base env: `EXPO_PUBLIC_API_URL`
- State/tooling includes async storage + netinfo + navigation + zustand

## 3. Technology Stack Used (Actual Versions)

### 3.1 Backend
- Python runtime expected by scripts: 3.13 (`backend/run_dev.sh`)
- Runtime file currently says: `python-3.10.*` (`runtime.txt`)
- Django: `5.2.9`
- DRF: `3.16.1`
- django-tenants: `3.9.0`
- simplejwt: `5.5.1`
- Postgres driver: `psycopg2-binary==2.9.11`
- Gunicorn: `23.0.0`
- WhiteNoise: `6.11.0`

### 3.2 Frontend
- Next.js: `16.1.2`
- React / React-DOM: `19.2.3`
- TypeScript: `^5`
- UI: Radix UI + Tailwind 4 + custom components
- Charts: `recharts`
- Forms/validation: `react-hook-form` + `zod`

### 3.3 Mobile
- Expo: `~55.0.2`
- React Native: `0.83.2`
- React: `19.2.0`

### 3.4 Testing
- Playwright: `@playwright/test ^1.58.2`
- E2E suites:
  - `tests/e2e/critical/lms-critical.spec.ts`
  - `tests/e2e/critical/lms-deployed-scale.spec.ts`
  - `tests/e2e/smoke/example.spec.ts`

## 4. API Design Used
Main API roots (`backend/config/urls.py`):
- `/api/core/`
- `/api/users/`
- `/api/academic/`
- `/api/billing/`
- `/api/ai/`
- `/api/notifications/`
- `/api/library/`
- `/api/gamification/`
- `/api/conversations/`

## 5. Delivery and Operations Design Used

### 5.1 CI/CD
- Backend workflow: `.github/workflows/backend-ci.yml`
- Frontend workflow: `.github/workflows/frontend-ci.yml`
- Playwright workflow: `.github/workflows/playwright.yml`

### 5.2 Deployment
- Backend deployment config:
  - `railway.toml`
  - `nixpacks.toml`
- Startup performs tenant-aware migrations + `init_prod` + gunicorn startup.
- Frontend deploy target in workflows: Vercel.

### 5.3 Local Development
- Backend helper: `backend/run_dev.sh`
- Compose stack: `docker-compose.yml` (backend/frontend/db)

## 6. Current Design Risks / Improvement Backlog
- Python version drift (`runtime.txt` vs dev script expectations).
- Frontend has two API client layers (`services/api.ts` and `lib/api.ts`) that should be consolidated.
- Some CI jobs reference expected tests/coverage not yet fully implemented in frontend.
- API response normalization is required in UI modules to avoid `.map/.filter is not a function` runtime errors.

