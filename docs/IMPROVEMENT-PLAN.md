# ELMS Improvement Plan — Senior Engineering & Product Review

Date: 2026-06-11
Scope reviewed: backend (Django 5.2 / DRF / django-tenants), frontend (Next.js 16 / React 19), mobile (Expo), E2E tests, CI/CD, Docker, AI engine.

---

## What is already strong (keep doing this)

- **Modern stack**: Django 5.2.9, DRF 3.16, Next.js 16.1.2, React 19.2.3, Tailwind 4, React Query 5, Radix UI, zod, framer-motion — all current.
- **Security baseline is above average**: SECRET_KEY and ALLOWED_HOSTS hard-fail in production, explicit CORS, HSTS 1 year + preload, X-Frame-Options DENY, django-csp installed, nosniff, referrer policy.
- **Auth design**: role-aware JWT lifetimes (15 min access for saas_admin), refresh rotation + blacklist, per-endpoint throttles (login 20/min, password reset 5/hour, AI chat 30/min), 2FA for SaaS admins, audit logging.
- **Testing & CI**: ~3,564 backend test functions, GitHub Actions (lint + test), 21 Playwright spec files, OpenAPI type generation for the frontend.
- **Architecture**: schema-per-tenant isolation, Celery with sync fallback, Channels WebSockets, pgvector RAG, centralized AI client with model fallback.

---

## P0 — Security (fix first)

### 1. Tokens are readable by JavaScript (XSS → full account takeover)
- `access_token` is read from `localStorage` (e.g. `frontend/app/admin/settings/backups/page.tsx:59`) and auth cookies are set via `document.cookie` (`frontend/services/auth.ts`), meaning they are **not httpOnly**.
- Any XSS anywhere in the app (rich text via TipTap/react-quill, user-generated content, markdown rendering) can exfiltrate tokens.
- **Fix**: move token issuance to a Next.js route handler that sets `httpOnly; Secure; SameSite=Lax` cookies. The proxy already reads cookies server-side, so this is compatible. Remove every `localStorage` token read/write. Keep DOMPurify, but treat it as defense-in-depth, not the primary control.

### 2. `/debug-auth` page is public in production
- `/debug-auth` is in `PUBLIC_PATHS` in `frontend/proxy.ts` and the page dumps cookies and localStorage tokens to the screen.
- **Fix**: delete the page, or return 404 unless `process.env.NODE_ENV === 'development'`. Remove it from `PUBLIC_PATHS`.

### 3. `CORS_ALLOW_ALL_ORIGINS` escape hatch + credentials
- `CORS_ALLOW_ALL_ORIGINS` can be flipped by env var while `CORS_ALLOW_CREDENTIALS = True`. That combination lets any site make authenticated requests.
- **Fix**: raise `ImproperlyConfigured` if `CORS_ALLOW_ALL_ORIGINS=true` when `DEBUG=False`.

### 4. File upload hardening (unverified)
- No upload validators were found in the codebase scan. A school LMS accepts assignments, library files, avatars — from minors.
- **Fix**: enforce max size, an allowlist of content types verified by magic bytes (not extension), randomized storage filenames, serve user uploads from a separate domain or with `Content-Disposition: attachment`, and consider ClamAV scanning in a Celery task.

### 5. Supply-chain & dependency scanning is absent
- CI runs lint + tests only.
- **Fix**: add `pip-audit` and `npm audit --audit-level=high` jobs, enable Dependabot/Renovate, add GitHub CodeQL, and add `gitleaks` for secret scanning. Also: CI uses Python 3.11 while the project targets 3.13 — align them, and use a pgvector-enabled Postgres image in CI.

### 6. Student-data privacy (compliance, PM-level risk)
- Student conversations and documents flow to OpenAI. For minors this triggers GDPR/FERPA-class obligations.
- **Fix**: document a DPA with the AI provider, strip PII before sending (name/email redaction in `ai_client.py`), add per-tenant data-retention policies, and add a parent/guardian consent flag per tenant. Add prompt-injection guardrails on the RAG tutor (instruction/data separation, output filtering).

### 7. Smaller items
- Remove `SessionAuthentication` from DRF defaults if only the Django admin uses sessions — it widens the CSRF surface.
- Hardcoded `.manyaltech.com` cookie-domain fallback in `proxy.ts`/`auth.ts` — make `NEXT_PUBLIC_COOKIE_DOMAIN` required instead.
- Extend optional TOTP 2FA beyond saas_admin to school admins and teachers (pyotp is already installed).
- Add `gitignore` entries: `backend/.expo/`, `tests/playwright-report/`; delete the stray `tests/e2e/qa/command (zeknv4)` file.

---

## P1 — Engineering quality

### 1. Frontend has zero unit tests
- `"test:ci": "echo \"No tests defined\""`. The backend has 3,500+ tests; the frontend has none.
- **Fix**: add Vitest + React Testing Library. Start with the highest-risk units: `proxy.ts` route guards, `services/api.ts`/`auth.ts`, and form validation. Target ~60% on `services/` and `lib/` first, not whole-app coverage.

### 2. E2E coverage is thin for the surface area
- 21 spec files across 5 role portals. **Fix**: one critical-path spec per role (login → dashboard → core action), plus tenant-isolation tests (user from school A must 404/403 on school B data) — this is the single most important test for a multi-tenant product.

### 3. AI engine consistency
- `grading_service.py` defaults to `gpt-3.5-turbo` (legacy) and instantiates its own OpenAI client instead of using `ai_client.py` with its fallback/retry logic. Migrate all services to the central client.
- Use structured outputs (JSON schema) for grading/quiz/exam generation instead of parsing free text.
- Add a golden-set eval harness for grading and tutor responses (even 30 cases catches regressions on model swaps).

### 4. Observability
- Sentry exists. Add: `/healthz` (DB + Redis + Celery ping) for orchestrators, structured JSON logging in production, per-tenant request metrics, and Celery queue-depth alerting. Track AI cost per tenant (Phase 5 cost controls exist — surface them on the SaaS admin dashboard).

### 5. CI/CD pipeline gaps
- Add frontend type-check + build to CI as required checks, run Playwright smoke suite on PRs, and add a staging environment with automatic deploy from `develop`.

---

## P2 — Modern UX & interactivity

1. **Optimistic updates everywhere** — React Query 5 is installed; use `onMutate` rollback patterns for grading, attendance, and submissions so the UI feels instant.
2. **Skeleton loaders + Suspense streaming** — Next.js 16 supports PPR/cache components; stream dashboards instead of spinner-blocking.
3. **Realtime presence & live updates** — Channels is already wired (Phases 6–7). Add: teacher sees students online in a lesson, live submission counters during assessments, typing indicators in conversations.
4. **Command palette (⌘K)** — `cmdk` + Radix; teachers/admins navigate large datasets constantly. Cheap, high-perceived-value.
5. **Accessibility (often contractual for schools)** — run axe-core in Playwright, fix focus management in dialogs, ensure WCAG 2.1 AA. Radix gives a strong base; verify custom components.
6. **i18n** — an admin language setting already exists; formalize with `next-intl` so tenant schools can localize.
7. **Offline-first mobile** — Expo app + React Query persistence (MMKV) so students can read lessons offline and sync submissions later.
8. **Notification center** — unify the notifications app into a bell-icon inbox with read state, backed by the existing WebSocket layer.
9. **Replace react-quill** — it is unmaintained and a known XSS vector; TipTap is already a dependency — consolidate on it.

---

## Suggested sequencing (PM view)

| Sprint | Focus |
|--------|-------|
| 1 | P0 items 1–3 (httpOnly tokens, delete debug-auth, CORS guard) + repo hygiene |
| 2 | P0 items 4–5 (upload hardening, dependency/secret scanning in CI) |
| 3 | Tenant-isolation E2E tests + frontend unit test foundation |
| 4 | AI engine consolidation (central client, structured outputs, eval set) |
| 5+ | UX wave: optimistic updates, command palette, notification center, a11y |

Rationale: security items are cheap (days, not weeks) and protect minors' data; the tenant-isolation test suite is the highest-leverage quality investment for a multi-tenant SaaS; UX work compounds on a safe foundation.
