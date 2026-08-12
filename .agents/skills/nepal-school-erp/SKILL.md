---
name: nepal-school-erp
description: Review, design, implement, and test integrated ERP workflows for this multi-tenant Nepali school platform. Use for admissions, student information, academics, fees, accounting, HR and payroll, attendance, procurement, inventory, fixed assets, library, transport, hostel, grants, reporting, approvals, audit trails, privacy, Nepal school rules, municipal/provincial requirements, or cross-module backend, frontend, mobile, API, migration, and test changes.
---

# Nepal School ERP

Build connected school workflows with explicit ownership, approvals, audit evidence, privacy controls, and tenant-safe integrations. Use `$nepal-school-accounting` for every workflow that creates a financial consequence.

## Start with the repository

1. Read [project-map.md](references/project-map.md) before designing or editing a module.
2. Read [nepal-school-operations.md](references/nepal-school-operations.md) for legal applicability and official-source requirements.
3. Identify the tenant's school type, municipality, province, academic calendar, fiscal calendar, grading scheme, language needs, and enabled features. Make unresolved differences configurable.
4. Trace the complete user journey across backend, web, mobile, notifications, reports, and accounting.
5. Preserve schema-per-tenant isolation and existing role guards.

## Define each workflow before coding

For every workflow, write a compact contract containing:

- actors and separation of duties;
- authoritative record and unique business identifier;
- allowed states and transitions;
- validation, approval, cancellation, correction, and reopening rules;
- effective dates and applicable policy version;
- generated documents and notifications;
- accounting events and reconciliation points;
- personal data collected, purpose, visibility, retention, and export behavior;
- audit events and operational metrics;
- tenant, permission, retry, concurrency, and failure behavior.

Do not model a business process as unrestricted CRUD when it has a lifecycle. Prefer commands such as submit, approve, reject, cancel, reverse, transfer, issue, return, finalize, and close.

## Establish master-data ownership

- `core`: tenant, school legal form, registration and PAN/VAT details, province/municipality, calendars, locale, feature and policy configuration.
- `users` and `academic`: identities, guardianship, enrollment, class/section, academic year, subjects, and authoritative student status.
- `hr_payroll`: employee contract, department, attendance inputs, leave, payroll, and appraisals.
- `billing` and `billing_school`: fee and finance subledgers, canonical journal, statutory registers, and financial reports.
- domain apps: library copies/issues, transport routes/vehicles/assignments, hostel rooms/allotments, projects, and other operational records.

Create shared vendor, location, cost-center, fund, approval-policy, document-sequence, and regulatory-rule masters when workflows need them. Avoid duplicating student, employee, account, or vendor facts across apps.

## Connect the core school journeys

Implement explicit integrations for these flows:

1. Enquiry/application -> admission approval -> student and guardian -> enrollment -> approved fee plan -> initial receivable.
2. Academic-year promotion/transfer/withdrawal -> roster and access update -> fee, transport, hostel, and library consequences.
3. Attendance and approved leave -> payroll inputs and student/guardian alerts, with human review before financial finalization.
4. Fee schedule approval -> fee assignment -> invoice/assessment -> collection/allocation -> receipt -> refund or write-off -> general ledger.
5. Purchase request -> approval -> purchase order -> receipt -> stock/asset -> vendor bill/TDS -> payment -> general ledger.
6. Employee onboarding -> contract -> attendance/leave -> payroll -> payment -> statutory deposit -> general ledger.
7. Library, transport, hostel, exam, and activity charges -> the same fee subledger rather than isolated charge tables.
8. Grant/donation -> restriction and budget -> spending approval -> fund report -> accounting statements.

Use transactional domain services for same-database changes and an outbox with idempotent consumers for deferred cross-module side effects.

## Apply platform controls

- Resolve tenant server-side and reject public-schema or cross-tenant mutations for school ERP endpoints.
- Filter every tenant model through the established schema guard; never trust only a client-supplied identifier.
- Use least privilege and object-level checks. Distinguish SaaS admin, school admin, accountant, cashier, HR manager, teacher, librarian, transport manager, hostel manager, student, and parent capabilities.
- Require maker-checker approval for sensitive money, payroll, identity, enrollment, result, inventory-disposal, and period-close actions.
- Record actor, tenant schema, action, object, before/after summary, reason, timestamp, request/correlation id, and source channel in audit events.
- Keep background jobs, exports, caches, WebSockets, and generated files tenant scoped.
- Protect minors' and employees' personal data in APIs, logs, exports, notifications, AI prompts, and backups.
- Store timestamps in a stable system timezone while presenting Nepal time; store AD dates with derived BS dates where legally or operationally needed.
- Support Nepali and English labels without making translated display text the database key.

## Design APIs and data safely

- Use stable IDs, explicit serializers, pagination, filtering, and versioned contracts.
- Require idempotency for creates, imports, payments, batch assignments, payroll runs, and external callbacks.
- Lock contested sequences and state transitions; enforce uniqueness and transition invariants in the database where possible.
- Validate uploads, exports, and bulk operations with per-row results and a resumable job record.
- Do not use signals for business-critical orchestration that requires ordering, approval, or visible failure handling.
- Add migrations with backfill, reconciliation, observability, and rollback/forward-fix strategy.
- Update web and mobile consumers together or preserve backward compatibility.

## Deliver vertical slices

Implement one end-to-end outcome at a time: model and migration, service, permission, API, audit event, accounting integration, UI, export/report, tests, and operational documentation. Prefer finishing a reliable workflow over adding disconnected screens.

Use [delivery-checklist.md](references/delivery-checklist.md) for acceptance and rollout. Report verified law separately from local policy and product assumptions; cite current official sources for any regulatory claim.
