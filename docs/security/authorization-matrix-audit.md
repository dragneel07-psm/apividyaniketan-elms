# Authorization-Matrix Audit

Date: 2026-06-13
Scope: backend API authorization — permission classes, role guards, and privilege-escalation gaps that tenant-isolation tests do not cover.
Method: enumerated every custom permission class and its role logic, every `AllowAny`/empty-perm endpoint, and viewsets relying on the default guard. Read-only; no code changed.

## Baseline (good)

- DRF default is `IsAuthenticated` (`config/settings`), so a viewset with **no** `permission_classes` still requires login — fail-safe, not fail-open.
- The custom role classes in `users/permissions.py` are consistent and correct: each checks `is_authenticated` AND `request.user.role == <role>` (or an allowed set). `IsAdmin`, `IsTeacher`, `IsStudent`, `IsParent`, `IsTeacherOrAdmin`, `IsAdminOrSaaSAdmin`, `IsSaaSAdminOrStaff`, `IsSISStaff` all verified sound.
- Finance/HR guards (`billing/permissions.IsSchoolFinanceManager`, `hr_payroll/permissions.IsHRManager`) correctly gate their domains.
- Tenant isolation (separately tested) means even an under-guarded endpoint cannot leak *cross-tenant* data — the gaps below are **intra-tenant role escalation**, not cross-tenant.

## Legitimately public — verified, no action

Login, register, password-reset (+confirm), email verification, 2FA setup/activate, `/healthz`, `/readyz`, public SaaS plans. All are auth-flow or health endpoints that must be open.

**Payment gateway callbacks** (`EsewaCallbackView`, `KhaltiCallbackView`, `ConnectIPSCallbackView`) are `AllowAny` **and safe**: each re-verifies the transaction server-side against the provider API (`EsewaGateway.verify_payment`, `KhaltiGateway.verify`, `ConnectIPSGateway.verify`) rather than trusting the callback payload. Correct pattern — a forged callback can't mark a fee paid.

## Findings

### MEDIUM — Prometheus metrics exposed unauthenticated
`core/views.py:138` `MetricsView` has `permission_classes = [AllowAny]` **and** `authentication_classes = []`. The `/api/metrics` endpoint is world-readable. Prometheus metrics typically leak internal signal: tenant/schema names, request volumes and paths, error cardinality, queue depths. **Fix:** gate behind an IP allowlist (scrape source), a bearer token (`METRICS_TOKEN` env), or network policy. Do not leave it open on a public origin.

### WITHDRAWN (was: LOW–MEDIUM — Student portal has no role guard)
Original concern: `academic/views/student_portal.py` defined no `permission_classes`. On inspection (2026-06-13) this file is **dead code** — only commented-out placeholders, imported nowhere. There is no live student-portal viewset to guard. The actual student data is served by shared viewsets (`LessonViewSet`, `AssessmentViewSet`, `SubmissionViewSet`, `ResultViewSet`) guarded by `IsAuthenticated` + tenant scoping + per-user queryset filtering; these intentionally serve students AND teachers/admins, so an `IsStudent`-only guard would be incorrect. **Action:** delete the dead placeholder file. The real follow-up is the runtime role×endpoint matrix test noted below, which would catch any per-action write-access gaps on the shared viewsets.

### LOW — Tenant enumeration via TenantCheckView
`core/views.py:46` `TenantCheckView` (`AllowAny`) lets an anonymous caller probe which school codes/subdomains exist. Needed for login UX, but it's a recon vector. **Fix:** confirm it's covered by the `anon` throttle (300/hour) and returns a uniform response shape; consider a dedicated tighter throttle.

## Not findings (checked)

- `billing_saas/views.py` conditional `AllowAny` is the public-pricing path only; authenticated/admin actions keep their guards via `get_permissions`.
- `register_user` `@permission_classes([AllowAny])` is the public registration flow with its own rate throttle.

## Recommendation order
1. Token/IP-gate `/api/metrics` (MEDIUM, ~15 min).
2. Add `IsStudent` to the student portal viewset(s) (LOW–MEDIUM, small).
3. Confirm throttle coverage on `TenantCheckView` (LOW).

Note: this audit covered guard *presence and correctness*. It did not exercise every role against every endpoint at runtime — a follow-up integration test (one request per role × protected endpoint asserting 403s) would convert this static audit into a regression-proof matrix.
