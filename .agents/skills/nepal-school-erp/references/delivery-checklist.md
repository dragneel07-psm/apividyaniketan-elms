# ERP Delivery Checklist

## Product and policy

- Confirm actors, school type, jurisdiction, academic/fiscal period, and approved policy owner.
- Separate statutory requirement, local bylaw, school policy, and product assumption.
- Define lifecycle states, commands, approvals, correction path, documents, notifications, and SLA.
- Define accounting events with `$nepal-school-accounting`.

## Data and integration

- Name the authoritative record and remove or reconcile duplicates.
- Define stable identifiers, uniqueness, effective dates, versioning, and retention.
- Define same-transaction writes versus outbox events and idempotent consumers.
- Define failure, retry, compensation, reconciliation, and manual repair paths.
- Keep bulk imports resumable and produce per-row evidence.

## Security and privacy

- Test tenant schema rejection, cross-tenant identifiers, public-schema access, and background jobs.
- Test capability and object-level access for every role and relationship.
- Minimize and redact minors', guardians', employees', and financial data.
- Audit sensitive reads, exports, approvals, changes, and reversals as policy requires.

## Implementation slice

- Migration and backfill with dry-run counts and reconciliation.
- Domain service and explicit state transition.
- Permission and tenant guard.
- Versioned API and idempotency behavior.
- Audit event and correlation id.
- Accounting posting/reversal where applicable.
- Web and mobile UI with loading, error, empty, retry, and unauthorized states.
- Notification and export/report with tenant-safe storage.
- Metrics, logs, alerts, repair tooling, and operational runbook update.

## Test acceptance

- Happy path plus invalid transition, duplicate request, stale update, concurrent action, cancellation, correction, and reopen.
- Role matrix and object ownership.
- Tenant isolation across API, tasks, exports, cache, WebSocket, and search.
- Date boundaries for academic year, Nepal fiscal year, BS/AD conversion, timezone, and effective rule version.
- Reconciliation between source module, finance subledger, general ledger, dashboard, and export.
- Migration forward path, rerun safety, partial failure recovery, and rollback/forward-fix.
- Frontend type/lint/unit checks, focused backend tests, and an end-to-end journey.

## Rollout

- Pilot one non-production tenant with representative data.
- Compare before/after counts, balances, documents, and permissions.
- Obtain operational, accounting, and compliance sign-off.
- Roll out tenant by tenant with monitoring and a documented stop condition.
- Never silently rewrite finalized historical records.
