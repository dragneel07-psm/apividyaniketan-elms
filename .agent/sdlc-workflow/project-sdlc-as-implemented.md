# SDLC Workflow Used in This Project
## E-LearningWebApp (As Implemented)

**Last verified:** March 4, 2026

This is the practical SDLC map for what is actually implemented in this repository, not a generic template.

## Phase Status Summary
| Phase | Status | Evidence in Repo |
|---|---|---|
| 01 Discovery and Problem Definition | Implemented | `.agent/product-discovery/*` |
| 02 MVP Scope and Roadmap | Implemented | `.agent/planning/*` |
| 03 System Architecture and Tech Decisions | Implemented | `backend/config/settings/base.py`, `.agent/architecture/architecture-diagrams.md`, `.agent/sdlc-workflow/project-design-used.md` |
| 04 UX/UI Design | Partially formalized, actively implemented | `frontend/app/*`, `frontend/components/*`, no in-repo Figma source |
| 05 Data Model and API Contract | Implemented (code-first) | `backend/*/models.py`, `backend/*/urls.py`, `.agent/sdlc-workflow/database-design-used.md` |
| 06 DevOps Baseline | Implemented | `.github/workflows/*`, `docker-compose.yml`, `railway.toml`, `nixpacks.toml` |
| 07 Agile Implementation | Implemented | Sprint docs, commit history, role modules in frontend/backend |
| 08 Testing | Implemented and expanding | `tests/e2e/*`, `playwright.config.ts`, CI workflows |
| 09 Security and Compliance Hardening | Partially implemented | JWT/RBAC/tenant middleware/audit model; formal compliance mapping pending |
| 10 Beta Launch (Pilot) | Partially implemented | Deployed E2E seeding and critical flow tests (`tests/setup/bootstrap-deployed-tenant.mjs`) |
| 11 Production Launch | Implemented with operational gaps | Production deploy scripts + migration startup; support/SLA docs can be improved |
| 12 Scale and Optimize | In progress | Scale E2E suite (`lms-deployed-scale.spec.ts`), perf and architecture tuning backlog |

## 1) Discovery and Problem Definition (Used)
Implemented artifacts:
- `.agent/product-discovery/01-product-vision.md`
- `.agent/product-discovery/02-user-personas.md`
- `.agent/product-discovery/03-mvp-features-backlog.md`
- `.agent/product-discovery/04-user-stories.md`
- `.agent/product-discovery/05-stakeholder-discussion-guide.md`

Current usage:
- Personas and role-based modules directly map to current UI/API design (`admin`, `teacher`, `student`, `parent`, `saas_admin`).

## 2) MVP Scope and Roadmap (Used)
Implemented artifacts:
- `.agent/planning/01-sprint-planning-backlog.md`
- `.agent/planning/04-risk-assessment.md`
- `.agent/planning/05-release-roadmap.md`

Current usage:
- Core MVP flows exist in code: auth, tenancy, academic, assessments, billing, reporting, notifications.

## 3) System Architecture and Tech Decisions (Used)
Implemented in code:
- Multi-tenancy via `django-tenants` and `TenantFromHeaderMiddleware`.
- JWT auth with role checks.
- Modular backend app design with clear API namespaces.
- Web + mobile clients consuming same backend.

Authoritative technical doc:
- `.agent/sdlc-workflow/project-design-used.md`

## 4) UX/UI Design (Used)
Implemented in product code:
- Role-specific dashboards under `frontend/app/` routes.
- Componentized UI structure in `frontend/components/`.
- Responsive web behavior with Tailwind and reusable components.

Gap to formalize:
- Add source-of-truth design files (Figma links, design token docs, accessibility audits) into repo docs.

## 5) Data Model and API Contract (Used)
Implemented in code-first form:
- Data model spread across domain apps in `backend/*/models.py`.
- API contracts defined through DRF viewsets/serializers/urls.
- Major API roots under `backend/config/urls.py`.

Authoritative data doc:
- `.agent/sdlc-workflow/database-design-used.md`

## 6) DevOps Baseline (Used)
Implemented assets:
- CI workflows: backend/frontend/playwright
- Dockerized local stack: `docker-compose.yml`
- Deployment descriptors: `railway.toml`, `nixpacks.toml`, `Procfile`
- Environment setup and migration startup logic already scripted.

## 7) Agile Sprints (Used)
Working pattern in repo history:
- Incremental feature rollout by module.
- Bug-fix and E2E-driven iteration on critical LMS flows.
- Sprint/phase notes exist in root historical docs and `.agent` planning artifacts.

## 8) Testing (Used)
Implemented testing layers:
- E2E critical and scale suites in `tests/e2e/critical/`.
- Smoke suite in `tests/e2e/smoke/`.
- Deployed-tenant bootstrap automation in `tests/setup/bootstrap-deployed-tenant.mjs`.
- CI automation for backend/frontend + Playwright.

## 9) Security and Compliance Hardening (Used)
Implemented controls:
- JWT authentication and role restrictions.
- Tenant routing via header/domain.
- Audit logging model (`core.AuditLog`).
- Basic throttling and CORS/CSRF configuration.

Remaining hardening:
- Formal compliance control matrix.
- Security test coverage expansion.
- Regular restore drill evidence logging.

## 10) Beta Launch (Pilot Schools) (Used)
Evidence:
- Deployed-environment E2E and bootstrap scripts are used to validate end-to-end behavior against live environments.
- Repeated role-flow validations and seeded data scenarios are already part of test practice.

## 11) Production Launch (Used)
Evidence:
- Production startup command runs shared/public/tenant migrations and `init_prod` before app boot.
- Deployment workflows and environment configs exist.

Operational maturity backlog:
- Formal SLA/support docs in repo.
- Structured release-note cadence and incident reports as first-class artifacts.

## 12) Scale and Optimize (Used)
Evidence:
- Scale test suite targets large seeded datasets (students/teachers/staff/classes/lessons).
- Timetable and academic modules include index/constraint-level improvements.

Next scaling steps:
- Query profiling and DB index audit.
- Cache strategy for high-read modules.
- Enterprise readiness features (SSO, advanced audit export, dedicated tenant options).

## Required Companion Documents
- Project architecture and stack: `.agent/sdlc-workflow/project-design-used.md`
- Real DB design and ERD: `.agent/sdlc-workflow/database-design-used.md`

