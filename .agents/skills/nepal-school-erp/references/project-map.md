# ERP Project Map

Reviewed against the repository on 2026-08-12. Reinspect before implementation.

## Architecture

- Django 5.2 and DRF backend with `django-tenants` schema-per-school isolation.
- Next.js App Router web client, Expo mobile client, JWT/cookie auth, and `x-tenant-id` resolution.
- Celery/Redis background jobs and Django Channels.
- Shared/public responsibilities in `core`, `users`, and SaaS billing; tenant apps include academic, school billing, HR/payroll, library, transport, hostel, projects, notifications, conversations, gamification, and AI features.
- Role families include SaaS admin, school admin, staff, teacher, student, and parent, with more specific staff roles in parts of the backend.

## Existing domain coverage

- `academic`: years, classes, sections, subjects, teachers, students, learning, assignments, quizzes, exams, results, timetable, and attendance-related workflows.
- `billing` and `billing_school`: fees, receipts, expenses, reports, NAS-style accounting, TDS, assets/inventory, and payment gateways.
- `hr_payroll`: departments, employees, leave, attendance, payroll, salary slips, and appraisals.
- `library`: books and issues.
- `transport`: routes, vehicles, and student assignments.
- `hostel`: blocks, rooms, and allotments.
- `projects`, notifications, conversations, gamification, reports, school CMS, and AI services extend the platform.

## Strengths to preserve

- Broad school-domain coverage and role-specific web/mobile surfaces.
- Tenant schema guards, permission classes, audit logging, idempotency infrastructure, async jobs, API aliases, and deployment/test tooling.
- Existing approval-style actions in leave, payroll, appraisals, timetables, and journal posting.

## Integration gaps to check first

- Operational modules are mostly separate CRUD/API areas; cross-module lifecycle contracts are not consistently explicit.
- Library, transport, hostel, payroll, inventory, and fee events do not all visibly converge on one receivable/payable/general-ledger workflow.
- Procurement/vendor management, purchase orders, goods receipt, stock movements, budget commitments, bank reconciliation, and fiscal close are not complete ERP bounded contexts.
- Approval policies are embedded per view rather than represented as configurable maker-checker rules.
- There is no evident durable domain-event/outbox layer for reliable cross-module integration.
- Tenant legal form, municipality/province rules, accounting framework, regulatory versions, retention schedules, and local fee approval evidence need a coherent profile.
- Role labels are broad at routing level and more granular in HR; ensure consistent capability-based authorization across APIs and clients.
- Privacy, consent/purpose, retention, redaction, and access export behavior for minors' data need explicit workflow-level treatment.
- README module/API descriptions can lag implementation; trust current code and tests over summary documentation.

## Recommended delivery order

1. Establish tenant school/compliance profile, capability matrix, approval policy, audit event schema, and integration-event conventions.
2. Complete canonical finance posting with `$nepal-school-accounting`.
3. Finish admission-to-enrollment-to-fee and promotion/withdrawal lifecycle.
4. Build procure-to-pay and stock/asset lifecycle.
5. Connect attendance/leave-to-payroll and statutory settlement.
6. Integrate library, transport, hostel, exams, and activities with common billing and notifications.
7. Add management dashboards from reconciled operational facts, not duplicated totals.
8. Add retention/privacy operations, regulator/local-authority exports, disaster recovery, and tenant-by-tenant rollout controls.

Implement as vertical slices with migrations, API, UI, permissions, audit, finance consequence, tests, and rollout evidence together.
