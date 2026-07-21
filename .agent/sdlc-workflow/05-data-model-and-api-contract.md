# Phase 05: Data Model and API Contract

## Objective
Lock the data and interface contracts so implementation teams can work in parallel safely.

## E-LearningWebApp Current Implementation
- Status: `Implemented (code-first, contract docs now added)`
- Source of truth:
  - `.agent/sdlc-workflow/database-design-used.md`
  - `backend/*/models.py`
  - `backend/*/urls.py`
  - `backend/config/urls.py`
- Core design currently used:
  - Schema-per-tenant data model with `django-tenants`
  - Domain modules: academic, billing, library, ai_engine, notifications, conversations, gamification
  - API namespaces:
    - `/api/core/`
    - `/api/users/`
    - `/api/academic/`
    - `/api/billing/`
    - `/api/ai/`
    - `/api/notifications/`
    - `/api/library/`
    - `/api/gamification/`
    - `/api/conversations/`

## Real Data Design Notes for This Project
- Identity model:
  - `users.UserAccount` with UUID primary key and role enum.
- Tenant model:
  - `core.Tenant` + `core.Domain`.
- Academic model:
  - classes/sections/subjects/teachers/students/parents/lessons/assessments/exams/timetable.
- Finance model:
  - subscription plans + school-level fee/payment/expense entities.
- Library model:
  - book + issue lifecycle with copy availability updates.

## Core Activities
- Define domain model and schema boundaries.
- Define migration strategy for tenant-safe evolution.
- Define API contracts (OpenAPI/Swagger).
- Define event model:
  - Notifications
  - Webhooks
  - Audit logs
- Define media/file strategy:
  - Object storage (S3/R2)
  - CDN
  - Signed URL policy

## Inputs
- Architecture decisions and UX flows.

## Deliverables
- ERD and schema change plan.
- Versioned API spec and contract tests.
- Storage strategy and file lifecycle policy.

## Exit Criteria
- Data model reviewed by backend + analytics stakeholders.
- API contracts consumed by frontend/mobile without ambiguity.
- Migration rollback strategy documented.

## File Outputs
- `templates/data-model-template.md`
- `templates/api-contract-template.md`
- `templates/storage-strategy-template.md`
