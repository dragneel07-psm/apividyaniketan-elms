# SaaS Admin Password Reset — Design

**Date:** 2026-06-05
**Status:** Approved, pending implementation plan
**Author:** Pramod Singh Manyal (with Claude)

## Problem

The `saas_admin` role is the highest-privilege account in the multi-tenant LMS. Today it can only be provisioned via the `create_saas_admin` management command, and there is **no documented or wired-up path to reset its password**:

- `/saas-login` has no "Forgot password" link, even though the public `POST /api/users/password-reset/` endpoint already accepts saas_admin emails (no role filter in `PasswordResetView._tenant_targets_for_email`).
- `/reset-password` always redirects to `/login` on success, which is the wrong landing page for a SaaS admin.
- No management command exists to reset a saas_admin password or regenerate a lost 2FA secret. The only options are ad-hoc `manage.py shell` snippets — fine locally, infeasible in production environments where shell access is limited or interactive Railway login is unavailable.

This bricks accounts whenever the operator loses their password, loses their TOTP authenticator, or both.

## Goals

1. Self-service email-based password reset reachable from `/saas-login`, with correct post-reset redirect.
2. CLI command `reset_saas_admin_password` that covers both forgotten-password and lost-2FA-device recovery scenarios.
3. Preserve 2FA as an independent factor during email-based reset (defence in depth: email compromise must not bypass 2FA).
4. Audit trail for every reset.

## Non-Goals

- New frontend route under `(saas-auth)/` for reset — reuse existing `/reset-password`.
- Email-based 2FA recovery — deliberately not bridged; CLI is the documented path when both factors are lost.
- SMS, push, or backup-code 2FA fallbacks.
- Changes to the regular admin/teacher/student forgot-password UX.

## Architecture

Two pathways, both lean and reusing existing infrastructure where possible.

### Path A — Self-Service Email Flow

**Frontend (`/frontend/`):**
- `app/(saas-auth)/saas-login/page.tsx`: add **"Forgot password?"** link → `/forgot-password`. The existing forgot-password page accepts any email; no role-specific copy is required there.
- `app/(auth)/reset-password/page.tsx`: after `POST /api/users/password-reset-confirm/` returns 200, read the `role` field from the response body and redirect:
  - `saas_admin` → `/saas-login`
  - everything else → `/login` (current behaviour)

**Backend (`/backend/`):**
- `users/views.py::PasswordResetConfirmView.post()` — extend response body from `{"message": "Password reset successful."}` to `{"message": "Password reset successful.", "role": user.role}`. The `user` is already accessible on the serializer post-`save()`.
- No serializer changes required.
- No URL changes.
- `users/emailing.py::build_password_reset_link()` already uses `frontend_base + /reset-password?uidb64=…&token=…`. For saas_admin (`tenant=None`), `resolve_frontend_url_for_tenant(None)` falls back to `PRIMARY_PUBLIC_DOMAIN` / `FRONTEND_URL`. **Verify during implementation** that this resolves to the SaaS-facing host in production (not a tenant subdomain).

**2FA behaviour:** untouched. After email-based password reset, the next login on `/saas-login` still demands a valid TOTP code.

**Audit:** existing `send_password_reset_email()` already logs `"Password reset email sent"`. Confirm step writes nothing today; we add an audit entry on successful reset (action `users.password_reset_completed`, distinct from `users.admin_password_reset` which is the admin-managed flow) so saas_admin resets are searchable in the audit log.

### Path B — Management Command

**New file:** `backend/users/management/commands/reset_saas_admin_password.py`

**Style:** mirrors `create_saas_admin.py` (same header comment, same arg parsing approach, same `getpass` + `validate_password` retry loop).

**Usage:**
```bash
python manage.py reset_saas_admin_password
python manage.py reset_saas_admin_password --email saas@elearning.dev
python manage.py reset_saas_admin_password --email saas@elearning.dev --reset-2fa
```

**Arguments:**
| Arg | Type | Notes |
|---|---|---|
| `--email` | str, optional | Prompted via `input("Email: ")` if absent. |
| `--reset-2fa` | flag, default false | When set, regenerates `two_factor_secret` and prints secret + QR URI exactly once. |

**Deliberately not accepted as flags:** `--password`. Password is always collected via `getpass` so it cannot leak into shell history, CI logs, or process listings.

**Behaviour:**
1. Resolve user: `UserAccount.objects.get(email__iexact=email, role="saas_admin")`. If not found → `CommandError("No saas_admin found for email '<email>'.")`.
2. Prompt for new password via `getpass`. Validate against `django.contrib.auth.password_validation.validate_password(pw, user=user)`. Loop on failure. Require confirmation entry that matches.
3. `user.set_password(pw)`.
4. If `--reset-2fa`:
   - `secret = pyotp.random_base32()`
   - `qr_uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=settings.TOTP_ISSUER_NAME)`
   - `user.two_factor_secret = secret`
   - `user.is_2fa_enabled = True`
5. Single `user.save(update_fields=[…])` covering all touched fields.
6. Write audit log entry: action `users.saas_admin_password_reset_cli`, actor=`system`, target=user, fields `{"reset_2fa": <bool>}`. Mirror `AdminPasswordResetView` audit pattern in `users/views.py:121`.
7. Print success message. If `--reset-2fa`, print TOTP secret + QR URI with the same "save these now, they will not be shown again" warning used by `create_saas_admin`.

**Failure modes:**
- Email blank → `CommandError`.
- User found but role mismatch → `CommandError` (defence against typo'd lookup; the queryset filter already enforces this but the error message should be explicit).
- Password validators fail in non-interactive mode (stdin closed) → exit non-zero with the validator messages.

## Data Flow

```
Path A (self-service):
  /saas-login --[user clicks Forgot password?]--> /forgot-password
    --[POST /api/users/password-reset/]--> backend
      --[email link]--> /reset-password?uidb64=&token=
        --[POST /api/users/password-reset-confirm/]--> backend
          --[response includes role]--> frontend redirect to /saas-login

Path B (CLI):
  shell --[manage.py reset_saas_admin_password --email …]--> command
    --[lookup, validate, set_password, optional reset 2FA, save, audit]-->
    stdout (success message + optional TOTP secret)
```

## Testing

**Backend:**
- Extend `users/tests_reset.py`:
  - One new test: confirm response body includes `role` after successful reset.
- New `users/tests_saas_reset_command.py`:
  1. Happy path: command resets password for existing saas_admin; `check_password` returns True for new password; old password no longer valid.
  2. Wrong role: command raises `CommandError` when email belongs to a non-saas_admin user.
  3. `--reset-2fa`: TOTP secret changes; `is_2fa_enabled` becomes True; new secret is a valid base32 string parseable by `pyotp.TOTP`.

**Frontend:**
- Manual smoke: trigger reset on local saas account, click email link, complete form, verify redirect to `/saas-login`.
- No new automated tests required (existing reset-password page has no test coverage; not in scope to add).

## Security Considerations

- **Password reset email is not a 2FA bypass.** Email flow leaves `is_2fa_enabled` and `two_factor_secret` untouched.
- **CLI `--reset-2fa` requires shell access** to the host running Django (production: a Railway/SSH session). This is the documented break-glass procedure when both factors are lost.
- **Password never accepted as a CLI flag** — prevents shell history / CI log leakage.
- **Throttling unchanged.** Existing `PasswordResetRateThrottle` (`auth_password_reset` scope) and `PasswordResetConfirmRateThrottle` already cover the public endpoints.
- **IP allowlist on saas login** (`_check_saas_admin_ip` in `users/serializers.py:128`) is unchanged — it gates token issuance, not password reset. Out of scope to extend to reset; treat reset link possession + valid TOTP as the trust signal.

## Open Questions Resolved During Brainstorming

| Question | Decision |
|---|---|
| Reuse `/reset-password` or new `/saas-reset-password`? | Reuse, detect role via API response. |
| Email flow clear 2FA? | No, intact. |
| CLI clear 2FA? | Yes, opt-in via `--reset-2fa` flag. |
| `--password` flag? | No — `getpass` only. |

## File Touch List

**Modified:**
- `backend/users/views.py` — extend `PasswordResetConfirmView.post()` to return `role`; add audit log entry on success.
- `backend/users/tests_reset.py` — new assertion on response shape.
- `frontend/app/(saas-auth)/saas-login/page.tsx` — add "Forgot password?" link.
- `frontend/app/(auth)/reset-password/page.tsx` — branch redirect on `role`.

**New:**
- `backend/users/management/commands/reset_saas_admin_password.py`
- `backend/users/tests_saas_reset_command.py`
- `docs/superpowers/specs/2026-06-05-saas-admin-password-reset-design.md` (this file)
