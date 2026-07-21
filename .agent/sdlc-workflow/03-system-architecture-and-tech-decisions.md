# Phase 03: System Architecture and Tech Decisions

## Objective
Create a stable technical foundation and decision log before full implementation.

## E-LearningWebApp Current Implementation
- Status: `Implemented`
- Source of truth:
  - `.agent/sdlc-workflow/project-design-used.md`
  - `.agent/architecture/architecture-diagrams.md`
  - `backend/config/settings/base.py`
- Architecture currently used:
  - Backend: Django + DRF + `django-tenants`
  - DB: PostgreSQL schema-per-tenant
  - Frontend: Next.js App Router
  - Mobile: Expo/React Native
  - Auth: JWT + tenant context via `x-tenant-id`
- Key middleware:
  - `core.middleware.TenantFromHeaderMiddleware`

## Core Activities
- Confirm stack and runtime boundaries:
  - Django/DRF
  - PostgreSQL
  - Redis (as needed)
  - Next.js
- Confirm tenancy model strategy for school context.
- Define security architecture:
  - RBAC
  - Audit logs
  - Encryption in transit/at rest
- Define observability baseline:
  - Logs
  - Metrics
  - Traces
- Capture decisions in Architecture Decision Records (ADRs).

## Inputs
- MVP scope and risk register.
- Existing architecture docs in `.agent/architecture/`.

## Deliverables
- Updated architecture diagram.
- ADR log for major decisions and tradeoffs.
- NFR targets:
  - Availability
  - Performance
  - Security
  - Scalability

## Exit Criteria
- Architecture reviewed by engineering leads.
- Critical tradeoffs documented with fallback strategy.
- Observability and security requirements accepted.

## File Outputs
- `templates/adr-template.md`
- `templates/observability-plan-template.md`
