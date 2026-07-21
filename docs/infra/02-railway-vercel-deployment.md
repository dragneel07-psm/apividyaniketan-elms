# Railway + Vercel Deployment Procedure (Single-Domain, Multi-Tenant)

This runbook deploys your LMS in a single-domain model:

1. `manyaltech.com` and `www.manyaltech.com` serve SaaS/public pages.
2. `school1.manyaltech.com`, `school2.manyaltech.com`, and other tenant subdomains serve tenant UIs.
3. All frontend traffic goes to Vercel.
4. All API traffic goes to `https://<same-host>/api/*`, then Vercel proxy forwards to Railway backend.
5. Django tenant resolution is done by hostname/domain in production.

## 1. Final Architecture (must match production)

1. Browser requests `https://school1.manyaltech.com`.
2. Vercel serves Next.js frontend.
3. Frontend calls `/api/...` (same origin).
4. Next.js proxy route [`frontend/app/api/[...path]/route.ts`](/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/frontend/app/api/[...path]/route.ts) forwards request to Railway backend origin.
5. Proxy passes `X-Forwarded-Host` with original host.
6. Django (`USE_X_FORWARDED_HOST=true`) resolves tenant from original host.

## 2. Pre-Deployment Prerequisites

1. `main` branch is green.
2. You have access to:
   - Vercel project settings.
   - Railway project settings.
   - DNS provider (Cloudflare/registrar DNS).
3. Backend health endpoints are available:
   - `/healthz`
   - `/readyz`
4. Tenant security policy is ready:
   - `TENANT_HEADER_TRUST_MODE=never`
   - domain-based tenant routing only.

## 3. DNS and Domain Setup

## 3.1 Add Domains to Vercel

Add these domains in Vercel:

1. `manyaltech.com`
2. `www.manyaltech.com`
3. `*.manyaltech.com`

## 3.2 DNS Records

Set DNS based on what Vercel dashboard shows for your project:

1. Apex `manyaltech.com` -> Vercel target (A/ALIAS as instructed by Vercel).
2. `www` -> `cname.vercel-dns.com`.
3. `*` -> `cname.vercel-dns.com`.

Do not point tenant subdomains directly to Railway in this model.

## 4. Railway Backend Deployment

## 4.1 Services

Create these Railway services in one project:

1. `backend-web` (Django/Gunicorn)
2. `backend-worker` (Celery worker)
3. PostgreSQL plugin
4. Redis plugin

## 4.2 Build and Start Commands

Use existing repo scripts:

1. `railway.toml` default start command is `bash scripts/railway-start-web.sh`.
2. For `backend-web`, keep default (or set same value explicitly).
3. For `backend-worker`, set Railway service **Custom Start Command** to:
   - `bash scripts/railway-start-worker.sh`

Why this is needed:

1. `railway.toml` applies one default start command for the repo.
2. Worker service needs a different command than web, so it must override in Railway UI.

## 4.3 Required Environment Variables (web + worker)

Set these values on `backend-web` and `backend-worker`:

```bash
SECRET_KEY=<strong-secret>
DEBUG=False
TIME_ZONE=Asia/Kathmandu

ALLOWED_HOSTS=.manyaltech.com,e-learningwebapp-production-1112.up.railway.app,localhost,127.0.0.1
FRONTEND_URL=https://manyaltech.com

DATABASE_URL=<from Railway Postgres>
REDIS_URL=<from Railway Redis>
ASYNC_TASK_BACKEND=celery
CELERY_BROKER_URL=<same as REDIS_URL>
CELERY_RESULT_BACKEND=<same as REDIS_URL>
MIGRATION_VERBOSITY=0

TENANT_HEADER_TRUST_MODE=never
PRIMARY_PUBLIC_DOMAIN=manyaltech.com
PUBLIC_DOMAINS=manyaltech.com,www.manyaltech.com,school1.manyaltech.com,school2.manyaltech.com

SECURE_SSL_REDIRECT=true
SECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,https
USE_X_FORWARDED_HOST=true
SECURE_HSTS_SECONDS=2592000
SECURE_HSTS_INCLUDE_SUBDOMAINS=true

CORS_ALLOWED_ORIGINS=https://manyaltech.com,https://www.manyaltech.com
CORS_ALLOWED_ORIGIN_REGEXES=^https:\/\/([a-z0-9-]+)\.manyaltech\.com$
CSRF_TRUSTED_ORIGINS=https://manyaltech.com,https://www.manyaltech.com,https://school1.manyaltech.com,https://school2.manyaltech.com
```

Notes:

1. Do not include trailing `/` in CORS/CSRF origins.
2. Keep `ALLOWED_HOSTS` explicit in production.
3. `USE_X_FORWARDED_HOST=true` is mandatory for proxy-based tenant routing.
4. `MIGRATION_VERBOSITY=0` keeps boot logs compact; set `1` or `2` temporarily when debugging migrations.

## 5. Vercel Frontend Deployment

## 5.1 Project Configuration

1. Import repo to Vercel.
2. Set root directory to `frontend`.
3. Framework preset: Next.js.

## 5.2 Required Frontend Environment Variables

Set these in Vercel:

```bash
NEXT_PUBLIC_API_URL=/api
BACKEND_API_ORIGIN=https://e-learningwebapp-production-1112.up.railway.app
NEXT_PUBLIC_SITE_URL=https://manyaltech.com
```

Notes:

1. `NEXT_PUBLIC_API_URL` must be exactly `/api` in single-domain mode.
2. `BACKEND_API_ORIGIN` must be Railway backend origin, not `manyaltech.com`.
3. If using analytics, add `NEXT_PUBLIC_GA_ID`.

## 6. Django Tenant Domain Mapping (critical)

Run once after deploy (or whenever you add tenants):

```bash
cd backend
.venv/bin/python manage.py shell -c "
from core.models.tenant import Tenant, Domain

public = Tenant.objects.get(schema_name='public')
school1 = Tenant.objects.get(schema_name='school1')
school2 = Tenant.objects.get(schema_name='school2')

Domain.objects.update_or_create(domain='manyaltech.com', defaults={'tenant': public, 'is_primary': True})
Domain.objects.update_or_create(domain='www.manyaltech.com', defaults={'tenant': public, 'is_primary': False})
Domain.objects.update_or_create(domain='school1.manyaltech.com', defaults={'tenant': school1, 'is_primary': True})
Domain.objects.update_or_create(domain='school2.manyaltech.com', defaults={'tenant': school2, 'is_primary': True})

print('Domain mappings ready')
"
```

Important automation behavior:

1. New tenants created from SaaS Admin will auto-create `<subdomain>.<BASE_DOMAIN>`.
2. Deployment bootstrap (`manage.py init_prod`) now auto-backfills missing default domains for old tenants when `BASE_DOMAIN` is set.
3. You still do manual mapping only for:
   - root/public domains (`manyaltech.com`, `www.manyaltech.com`) one-time.
   - custom domains that are not `<subdomain>.manyaltech.com`.

For new tenant `abc`, add:

1. tenant schema: `abc`
2. domain row: `abc.manyaltech.com` -> tenant `abc`

## 7. Deployment Order (safe sequence)

1. Deploy Railway backend (`backend-web`, `backend-worker`).
2. Verify backend startup logs show migrations complete.
3. Configure tenant domains in Django table.
4. Deploy Vercel frontend with `/api` proxy env values.
5. Wait for DNS propagation if domains are newly added.

## 8. End-to-End Validation Checklist

Run these checks in order:

1. Public health:
   - `curl -i https://manyaltech.com/api/healthz`
   - Expect `200`.
2. Tenant routing:
   - `curl -i https://school1.manyaltech.com/api/core/tenant-check/`
   - Expect tenant schema `school1`.
3. Public plans page:
   - open `https://manyaltech.com`
   - verify plan list loads.
4. Tenant login:
   - open `https://school1.manyaltech.com/login/student`
   - verify login succeeds.
5. Celery path:
   - trigger async task
   - poll `/api/core/jobs/{job_id}/`
   - verify worker consumes jobs.

## 9. Troubleshooting (symptom -> cause -> fix)

1. `ERR_TOO_MANY_REDIRECTS` on `/api/users/login/`
   - Cause: SSL proxy header not configured.
   - Fix: `SECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,https`.

2. `Bad Request: /api/...` in backend logs
   - Cause: missing domain row or forwarded host not used.
   - Fix: add `Domain` row and set `USE_X_FORWARDED_HOST=true`.

3. `corsheaders.E014 Origin ... should not have path`
   - Cause: CORS origin has trailing slash/path.
   - Fix: use `https://host` format only.

4. Public plans 404 on landing page
   - Cause: request resolved to wrong tenant.
   - Fix: map `manyaltech.com` to `public` tenant.

5. PWA still calling old API host
   - Cause: stale service worker cache.
   - Fix: unregister service worker and hard reload.

## 10. Rollback Procedure

1. Vercel:
   - Promote previous successful deployment.
2. Railway:
   - Redeploy previous successful deployment.
3. If migration issue:
   - stop rollout
   - restore DB backup
   - redeploy known-good commit.

## 11. Operations Best Practices

1. Keep `x-tenant-id` ignored in production.
2. Add new tenant domain row before user onboarding.
3. Monitor:
   - web 5xx rates
   - worker queue depth
   - DB CPU and connections.
4. Test restore from backup monthly.
5. Run smoke tests after every production deploy.
