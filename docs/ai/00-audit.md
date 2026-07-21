# AI + Multitenancy Audit
Date: 2026-03-05
Scope: `backend` (Django + DRF + django-tenants), `frontend` (Next.js), `mobile` (Expo), `docker-compose.yml`

## 1) Repo Scan Results

### Django tenant models + tenant middleware
- Tenant models:
  - `backend/core/models/tenant.py`
  - `Tenant(TenantMixin)` and `Domain(DomainMixin)` are the primary tenant/domain models.
  - `Tenant` includes `status`, `features`, `subdomain`, `logo`, and academic-year metadata.
- Tenant configuration:
  - `backend/config/settings/base.py`
  - `TENANT_MODEL = "core.Tenant"`, `TENANT_DOMAIN_MODEL = "core.Domain"`.
  - `ai_engine` is in `TENANT_APPS`.
  - Middleware chain includes `core.middleware.TenantFromHeaderMiddleware`.
  - `TENANT_HEADER_TRUST_MODE` exists with `dev_only` default.
- Tenant middleware implementation:
  - Active implementation path: `backend/core/middleware/__init__.py`
  - Tenant resolution order: domain first, optional `x-tenant-id` fallback (policy-controlled), then `public`.
  - Includes tenant status gate (`active`/`trial`) and request context (`trace_id`, tenant context).
- Token-level tenant enforcement:
  - `backend/users/authentication.py` (`TenantAwareJWTAuthentication`)
  - Enforces token tenant claim == user tenant == request tenant, plus tenant active check.

### AI module entrypoints (`/api/ai/`)
- URL mount points:
  - `backend/config/urls.py`
  - `path('api/ai/', include('ai_engine.urls'))`
  - `path('api/v1/ai/', include('ai_engine.urls'))`
- AI URL definitions:
  - `backend/ai_engine/urls.py`
  - Router endpoints:
    - `/api/ai/logs/`
    - `/api/ai/reports/`
    - `/api/ai/learning-paths/`
    - `/api/ai/learning-nodes/` (+ `complete` and `due` actions — Phase 1)
    - `/api/ai/study-schedule/`
    - `/api/ai/conversations/` (+ `messages` action — Phase 2)
    - `/api/ai/skill-tags/` (Phase 3)
    - `/api/ai/skill-mastery/` (+ `gaps`, `update_mastery` — Phase 3)
    - `/api/ai/token-budgets/` (+ `my_usage` — Phase 5)
  - Function endpoints:
    - `/api/ai/tutor/chat/` (REST — enhanced with budget, confidence, conversation_id)
    - `/api/ai/analytics/teacher/`
    - `/api/ai/personalization/recommendations/`
    - `/api/ai/reports/student/<uuid:student_id>/`
    - `/api/ai/reports/student/<uuid:student_id>/history/`
  - WebSocket endpoints (Phase 6):
    - `ws/tutor/chat/?token=<jwt>` → `TutorStreamConsumer` (streaming)
    - `ws/notifications/?token=<jwt>` → `NotificationConsumer` (live push)
- Main implementation:
  - `backend/ai_engine/views.py`

### Frontend/mobile API clients where JWT + `x-tenant-id` are set
- Next.js fetch client:
  - `frontend/lib/api.ts`
  - `apiRequest()` and `apiRequestBlob()` set:
    - `Authorization: Bearer <access_token>`
    - `x-tenant-id` from `localStorage.tenant_id` (fallback currently defaults to `"demo"`).
- Next.js axios client:
  - `frontend/services/api.ts`
  - Request interceptor sets:
    - `Authorization`
    - `x-tenant-id` from local cache or subdomain detection.
- Next.js edge proxy:
  - `frontend/proxy.ts`
  - Forwards `x-tenant-id` from subdomain and uses bearer token for backend validation.
- Expo mobile client:
  - `mobile/lib/api.ts`
  - `apiRequest()` sets:
    - `Authorization` from secure storage token
    - `x-tenant-id` from secure storage tenant id (fallback currently defaults to `"demo"`).

### `docker-compose.yml` services
- Defined services:
  - `backend` (Django API)
  - `worker` (Celery worker)
  - `frontend` (Next.js app)
  - `db` (Postgres 15)
  - `redis` (Redis 7)
- Volumes:
  - `postgres_data`
  - `redis_data`

## 2) Brief Plan: Production-grade AI Without Breaking Multitenancy

- Minimal-risk guardrails first:
  - Keep domain/token as the primary tenant source in production.
  - Remove implicit `"demo"` tenant fallback from clients for production mode.
  - Enforce tenant scoping on all AI endpoints (including non-ViewSet function views).
- Tenant-safe AI policy layer:
  - Add a reusable AI access gate (feature flag + tenant status + per-tenant quota check).
  - Apply gate to every `/api/ai/` endpoint before provider calls.
- Reliability and scale:
  - Route heavy AI tasks (report generation, long tutor flows) to async jobs with tenant context.
  - Add strict timeouts/retries and structured logging (`trace_id`, `tenant_schema`, tokens, latency).
- Verification and rollout:
  - Add endpoint-level tenant-isolation tests (positive + cross-tenant negative tests).
  - Roll out behind feature flags per tenant, then widen gradually.

## 3) Repo Hygiene Issues and Proposed Fixes

- Duplicate middleware module definitions:
  - `backend/core/middleware.py` and `backend/core/middleware/__init__.py` both define tenant middleware classes.
  - Risk: drift/confusion over which implementation is canonical.
  - Fix: keep one canonical module and deprecate the duplicate after import audit.

- Build artifacts not explicitly ignored:
  - Local build directories observed in workspace: `.expo/`, `mobile/dist-web/`.
  - Risk: accidental commit of generated assets.
  - Fix: add explicit `.gitignore` entries for both paths.

- Backup DB artifacts tracked in git:
  - Tracked files:
    - `backend/config/db.sqlite3.backup`
    - `backend/config/db.sqlite3.bak`
  - Risk: repository noise and accidental data leakage patterns.
  - Fix: untrack via `git rm --cached`, keep backups outside repo, enforce ignore patterns.

- API client duplication:
  - Both `frontend/lib/api.ts` and `frontend/services/api.ts` inject auth + tenant headers.
  - Risk: inconsistent auth/tenant behavior between call paths.
  - Fix: converge on one shared transport layer or shared header utility.

- Hardcoded development API default in mobile:
  - `mobile/lib/api.ts` has local-IP default API base URL.
  - Risk: release misconfiguration and environment drift.
  - Fix: require env-based API URL for non-dev builds and validate at startup.

- Node modules check:
  - No tracked `node_modules/` directories found.

## 4) Next Steps Checklist

- [ ] Set production tenant header policy (`TENANT_HEADER_TRUST_MODE=never` unless explicitly needed).
- [ ] Remove `"demo"` tenant fallback in web/mobile clients for production builds.
- [ ] Apply tenant-scoped filtering consistently across every AI endpoint in `ai_engine/views.py`.
- [ ] Add AI access gate (tenant status + feature flag + quota) and reuse on all `/api/ai/` routes.
- [ ] Add AI endpoint tests for cross-tenant replay/forgery attempts.
- [ ] Add explicit `.gitignore` entries for `.expo/` and `mobile/dist-web/`.
- [ ] Untrack DB backup artifacts (`*.bak`, `*.backup`) currently in repo.
- [ ] Consolidate frontend API client header injection into a single shared path.
