# AllowAny Endpoint Triage

> Security audit §7.1 (see `QA_SECURITY_AUDIT_PLAN.md`). Reviewed 2026-06-14. Scope: every non-test `AllowAny` in backend application code. Excludes `.venv_py311_backup/` (vendored deps) and comments.

## Verdict summary

16 endpoints carry `AllowAny`. **All are public by design and justified** — there is no unauthenticated endpoint that should require auth. **No S1/S2 findings.** The plan's S1 concern ("payment callbacks may lack signature verification") is **resolved**: all three gateway callbacks verify server-side before recording payment.

5 hardening findings raised — **all now fixed** (F1 public schema, F2 ConnectIPS amount, F3 tenant-check throttle, F4 reset enumeration, F5 email-verify throttle). No open `AllowAny` findings remain.

## Justified — public by design (no action)

| # | Endpoint | File:line | Why public | Guardrail |
|---|---|---|---|---|
| 1 | `TenantCheckView` | `core/views.py:46` | Pre-login school-code/subdomain lookup | ⚠ `throttle_classes=[]` — see F3 |
| 2 | `HealthzView` | `core/views.py:91` | Liveness probe | none needed |
| 3 | `ReadyzView` | `core/views.py:104` | Readiness probe (DB + public tenant) | none needed |
| 4 | `MetricsView` | `core/views.py:140` | Prometheus scrape | `METRICS_TOKEN` bearer checked manually; `authentication_classes=[]` (fixed in b0effd6) |
| 5 | `register_user` | `users/views.py:239` | Self-registration | `RegisterRateThrottle` |
| 6 | `PasswordResetView` | `users/views.py:424` | Forgot-password | `PasswordResetRateThrottle`; ⚠ enumeration — see F4 |
| 7 | `PasswordResetConfirmView` | `users/views.py:494` | Reset via emailed token | `PasswordResetConfirmRateThrottle` |
| 8 | `EmailVerificationView` | `users/views.py:522` | Verify email token | ⚠ no throttle — see F5 |
| 9 | `TwoFactorSetupView` | `users/views.py:568` | saas_admin 2FA setup | re-auth (email+password) + `LoginRateThrottle` |
| 10 | `TwoFactorActivateView` | `users/views.py:613` | saas_admin 2FA activation | re-auth + `LoginRateThrottle` |
| 11 | `SubscriptionPlanViewSet.public` (perm) | `billing_saas/views.py:48` | Public pricing list | returns `is_active` plans only |
| 12 | `SubscriptionPlanViewSet.public` (action) | `billing_saas/views.py:111` | Same action's `permission_classes` | same |
| 13 | `EsewaCallbackView` | `billing_school/views_payment_gateway.py:128` | Gateway server callback | `EsewaGateway.verify_payment(oid, amt, ref_id)` before recording |
| 14 | `KhaltiCallbackView` | `billing_school/views_payment_gateway.py:208` | Gateway server callback | `KhaltiGateway.verify(pidx)`; rejects non-`Completed` |
| 15 | `ConnectIPSCallbackView` | `billing_school/views_nas.py:1361` | Gateway server callback | `ConnectIPSGateway.verify(txn_id, ref_id)`; ⚠ amount — see F2 |
| 16 | `schema_view` (OpenAPI) | `config/urls.py:16` | API schema | ⚠ fully public — see F1 |

## Findings (hardening)

### F1 — OpenAPI schema publicly exposed (S3, OWASP API9: Improper Inventory) — FIXED
`config/urls.py` served the full API schema at `/api/schema/` with `AllowAny`, enumerating every endpoint/param/serializer to anonymous users.
**Fix applied:** schema permission is now `AllowAny` only under `DEBUG` (so local `npm run api:types` still works) and `IsAdminUser` otherwise. `core/tests_openapi.py` updated to authenticate as staff and to assert anonymous access is denied (401/403).

### F2 — ConnectIPS callback trusted client-supplied amount (S3) — FIXED
`billing_school/views_nas.py` recorded the payment amount from the `txnAmt` **query param** rather than an authoritative source. A caller could verify a real low-value txn and report a higher amount, marking a fee "paid" without real payment.
**Fix applied:** the claimed amount is now parsed as `Decimal` and validated against the fee's outstanding balance (`amount_due − amount_paid`). Since initiation always charges the full balance, a claimed amount `<= 0` or `> outstanding` is rejected with HTTP 400; equal/partial amounts remain allowed. (`ConnectIPSGateway.verify()` returns the raw gateway JSON whose amount key isn't documented here, so the fee balance — already authoritative in our DB — is used as the trust anchor.)

### F3 — School-code enumeration via unthrottled TenantCheckView (S4) — FIXED
`core/views.py` explicitly set `throttle_classes=[]`, so subdomains/school codes could be brute-forced to map every tenant.
**Fix applied:** added `TenantCheckRateThrottle` (scope `tenant_check`, default `60/min`, env `THROTTLE_TENANT_CHECK`). Generous enough for shared-NAT login bursts but caps enumeration sweeps; ops can tune via env.

### F4 — User enumeration on password reset (S4) — FIXED
`PasswordResetView` returned `{"email": ["User with this email does not exist."]}` (HTTP 400) when no account matched, distinguishing registered vs unregistered emails — and it probes across all tenant schemas, leaking existence platform-wide.
**Fix applied:** the view now always returns HTTP 200 with a generic message ("If an account exists for that email, a password reset link has been sent.") whether or not a match was found; emails are still sent only to real accounts. `users/tests_reset.py` updated to assert known/unknown emails get identical responses.

### F5 — Unthrottled email verification (S4) — FIXED
`EmailVerificationView` had no throttle, allowing brute-force of verification tokens.
**Fix applied:** added `EmailVerificationRateThrottle` (scope `auth_email_verify`, default `10/hour`, env `THROTTLE_AUTH_EMAIL_VERIFY`), consistent with the other public auth endpoints.

## CI guard — IMPLEMENTED
`backend/core/tests_allowany_gate.py` (`AllowAnyGateTests`, a DB-free `SimpleTestCase`) scans backend app code for `AllowAny` permission usages and asserts the per-file count matches an approved manifest (the 16 endpoints above). A new `AllowAny` fails the gate until it is triaged here and added to `APPROVED_ALLOWANY`. Runs automatically in `backend-ci.yml` via `python manage.py test`.
