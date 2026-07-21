# Tenant Resolution Hardening

## Objective
Lock tenant resolution and token validation so cross-tenant spoofing/replay is blocked by default.

## Implemented Changes

### 1) `x-tenant-id` only in debug/local dev
File: `backend/core/middleware/__init__.py`

- Header trust now requires all of:
  - `DEBUG=True`
  - local host only (`localhost`, `127.0.0.1`, `::1`, or host ending with `.local`)
  - `TENANT_HEADER_TRUST_MODE != "never"`
- In non-debug/production settings, `x-tenant-id` is never trusted for tenant resolution.

### 2) Production resolves tenant by domain only
File: `backend/core/middleware/__init__.py`

- If tenant cannot be resolved from hostname/domain in production (`DEBUG=False`):
  - request is rejected with `400`
  - payload code: `tenant_domain_required`
- No implicit fallback to `public` in production when domain is missing/unknown.

### 3) Spoofed `x-tenant-id` ignored in production
File: `backend/core/middleware/__init__.py`

- In production, header value is ignored and tenant is resolved only from domain.
- If domain resolves, request proceeds with the domain tenant even if header is spoofed.
- If domain does not resolve, request fails with:
  - `400`
  - payload code: `tenant_domain_required`

### 4) Strict JWT tenant claim enforcement
File: `backend/users/authentication.py`

- `tenant_schema` claim is now mandatory.
- If missing/empty:
  - `401`
  - code: `token_tenant_missing` (or `token_tenant_invalid` for malformed empty value)
- Claim must match:
  - authenticated user's tenant schema
  - request-resolved tenant schema

## Regression Tests Added/Updated

### Tenant resolution security
File: `backend/core/tests_tenant_security.py`

- production spoofed header is ignored (domain tenant still resolves)
- production missing/unknown domain rejected (`tenant_domain_required`, 400)
- debug header resolution works on `localhost` and `.local` hosts
- debug header is ignored on non-local hosts (e.g. `unknown.localhost`)

### JWT tenant isolation
File: `backend/users/tests_tenant_auth.py`

- tenant A token used against tenant B domain is rejected (`401`, tenant mismatch code)
- token missing `tenant_schema` claim is rejected (`401`, `token_tenant_missing`)
- existing mismatch and tenant status tests retained

## Notes

- Development convenience remains available in debug/local environments.
- Production is now domain-first and fail-closed for tenant resolution.
