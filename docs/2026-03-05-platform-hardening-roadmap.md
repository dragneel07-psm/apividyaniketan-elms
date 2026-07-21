# Platform Hardening Roadmap (A-F)
## Date: March 5, 2026

## Goal
Upgrade the LMS into a safer, tenant-correct, school-ERP-ready platform without breaking current delivery velocity.

## Phase 1: Tenant Boundary and Auth Safety (Implemented in this batch)
- [x] A1: `x-tenant-id` trust is now dev-only by default (`TENANT_HEADER_TRUST_MODE=dev_only`).
- [x] A2: JWT now carries tenant identity (`tenant_schema`, `tenant_id`) and API auth enforces token tenant == request tenant == user tenant.
- [x] A3: Tenant status gate added in middleware (`active`/`trial` allowed; suspended/expired blocked).
- [x] B8: Auth endpoints now use scoped DRF throttles (login, refresh, register, password reset/confirm).
- [x] D23: Health endpoints added (`/healthz`, `/readyz`).
- [x] E24: API v1 aliases added (`/api/v1/...`) while keeping existing `/api/...` compatibility.
- [x] E25: Standardized API error shape added (`{code, message, field_errors, trace_id}`).
- [x] E27: Tenant capabilities endpoint added (`/api/core/capabilities/`).

## Phase 2: Tenant Data Architecture Correctness (Implemented)
- [x] A4-A5: Billing boundary and data-scope enforcement completed:
  - shared billing APIs are public-schema only
  - school finance APIs are tenant-schema only
  - model-level schema fences added so public-only billing models cannot be saved in tenant schema and tenant-only finance models cannot be saved in public schema
  - tenant-bound object validation is enforced for fee/payment mutations
- [x] A6: Tenant-aware upload paths implemented for tenant logos, notice attachments, and lesson material files (`tenant/<schema>/...`).
- [x] A7: Tenant-aware cache key strategy implemented for tenant-facing analytics/report caches.
- [x] B10-B11: Role + object-level authorization hardening completed for current LMS/ERP scope:
  - billing object validations + schema guards completed
  - attendance and library role/object restrictions implemented
  - assessment/question/submission/result/exam RBAC + object-scope restrictions implemented
  - report/export endpoints now enforce role/object access (student self, parent child-only, teacher scoped class/subject, admin full access)
- [x] B13: Audit logging coverage extended across sensitive education + admin workflows.
  - core audit utility added with structured details + trace/tenant metadata
  - coverage added for user role changes, billing mutations, result grading/edits, and publish/reopen result actions
  - sensitive export audit events added for academic reports, billing reports/invoices/receipts, and backup downloads
  - high-risk admin mutation audit events added for admin password resets and subscription/tenant-user management changes
  - additional platform-admin workflow audits added for global settings updates, backup creation, and tenant deletion
- [~] A4-A5 (final app split cutover): `billing` hybrid app decomposition is in transition.
  - namespaced APIs are now active: `/api/billing/saas/*` and `/api/billing/school/*`
  - legacy `/api/billing/*` routes now emit deprecation + sunset headers with successor links
  - view ownership extracted into `billing_saas.views` and `billing_school.views` (legacy re-export shims retained for compatibility)
  - runtime imports are being migrated to `billing.models_saas` / `billing.models_school`
  - blocker for full removal of `billing` overlap: existing migration graph and model app-labels are still anchored to app label `billing`; final cutover needs explicit migration strategy to avoid schema drift/data loss

## Phase 3: Security and API Productization (Implemented)
- [x] B9: Role-based token lifetimes and strict refresh rotation policies per role risk.
  - role-aware JWT access/refresh lifetimes by risk profile
  - strict refresh rotation policy enforced in refresh serializer
  - refresh reuse regression coverage added
- [x] B12: CSP baseline and stricter environment-specific CORS allowlists.
  - CSP + Permissions-Policy middleware baseline added
  - production CORS now defaults to explicit allowlist only
  - CORS/CSP regression tests added
- [x] E26: OpenAPI generation + typed client pipeline for web/mobile consistency.
  - schema endpoints added: `/api/schema/` and `/api/v1/schema/`
  - root script added: `npm run api:types` (generates schema + frontend/mobile types)
  - local offline schema generation fallback included for missing `inflection`/`uritemplate` packages
- [x] D20-D21: Structured logging with request/tenant correlation + Sentry integration.
  - structured log formatter adds `trace_id`, `tenant_schema`, `tenant_id`
  - request context logging filter + middleware wiring added
  - env-driven Sentry init added (safe no-op when SDK is unavailable)

## Phase 4: Scale and Throughput (In Progress)
- [~] C14: Redis + async workers (Celery/RQ/Dramatiq) for notifications, report/PDF generation, imports, AI tasks.
  - Redis service + worker container added to local compose stack
  - Celery app bootstrap added (`config/celery.py`) with safe fallback when Celery package is not yet present
  - async task abstraction added (`core.async_jobs`) supporting `sync` and `celery` modes
  - notifications email/SMS delivery moved to background task dispatch with sync fallback for dev/tests
  - deployment scaffolding added (`backend/Procfile` worker process)
  - **WebSocket real-time layer added** (Django Channels 4.2 + channels-redis): streaming tutor chat and live notification push; see `docs/infra/03-websocket-channels.md`
  - remaining: move heavy report/PDF/import/AI pipelines to worker queues and add retry/backoff policies
- [~] C16-C18: Query optimization policy, indexing pass, and pagination/max-page standardization.
  - query hot paths updated with `select_related` for billing lists and dashboard recent feeds
  - global pagination policy added (`core.pagination.StandardResultsSetPagination`) with max page cap (`MAX_PAGE_SIZE`)
  - index migrations added for high-cardinality paths:
    - users: `(tenant, role)`, `(tenant, is_active)`
    - academic: `(student, date)`, `(subject, date)`, `(academic_class, section)`
    - billing: `(tenant, date/payment_date/status)` and related student/status composites
  - remaining: add formal query optimization lint/check policy and wider endpoint-level pagination audits
- [x] C19: Idempotency keys for billing/payment mutations.
  - payment create endpoint supports `Idempotency-Key`/`X-Idempotency-Key` replay + payload-hash conflict protection
  - student-fee create and bulk assignment support same replay/conflict protection
  - expense create now supports same replay/conflict protection (duplicate expense writes blocked)
- [ ] C15: Read-replica strategy for reporting workloads.
- [~] D22: Prometheus/metrics baseline (latency, error rate, DB time, queue depth).
  - Prometheus endpoint added: `/metrics` and `/api/core/metrics/`
  - request counters, latency histogram, and in-progress gauge added via middleware
  - remaining: DB timing breakdown and async queue-depth metrics (after worker rollout)

## Phase 5: Mobile UX and Media Delivery (Next)
- [ ] F28: Offline write queue + sync/conflict strategy for attendance/remarks.
- [ ] F29: Centralized role navigation from server-driven permissions.
- [ ] F30: CDN strategy with signed URLs and resumable uploads.

## Rollout Controls
1. Deploy in order: middleware/auth changes -> health/check endpoints -> throttles.
2. Run smoke tests on each environment:
   - login/refresh/register/reset
   - tenant-check and capabilities
   - `/healthz` and `/readyz`
   - cross-tenant token replay attempt (must fail)
3. Enable production settings:
   - `TENANT_HEADER_TRUST_MODE=never` once domain routing is fully ready
   - explicit `CORS_ALLOWED_ORIGINS` and `CORS_ALLOWED_ORIGIN_REGEXES`
4. Monitor auth failures and 403 tenant gates for 48 hours after release.
