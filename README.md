# E-Learning WebApp
## Professional Project Manual (Single Source of Truth)

**Last updated:** March 5, 2026  
**Document owner:** Engineering Team  
**Status:** Active

This file is the canonical documentation for the entire repository. Historical notes and legacy merged docs are archived under `docs/archive/` and are no longer the operational source of truth.

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Product Scope](#product-scope)
3. [Architecture Overview](#architecture-overview)
4. [Repository Structure](#repository-structure)
5. [Technology Stack](#technology-stack)
6. [SDLC and Engineering Process](#sdlc-and-engineering-process)
7. [Environment and Prerequisites](#environment-and-prerequisites)
8. [Local Development Setup](#local-development-setup)
9. [Configuration and Secrets](#configuration-and-secrets)
10. [Database and Tenant Operations](#database-and-tenant-operations)
11. [Testing Strategy and Commands](#testing-strategy-and-commands)
12. [CI/CD Pipelines](#cicd-pipelines)
13. [Deployment Runbook](#deployment-runbook)
14. [Operations and Incident Management](#operations-and-incident-management)
15. [Security and Compliance Baseline](#security-and-compliance-baseline)
16. [Maintenance Plan (Long-Run)](#maintenance-plan-long-run)
17. [Contribution Workflow](#contribution-workflow)
18. [Troubleshooting Guide](#troubleshooting-guide)
19. [Latest Improvements (March 2026)](#latest-improvements-march-2026)
20. [Roadmap and Planning Framework](#roadmap-and-planning-framework)
21. [Definition of Done](#definition-of-done)

## Executive Summary
E-Learning WebApp is a multi-tenant school management and LMS platform serving school operations for SaaS admin, school admin, staff, teachers, students, and parents.

Primary goals:
- Centralize school operations in one platform.
- Enforce tenant isolation by school.
- Support academic workflows end-to-end: classes, subjects, lessons, assessments, exams, timetable, results, library, billing, notifications.
- Provide role-based dashboards on web and mobile.
- Maintain deployment readiness through repeatable tests and CI/CD.

## Product Scope
Core modules currently represented in backend/frontend code:
- Authentication and role-based access (SaaS admin, admin, staff, teacher, student, parent).
- Tenant management and SaaS-level controls.
- Academic management: years, classes, sections, subjects, teachers, students, parents.
- Learning workflows: chapters, lessons, materials, lesson progress.
- Assessment workflows: quizzes, assignments, exams, submissions, results.
- Timetable management including main and extra classes with approval flow.
- Library module: books and issue flows.
- Billing and school finance.
- AI module: tutor chat, reports, recommendations, analytics.
- Notifications, conversations, gamification, reports.

## Architecture Overview
### High-Level Runtime Architecture
```text
Frontend (Next.js) + Mobile (Expo)
            |
            |  JWT + x-tenant-id
            v
Backend API (Django + DRF + django-tenants)
            |
            v
PostgreSQL (schema-based tenant isolation)
```

### Tenant Isolation Model
- Uses `django-tenants` with:
  - `TENANT_MODEL = core.Tenant`
  - `TENANT_DOMAIN_MODEL = core.Domain`
- Middleware resolution priority:
  - `x-tenant-id` request header.
  - Domain-based fallback.
- Shared vs tenant apps are separated in `backend/config/settings/base.py`.

### Backend API Surface
Main API roots in `backend/config/urls.py`:
- `/api/core/`
- `/api/users/`
- `/api/academic/`
- `/api/billing/`
- `/api/ai/`
- `/api/notifications/`
- `/api/library/`
- `/api/gamification/`
- `/api/conversations/`

## Repository Structure
```text
E-LearningWebApp/
├── backend/                 # Django backend, tenant-aware APIs
├── frontend/                # Next.js web app
├── mobile/                  # Expo React Native app
├── tests/                   # Playwright E2E and test fixtures
├── .agent/sdlc-workflow/    # 12-phase professional SaaS delivery workflow
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml       # Local multi-service stack
├── railway.toml             # Backend deploy config (Railway)
├── nixpacks.toml            # Build config
└── README.md                # This master project manual
```

## Technology Stack
### Backend
- Python, Django, Django REST Framework
- `django-tenants` for schema-based multitenancy
- JWT auth (`djangorestframework_simplejwt`)
- PostgreSQL (`psycopg2`)
- WhiteNoise + Gunicorn

### Frontend
- Next.js (App Router), React, TypeScript
- TailwindCSS, Radix UI, React Hook Form, Zod
- Axios-based API client with tenant header propagation

### Mobile
- Expo / React Native

### Testing
- Playwright E2E suites (`tests/e2e/*`)

### CI/CD
- GitHub Actions:
  - `backend-ci.yml`
  - `frontend-ci.yml`
  - `playwright.yml`

## SDLC and Engineering Process
This project follows a practical Agile + DevOps SDLC.

Execution artifacts and templates for this process are maintained in:
- `.agent/sdlc-workflow/README.md`
- `.agent/sdlc-workflow/project-sdlc-as-implemented.md`
- `.agent/sdlc-workflow/project-design-used.md`
- `.agent/sdlc-workflow/database-design-used.md`
- `.agent/sdlc-workflow/database-er-diagrams.md`

### SDLC Phases
1. Discovery and Requirement Definition
2. Sprint Planning and Technical Design
3. Implementation and Peer Review
4. Test and Validation
5. Staging Verification
6. Production Release
7. Monitoring and Continuous Improvement

### Delivery Cadence
- Suggested sprint length: 2 weeks.
- Daily triage: defects, blockers, production incidents.
- Weekly release readiness review.
- Sprint review with functional demo + defect burn-down.

### Branching Strategy
- `main`: production-ready code.
- `develop`: integration branch.
- `feature/*`: scoped feature work.
- `hotfix/*`: urgent production fixes.

### Work Tracking Standards
Use GitHub templates already present in `.github/`:
- `ISSUE_TEMPLATE/user-story.md`
- `ISSUE_TEMPLATE/bug-report.md`
- `ISSUE_TEMPLATE/technical-task.md`
- `PULL_REQUEST_TEMPLATE.md`

### Required Project Controls
- Every feature starts with a user story + acceptance criteria.
- Every PR links an issue and documents tests run.
- No direct production changes without review and validation evidence.

## Environment and Prerequisites
### Required Tools
- Python 3.13 recommended for local backend script compatibility.
- Node.js 20+.
- PostgreSQL 15+.
- npm.
- Docker Desktop (optional, for containerized local run).

### Version Note
There is currently version drift:
- `backend/run_dev.sh` expects Python 3.13.
- `runtime.txt` declares `python-3.10.*` for platform runtime.

Standardize this in the next infra cleanup cycle to reduce environment risk.

## Local Development Setup
### 1. Clone Repository
```bash
git clone <your-repo-url>
cd E-LearningWebApp
```

### 2. Backend (Preferred: helper script)
```bash
cd backend
chmod +x run_dev.sh
./run_dev.sh
```
This script creates `.venv`, installs dependencies, runs migrations, and starts on `http://0.0.0.0:8000`.

### 3. Backend (Manual path)
```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
python manage.py migrate_schemas --shared
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### 4. Frontend
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 npm run dev -- --hostname 127.0.0.1 --port 3000
```
Frontend runs on `http://127.0.0.1:3000`.

### 5. Mobile
```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api npm start
```

### 6. Docker Compose (optional)
```bash
docker compose up --build
```
Services:
- Backend: `:8000`
- Frontend: `:3000`
- Postgres: internal `db:5432`

## Configuration and Secrets
### Backend environment variables
Use `backend/.env.example` as baseline.

Important variables:
- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `DATABASE_URL`
- `FRONTEND_URL`
- `CORS_ALLOW_ALL_ORIGINS`
- `EMAIL_BACKEND`
- `DEFAULT_FROM_EMAIL`
- `RESEND_API_KEY` (if using Resend API backend)
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`

### Frontend environment variables
Use `frontend/.env.example` as baseline.

Important variables:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SITE_URL` (optional)
- `NEXT_PUBLIC_GA_ID` (optional)
- `JWT_SECRET` (optional; used by middleware for local JWT verify fallback)

### Mobile environment variables
- `EXPO_PUBLIC_API_URL`

### Secret Management Policy
- Never commit live API keys or credentials.
- Use environment-specific secret stores (GitHub Secrets, Railway/Vercel envs).
- Rotate any exposed keys immediately.

## Database and Tenant Operations
### Migration commands
Common commands:
```bash
cd backend
python manage.py migrate_schemas --shared --noinput
python manage.py migrate_schemas --schema=public --noinput
python manage.py migrate_schemas --tenant --noinput
```

### Production initialization
```bash
python manage.py init_prod
```
Ensures public tenant and default domains exist.

### Useful management commands
- `python manage.py seed_data [--clear]`
- `python manage.py seed_library`
- `python manage.py migrate_tenants [--tenant_id <id>]`

## Testing Strategy and Commands
### Test Pyramid (Current)
- E2E: Playwright (primary automated coverage for critical user flows).
- API/unit: Django test framework available and used in CI.
- Lint/type checks for frontend and backend.

### Root E2E commands
```bash
npm run test:e2e
npm run test:e2e:critical
npm run test:e2e:smoke
npm run test:e2e:scale
```

### Backend checks
```bash
cd backend
python manage.py test
```

### Frontend checks
```bash
cd frontend
npm run lint
npm run type-check
npm run build
```

### Deployed environment E2E examples
Bootstrap tenant/admin credentials for deployed backend:
```bash
E2E_API_URL='https://<backend-host>' node tests/setup/bootstrap-deployed-tenant.mjs
```

Run critical suite:
```bash
E2E_BASE_URL='https://<frontend-host>' \
E2E_API_URL='https://<backend-host>' \
E2E_TENANT='demo' \
npx playwright test tests/e2e/critical/lms-critical.spec.ts --project=chromium --reporter=line
```

Run scale suite with dummy data targets:
```bash
E2E_BASE_URL='https://<frontend-host>' \
E2E_API_URL='https://<backend-host>' \
E2E_DUMMY_STUDENTS=100 \
E2E_DUMMY_TEACHERS=20 \
E2E_DUMMY_STAFF=3 \
npx playwright test tests/e2e/critical/lms-deployed-scale.spec.ts --project=chromium --reporter=line
```

## CI/CD Pipelines
### Backend workflow (`.github/workflows/backend-ci.yml`)
- Lint: black, flake8, isort.
- Test: migrations + Django tests + coverage.
- Security scan: Snyk.
- Docker build/push.
- Environment deployments (staging/production).

### Frontend workflow (`.github/workflows/frontend-ci.yml`)
- Lint, type-check, test stubs, build.
- Security scan.
- Vercel preview/staging/production deployment jobs.

### Playwright workflow (`.github/workflows/playwright.yml`)
- Installs browsers.
- Runs E2E suite.
- Uploads HTML report artifact.

## Deployment Runbook
### Backend deployment (Railway/Nixpacks)
Configured in `railway.toml` and `nixpacks.toml`.

Startup sequence runs:
1. Shared migrations.
2. Public schema migrations.
3. Tenant migrations.
4. `init_prod` command.
5. Gunicorn startup.

Detailed step-by-step guide:
- `docs/infra/02-railway-vercel-deployment.md`

### Frontend deployment
- Next.js app typically deployed to Vercel.
- Ensure `NEXT_PUBLIC_API_URL` points to backend base URL.

### Pre-deployment checklist
- All critical E2E flows pass.
- No pending migrations.
- Environment variables validated in target environment.
- Rollback plan defined for release.

### Post-deployment checklist
- Health checks and login flow for admin/teacher/student.
- Tenant routing verified by domain/hostname in production (`x-tenant-id` is dev-only).
- Core module smoke checks: courses, timetable, assessments, library.

## Operations and Incident Management
### Monitoring baseline
- Application logs (backend/frontend runtime).
- Deployment logs (Railway/Vercel/GitHub Actions).
- Playwright regression reports for release validation.

### Severity model
- `SEV-1`: platform down or auth outage.
- `SEV-2`: major module broken (exam, courses, timetable, billing).
- `SEV-3`: partial degradation or non-critical regression.
- `SEV-4`: cosmetic/non-blocking issues.

### Incident response process
1. Detect and classify severity.
2. Mitigate user impact (rollback/feature flag/workaround).
3. Fix with hotfix branch and targeted tests.
4. Publish postmortem with preventive actions.

## Security and Compliance Baseline
- JWT-based API auth with role checks.
- Tenant data separation by schema.
- CORS/CSRF controls configured.
- Use HTTPS in all non-local environments.
- Avoid broad `ALLOWED_HOSTS` and permissive CORS in production.
- Maintain dependency updates and vulnerability scans.

Recommended hardening backlog:
- Enforce secret scanning in CI.
- Add mandatory security review for auth/tenant changes.
- Add periodic penetration testing.

## Maintenance Plan (Long-Run)
### Weekly
- Review open critical bugs and failing workflows.
- Run critical E2E suite against staging.
- Verify backup and migration logs.

### Monthly
- Dependency patch cycle (backend/frontend/mobile).
- Performance and error trend review.
- Access control audit (roles, admin accounts, key rotation).

### Quarterly
- Architecture and scalability review.
- Disaster recovery drill.
- SDLC/process retrospective and template updates.

## Contribution Workflow
1. Create/triage issue with acceptance criteria.
2. Create branch (`feature/*`, `fix/*`, or `hotfix/*`).
3. Implement changes with tests.
4. Run local quality gates.
5. Open PR using `.github/PULL_REQUEST_TEMPLATE.md`.
6. Merge only after review + passing CI.

### Commit and PR quality rules
- Keep PR scope focused.
- Include evidence for every user-facing change.
- Update this README when process or setup changes.

## Troubleshooting Guide
### 1) `TypeError: x.map/filter is not a function`
Cause:
- API returned object/paginated payload instead of array.

Fix pattern:
- Normalize responses before `.map()`/`.filter()` usage.
- Reuse helper pattern used in tests (`normalizeList`).

### 2) Tenant type validation errors
Error example:
- `"Standard" is not a valid choice`

Cause:
- Backend expects lowercase choices (`standard`, `premium`, `enterprise`).

Fix:
- Send lowercase values from UI and bootstrap scripts.

### 3) Unexpected auto-logout after login
Common causes:
- JWT verification mismatch in frontend middleware (`JWT_SECRET`).
- Expired access token.
- Tenant mismatch between cookie and host/header.

Fix:
- Align secrets and token settings.
- Confirm `x-tenant-id` and tenant cookie consistency.

### 4) Chart container width/height warnings
Cause:
- Charts mounted in containers without explicit dimensions.

Fix:
- Ensure parent container has defined width/height or min-height.

### 5) Sidebar/content not scrollable
Cause:
- Missing overflow rules or height constraints.

Fix:
- Use fixed viewport containers with explicit `overflow-y: auto`.

## Latest Improvements (March 2026)
### Promotion Exception Center
- Added admin workflow to review each student promotion decision (Promote, Hold, Override).
- Added bulk decision actions with class/section/fail-reason filters.
- Added search and pagination in the exception review table.

### Decision Audit and Reason Tracking
- Promotion decisions now require `decision_reason` in single and bulk actions.
- Every decision change stores user, timestamp, action, reason, and previous/new values.
- UI now shows history so admins can see who changed what and when.

### Publish Lock and Reopen Control
- Promotion decisions are locked after final results are published.
- Added admin reopen endpoint: `POST /api/academic/assessments/{id}/reopen_results/`.
- Publish/unpublish/reopen actions are audit logged with actor, timestamp, reason, and state transition.

### Deployment and Smoke Test Baseline
- Apply migrations in all environments: `python manage.py migrate`.
- Smoke-test this flow after deploy:
  - list exceptions
  - single decide
  - bulk decide
  - publish final results
  - reopen results and re-decide

### Phase 3 Platform Hardening
- Added role-aware JWT token lifetimes and strict refresh-rotation enforcement in auth serializers.
- Added CSP and `Permissions-Policy` response headers with environment-driven policy controls.
- Tightened CORS defaults so production requires explicit allowlists (`CORS_ALLOWED_ORIGINS` / regex envs).
- Added structured log correlation fields (`trace_id`, `tenant_schema`, `tenant_id`) via logging filter + middleware context.
- Added optional Sentry initialization using `SENTRY_DSN` and environment sampling settings.
- Added OpenAPI schema endpoints:
  - `GET /api/schema/?format=openapi-json`
  - `GET /api/v1/schema/?format=openapi-json`
- Added typed-client generation pipeline from backend schema:
  - `npm run api:types`
  - defaults to live schema fetch from `http://127.0.0.1:8000/api/schema/?format=openapi-json`
  - requires backend API running and npm network access for `npx openapi-typescript`
  - outputs schema + generated TS types for `frontend/` and `mobile/`

### Phase 4 Throughput Baseline
- Added capped global pagination policy with `page_size` support and server-side max cap (`MAX_PAGE_SIZE`).
- Added Prometheus metrics endpoint and request metrics middleware:
  - `GET /metrics`
  - `GET /api/core/metrics/`
- Expanded billing write idempotency to expense creation to prevent duplicate mutation writes.
- Added high-cardinality DB indexes for users, attendance/student, and billing finance paths.
- Added Redis + worker baseline for async processing:
  - Docker compose now includes `redis` and `worker` services
  - Celery bootstrap app added at `backend/config/celery.py`
  - async dispatcher added (`core.async_jobs`) with safe `sync` fallback
  - notification email/SMS delivery now dispatches via background tasks

## Roadmap and Planning Framework
Use this structure for each release cycle:
1. Objective and business outcome.
2. Scope in/out.
3. Risks and mitigations.
4. Engineering tasks by module.
5. QA strategy and pass criteria.
6. Deployment and rollback steps.
7. Success metrics (adoption, defect rate, performance).

Suggested planning layers:
- Annual platform goals.
- Quarterly capability roadmap.
- Sprint backlog with measurable acceptance criteria.

## Definition of Done
A feature is done only when all conditions are true:
- Functional requirements implemented.
- Tenant and role behaviors validated.
- Unit/API/E2E tests updated and passing.
- No critical console/runtime errors.
- Documentation updated in this file.
- Release risk reviewed and acceptable.

---

For all future updates, edit this file directly and keep it as the single authoritative project manual.
