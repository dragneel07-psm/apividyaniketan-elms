# Project Tracking — Phase 8 Rollout Checklist

Owner: TBD
Pilot tenant: TBD
Target window: 1 week pilot, then global enable

This is the operational checklist for rolling out the projects module to a
pilot school after PR #29 merges. All technical work for Phases 1–7 is in
the branch `feat/projects-module`; this document covers what happens once
the code is on `main`.

---

## 1. Pre-merge verification

These should be green before the PR is merged.

- [ ] CI passes on `feat/projects-module`
- [ ] `cd backend && python manage.py test projects` — 65 tests green
- [ ] `cd frontend && npm run type-check` clean
- [ ] `cd mobile && npx tsc --noEmit` clean
- [ ] Manual smoke against a local dev stack: feature flag off → REST + WS both 403; feature flag on → teacher/student/parent flows work end-to-end
- [ ] Code review approval from at least one other engineer
- [ ] `CLAUDE.md` reflects the new `/api/projects/` route and the `projects` tenant app

## 2. Merge + deploy to staging

- [ ] Squash-merge or merge-commit (project preference) PR #29 into `main`
- [ ] Confirm `main` deploys cleanly to staging
- [ ] Run `python manage.py migrate_schemas --shared` then `--tenant` on staging — should be a no-op for `core` and one initial migration for `projects` per tenant schema
- [ ] Confirm Celery worker + beat picks up the two new schedules:
  - `projects.scan_overdue_tasks` — hourly
  - `projects.scan_due_soon_projects` — daily at 09:00
- [ ] Confirm Channels consumer is reachable via `wss://<staging>/ws/projects/<id>/?token=<jwt>`

## 3. Tenant enablement

Project tracking is treated as **baseline LMS functionality** (same pattern
as `student_gamification`): every tenant gets it. The data migration
`core.0009_backfill_tenant_projects_feature` flips
`tenant.features['projects'] = True` for every existing tenant on first
deploy, and `build_plan_entitled_features()` ensures new tenants pick it
up automatically.

- [ ] Confirm the migration ran: `Tenant.objects.values_list("features", flat=True)` should
      show `projects: True` on every row.
- [ ] Verify the gate is open: hit `GET /api/projects/projects/` as any
      teacher — should return `200`.

**Per-tenant override (shipped):** SaaS admins can flip a feature on or
off for a specific school via the Switch in
`/saas/schools/<id>` → Settings → Feature Flags. The toggle PATCHes
`tenant.feature_overrides`, which the plan-sync layer respects (overrides
win over plan baseline). An "override" badge marks any flag that diverges
from the plan default.

## 4. Pilot test plan (against staging)

Run as a real mentor + 5 students, not via fixtures.

- [ ] Mentor creates a group project tied to one section, sets `min=2 max=5`,
      `due_date` 7 days out, saves as draft
- [ ] Mentor adds 3 students as members + designates one as leader
- [ ] Mentor activates the project; verify `min_group_size` enforcement
      blocks activation if fewer members than `min`
- [ ] Leader creates 4 tasks, assigns each to a different teammate
- [ ] Two teammates open the project on web; one opens on mobile. Verify
      that as the leader changes a task's status on web, the other teammate's
      kanban + progress bar update **without refresh** (Channels working)
- [ ] Member updates only their own task — confirm UI rejects edits to
      others' tasks (server already enforces it; this is a UX check)
- [ ] Wait until at least one task crosses its `due_date` un-done. Confirm
      `scan_overdue_tasks` emits a Notification within an hour to the
      assignee + leader, and the in-app bell shows it.
- [ ] Set a project's `due_date` to within 24h. Confirm
      `scan_due_soon_projects` emits Notifications at 09:00 the next day.
- [ ] Leader submits the project; mentor grades it (final_grade=85, with
      a 3-line rubric). Confirm:
  - [ ] Member sees the graded badge + grade on `/student/projects/<id>`
  - [ ] Parent sees the grade on `/parent/projects` (read-only)
  - [ ] Mobile reflects the same state on next refresh

## 5. Playwright runs against staging

- [ ] Set env in `playwright.env.local`:
      ```
      E2E_BASE_URL=https://staging.<host>
      E2E_API_URL=https://staging-api.<host>
      E2E_TEACHER_EMAIL=<seeded teacher>
      E2E_TEACHER_PASSWORD=<password>
      E2E_TEACHER_SCHOOL_CODE=<pilot_schema>
      ```
- [ ] `npx playwright test tests/e2e/smoke/projects-smoke.spec.ts --project=chromium`
- [ ] `npx playwright test tests/e2e/critical/projects.spec.ts --project=chromium`
- [ ] Both green

## 6. Observability

Confirm these are visible during the pilot week.

- [ ] Sentry: no new error groups under `projects.*`
- [ ] Celery: `projects.scan_overdue_tasks` runs hourly with no failures
- [ ] Channels: WS `4403 close` count stays low (any spike means tenant
      misconfig — flag missing on a tenant whose users have the projects
      tab visible)
- [ ] Backend logs: no `project ws broadcast failed` errors

## 7. Pilot review (end of week)

- [ ] Mentor + 5 students fill a 5-question feedback form
- [ ] Triage feedback into:
  - [ ] **Blockers** — must fix before global rollout
  - [ ] **Polish** — fix in a follow-up PR
  - [ ] **Future** — backlog (Phase 9+ ideas)

## 8. Global enable

Already global from Section 3 — projects is default-on for every tenant.
Pilot week was a soft launch; this section is just communications.

- [ ] Announce in the SaaS-admin newsletter / changelog
- [ ] Watch Sentry + Celery for 48h post-rollout

## 9. Rollback plan

If a P0 surfaces in pilot or global rollout:

- [ ] Disable for an individual tenant by writing to `feature_overrides`
      (this survives plan-sync because the override layer wins):
      ```python
      from core.models.tenant import Tenant
      from core.utils.plan_enforcement import sync_tenant_with_plan
      t = Tenant.objects.get(schema_name="<schema>")
      t.feature_overrides = {**(t.feature_overrides or {}), "projects": False}
      t.save(update_fields=["feature_overrides"])
      sync_tenant_with_plan(t)  # rebuilds t.features from plan + override
      ```
      Equivalent in the SaaS UI: visit `/saas/schools/<id>` → Settings →
      Feature Flags and click the projects Switch off.
- [ ] If the bug is data-corrupting, halt Celery beat (`celery -A config
      beat --detach` → kill) so overdue/due-soon scans don't compound it.
- [ ] Hotfix on a branch off `main`; do **not** revert the merge unless the
      whole module needs to come out — the migrations would otherwise need
      a manual rollback.

---

## Phase 9 backlog (out of scope for rollout)

Captured here so they don't drift away. Pick what matters before the next
sprint.

- Hide nav entries when `tenant.features.projects` is off (currently links
  show but pages 403). Needs a feature-flag exposure on `/api/users/me/` or
  similar.
- ~~Per-tenant feature overrides that survive plan-sync.~~ **Shipped** —
  `Tenant.feature_overrides` JSONField + clickable Switch in the SaaS
  school detail page; plan-sync merges plan baseline with the override
  dict, override wins.
- Per-task weights surfaced in the UI (currently default=1 and hidden).
- Mentor digest WebSocket channel that fans in summary events for all
  guided projects (already designed in the original plan but not built).
- Rubric templates teacher-managed via `RubricTemplate` model (currently
  free-form JSON).
- Cross-class collaborations (drop the one-section-per-project rule).
- Move project final_grade into the unified gradebook so reports aggregate it.
