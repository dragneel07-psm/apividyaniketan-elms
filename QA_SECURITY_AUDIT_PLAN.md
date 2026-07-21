# QA & Security Audit Plan — Multi-Tenant School LMS

> Scope: Backend (Django/DRF/django-tenants), Frontend (Next.js), Mobile (Expo), AI Engine, async (Celery/Channels). Owner: QA. Status: draft. Last updated: 2026-06-14.

This plan covers **functional QA** and a **security audit** as two interlocking tracks. The defining risk of this system is **multi-tenancy**: one PostgreSQL schema per school. Every test layer must treat cross-tenant data leakage as a first-class, blocking concern.

---

## 1. Objectives & Exit Criteria

| Objective | Exit criterion (sign-off gate) |
|---|---|
| Functional correctness per role | All P0/P1 flows green in CI for `admin, staff, teacher, student, parent, saas_admin` |
| Tenant isolation | Zero cross-tenant reads/writes provable by automated suite; manual pen test finds none |
| AuthN/AuthZ integrity | No endpoint reachable by a role outside its matrix; no unintended `AllowAny` |
| AI safety & cost | PII never leaves infra; RAG answers grounded; per-request cost caps enforced |
| Regression safety net | Backend ≥80% line cov on changed modules; critical E2E suite < 10 min, non-flaky |
| Security posture | No Critical/High open findings; Mediums triaged with owner + date |
| Release readiness | Performance budgets met; a11y AA on core flows; mobile smoke green on iOS+Android |

**Severity scale (defects & findings):** S1 Blocker (data leak, auth bypass, data loss) → S2 Critical (broken core flow, no workaround) → S3 Major → S4 Minor → S5 Cosmetic. S1/S2 block release.

---

## 2. Test Strategy — Layers

| Layer | Tooling | What it proves | Where |
|---|---|---|---|
| Unit | Django `TestCase`, pytest, Vitest | Pure logic (services, serializers, utils) | `backend/**/tests*.py`, `frontend/**/*.test.ts` |
| Integration / API | DRF `APITestCase` + Postgres | Endpoint behavior, permissions, tenant routing | backend per-app |
| Contract | `openapi` schema + `npm run api:types` drift check | FE/BE type alignment | root |
| E2E (browser) | Playwright | Real user journeys per role | `tests/e2e/qa/*` (already 01–16) |
| Real-time | Channels test client, Playwright WS | WebSocket auth (ws-tickets), live updates | `ai_engine/tests_ws_consumers.py` + new |
| Async | Celery eager + broker tests | Task correctness, sync fallback | `ai_engine/tests_async_queue.py` + new |
| AI eval | `run_ai_evals` harness | Grounding, refusal, regression of model outputs | `ai_engine/tests_evals.py` |
| Performance | k6 / Locust + Lighthouse | Throughput, p95 latency, Core Web Vitals | new `tests/perf/` |
| Security | see §7 | Isolation, RBAC, OWASP API Top 10 | dedicated suite + manual |

**Known gaps to close:** frontend unit coverage is thin (4 files) — prioritize proxy/auth-guard and React Query hooks. Mobile has no automated suite — add Detox or at minimum manual smoke matrix.

---

## 3. Environments & Test Data

- **Local**: `docker compose up` (backend, FE, Postgres, Redis, Celery). django-tenants **requires Postgres** — no sqlite shortcut even for unit tests.
- **CI**: ephemeral Postgres + Redis services. NOTE: backend test settings (`config.settings.test`) validate `SECRET_KEY` and `ALLOWED_HOSTS` **at import time** (before test overrides apply) — CI env must export both. There is currently **no flake8/black/isort gate** in `.github/workflows/`; add lint + type-check + `npm run api:types --check` as gates.
- **Test tenants**: seed ≥3 schemas via `seed_data` / `reset_tenants_to_demo` — `tenant_a`, `tenant_b`, `public`. Cross-tenant tests MUST authenticate as a `tenant_a` user and attempt to touch `tenant_b` IDs.
- **Fixtures per role**: one user of each role per tenant. Store creds in CI secrets, never in repo (gitleaks already wired with `.gitleaksignore`).
- **Data hygiene**: factory-based generation; no production PII; minors' data synthetic only.

---

## 4. Functional QA — Module × Role Matrix

For each module: CRUD happy path, validation/error paths, empty states, pagination, and **negative authorization** (role that must NOT access). Apps in scope:

| Module | Primary roles | Critical flows to cover |
|---|---|---|
| `users` / auth | all | login, JWT issue/refresh, httpOnly cookie set, logout/blacklist, password reset, email verify, role→dashboard redirect |
| `core` | saas_admin, admin | tenant create/resolve (header → subdomain → public), domain mapping, feature flags |
| `academic` | admin, staff, teacher, student | classes, subjects, lessons, assessments, attendance, grading, enrollment |
| `ai_engine` | teacher, student | RAG tutor (grounded + general), learning paths, quiz/exam gen, summaries, study planner, progress reports, risk analytics |
| `billing` / `billing_saas` / `billing_school` | saas_admin, admin | invoices, fees, payment init + **callback verification**, subscription/plan limits |
| `notifications` | all | in-app + email (Resend), WS push, read state |
| `library` | staff, student | catalog, checkout/return, search |
| `gamification` | student, admin | points, badges, leaderboards |
| `conversations` | teacher, student, parent | threads, messages, WS delivery |
| `projects` | teacher, student | gated by `tenant.features['projects']` — verify gate on AND off |
| `notices` | admin, all | publish, scope, visibility |
| `hr_payroll` / `transport` / `hostel` | admin, staff | CRUD + role gating (ERP-style modules) |
| `reports` | admin, teacher | generation, export, scoping to tenant |

**Role guard matrix (frontend `proxy.ts`):** verify each protected prefix (`/admin`, `/saas`, `/teacher`, `/student`, `/parent`) rejects every other role and unauthenticated users; verify root `/` rewrite/redirect logic; verify stale/invalid token cookie cleanup.

---

## 5. Multi-Tenancy Isolation (BLOCKING — highest priority)

Existing suite touches tenancy (59 test files reference `tenant`). Extend to an explicit, dedicated isolation suite:

1. **Horizontal data access**: as `tenant_a` user, attempt GET/PUT/DELETE on every list+detail endpoint using `tenant_b` object IDs → expect 404/403, never 200 with foreign data.
2. **Schema routing**: confirm `x-tenant-id` header override is **disabled when DEBUG=False** (header fallback is a dev-only path; `core/middleware.py` noted as dead code — verify it cannot be re-activated in prod).
3. **Subdomain resolution**: correct schema selected from hostname; unknown subdomain → safe fallback, not another tenant.
4. **Shared vs tenant apps**: confirm SHARED_APPS (`users`, `billing`, `auditlog`…) data is intentionally public-schema; tenant apps never leak across schemas.
5. **Background jobs**: Celery tasks must carry/restore tenant context — a task enqueued in `tenant_a` must not write to `tenant_b`. Test the `core.async_jobs` sync fallback path too.
6. **WebSockets**: a `tenant_a` socket must not receive `tenant_b` events; ws-ticket must bind to tenant + user.
7. **Vector store**: pgvector `ContentChunk` retrieval scoped to tenant — RAG must never retrieve another school's content.

---

## 6. AI Engine QA

- **PII redaction** (shipped): unit-tested (`tests_pii_redaction.py`); add an integration assertion that `chat_with_fallback` actually masks before the provider call, and that `AI_PII_REDACTION=false` is the only way to disable. Confirm minors' identifiers never appear in provider request bodies (capture outbound payloads in a mock provider).
- **RAG grounding**: grounded mode answers only from retrieved chunks; refuses/deflects when no chunk passes `AI_TUTOR_MIN_SIMILARITY`; cites source. Test against `run_ai_evals` harness; add adversarial prompts (jailbreak, prompt injection via lesson content).
- **Cost controls**: per-request token caps, model fallback on rate-limit/5xx, throttle (`THROTTLE_AI_TUTOR_CHAT`). Verify caps enforced and logged (`AIInteractionLog`).
- **Determinism of rule-based services**: LearningPath, RiskAnalytics — assert thresholds and outputs on fixed fixtures.
- **Eval regression gate**: snapshot eval scores; CI fails on regression beyond tolerance.

---

## 7. Security Audit

### 7.1 Authorization / RBAC (highest-yield)
- **Inventory every `AllowAny`** (currently **25 non-test occurrences**). For each: justify (truly public: login, register, health, payment callback) or fix. Document the approved list; CI check fails on new unjustified `AllowAny`.
- **Centralize permission classes**: prior audit found role-check logic duplicated and inconsistent across viewsets. Verify a single source of truth (`IsStudent`, `IsTeacher`, etc.) and that student-facing AI/academic viewsets enforce role, not just `IsAuthenticated`.
- **Function-level authZ**: object-level checks (a teacher edits only own classes; a parent reads only linked children).
- **Vertical privilege escalation**: student → teacher/admin actions blocked; saas_admin scope vs school admin scope.

### 7.2 Authentication
- JWT: signature, expiry, role-aware lifetimes, refresh rotation (`JWT_STRICT_REFRESH_ROTATION`), blacklist on logout. httpOnly + Secure + SameSite cookies. No token in localStorage. ws-ticket single-use + short TTL.

### 7.3 Tenant isolation
- Covered in §5 — treated as the top security control, not just functional QA.

### 7.4 OWASP API Security Top 10 sweep
BOLA/IDOR (§5.1), broken authN (§7.2), broken object property auth (mass-assignment on serializers — `fields`/`read_only`), unrestricted resource consumption (rate limits, pagination caps, AI cost), broken function-level authZ (§7.1), SSRF (any URL-fetch in AI/import paths), security misconfig (DEBUG, CORS guard, security headers middleware), injection (ORM safe but check raw SQL / vector queries / template), improper inventory (`/api/v1` alias, stale endpoints), unsafe consumption of third-party APIs (OpenAI/Resend/payment).

### 7.5 Payments
- Payment gateway **callbacks**: prior audit flagged them as `AllowAny`. Confirm signature/HMAC verification on every callback (gateway abstraction layer) before state change; replay protection; idempotency. This is S1 if unverified.

### 7.6 Data protection & privacy (minors)
- Encryption in transit (HTTPS/HSTS) and at rest. PII minimization in logs and AI prompts. Audit log (`auditlog`) coverage for sensitive actions. Data export/delete (student records) honoring tenant boundary. COPPA/FERPA-style considerations for minors.

### 7.7 Infrastructure & supply chain
- Secrets: gitleaks gate (wired); rotate any historically committed keys; `.env` never committed; `METRICS_TOKEN` gate on `/api/metrics` (done — regression-test it).
- Dependencies: `pip-audit` (backend), `npm audit`/Dependabot (FE+mobile+root). Keep Django/Next patched (Django 5.2.x, Next 16.x per prior sprints). Note: pgvector pkg must stay OUT of local venv.
- Headers: CSP, HSTS, X-Frame-Options via `SecurityHeadersMiddleware`. Upload validation (type/size) on file endpoints.
- WebSocket origin checks; CORS allowlist (not `*`).

### 7.8 Tooling
- SAST: `bandit` (Python), `semgrep` (rulesets for Django/React). DAST: OWASP ZAP baseline against a seeded staging tenant. Container scan: `trivy` on the backend image. Secret scan: gitleaks (already in CI config).

---

## 8. Non-Functional

- **Performance**: define budgets — API p95 < 400ms (non-AI), AI tutor first-token < 3s; FE LCP < 2.5s, CLS < 0.1. Tools: k6/Locust for API load (per-tenant + multi-tenant noisy-neighbor), Lighthouse CI for web vitals. Test DB query N+1 on list endpoints.
- **Scale**: existing `lms-deployed-scale.spec.ts` — extend with concurrent multi-tenant load.
- **Accessibility**: axe-core in Playwright on core flows; keyboard nav; ⌘K palette; AA contrast.
- **Resilience**: Celery worker down → sync fallback; Redis down → graceful degrade; provider 429 → model fallback.

---

## 9. Mobile (Expo) QA
- No automated suite today. Add Detox (or Maestro) smoke for: login, student dashboard, tutor chat, notifications. Manual matrix: iOS + Android, online/offline, push notifications, API base URL config. Mobile is **student/teacher/parent only — no admin portal** (scope locked).

---

## 10. Execution Phases

| Phase | Focus | Output |
|---|---|---|
| 0. Setup | Seed multi-tenant fixtures, CI Postgres/Redis, add lint+type+secret gates | Green CI baseline |
| 1. Isolation & AuthZ | §5 + §7.1/7.5 — the blocking security core | Isolation suite + AllowAny verdicts |
| 2. Functional per-module | §4 matrix, role negative tests | Per-app API + E2E green |
| 3. AI & async | §6, WebSocket, Celery | Eval gate + WS/async suites |
| 4. Security sweep | §7.4 OWASP, SAST/DAST/dep/container scans | Findings report (severity-ranked) |
| 5. Non-functional | §8 perf, a11y, resilience | Budgets verified |
| 6. Mobile | §9 | Smoke matrix signed |
| 7. Sign-off | Triage, regression, exit criteria §1 | Release-readiness report |

---

## 11. Risk Register (initial)

| Risk | Sev | Status |
|---|---|---|
| Cross-tenant data leak (BOLA across schemas) | S1 | Test §5 — must prove zero |
| Payment callback without signature verify | S1 | Confirm §7.5 |
| 25 `AllowAny` endpoints — some may be unintended | S1–S2 | Inventory §7.1 |
| Inconsistent/duplicated permission classes | S2 | Centralize §7.1 |
| AI prompt injection via lesson content (RAG) | S2 | Adversarial evals §6 |
| Minors' PII in AI prompts/logs | S2 | Verify redaction end-to-end §6 |
| No CI lint/type gate; thin FE + zero mobile automation | S3 | Phase 0 + §9 |
| Celery task losing tenant context | S2 | §5.5 |

---

## 12. Deliverables
1. Automated suites: tenant-isolation, RBAC negative, per-module API, E2E (extend `qa/` 01–16), AI eval gate, WS/async, perf.
2. Security findings report (severity-ranked, owner, remediation, retest status).
3. CI gates: lint, type-check, api-types drift, secret scan, SAST, dep audit.
4. Release-readiness sign-off against §1 exit criteria.
