---
name: nepal-school-accounting
description: Review, design, implement, and test audit-ready accounting for this multi-tenant Nepali school platform. Use for fees, receipts, refunds, scholarships, expenses, procurement postings, double-entry journals, chart of accounts, budgets, funds, TDS, VAT, payroll accounting, SSF/PF/CIT, inventory and fixed assets, bank reconciliation, fiscal close, NAS for NPO reporting, or Nepal regulatory changes in backend/billing, backend/billing_school, backend/hr_payroll, finance UI, APIs, migrations, and tests.
---

# Nepal School Accounting

Build every finance change around a single posted double-entry ledger and effective-dated Nepal rules. Treat legal and tax output as implementation support that requires approval by the school's accountant or legal adviser.

## Start with evidence

1. Read [project-map.md](references/project-map.md) before changing finance code.
2. Identify the school's legal form: community/public school, private company school, public educational trust, or another NPO. Do not assume NAS for NPOs applies to every tenant.
3. For any tax rate, threshold, contribution, statutory form, scholarship rule, fee restriction, or filing deadline, read [nepal-compliance.md](references/nepal-compliance.md) and verify the current official source. Record the source URL, section, fiscal year, jurisdiction, and verification date in the change.
4. Trace the source transaction, journal posting, reversal, report, permission, audit event, and tenant boundary end to end.
5. Preserve unrelated user changes and the existing schema-per-tenant design.

## Use one accounting source of truth

Treat `billing_school.JournalEntry` plus `JournalLine` as the canonical general ledger unless an approved migration changes that decision.

- Post every completed financial event to the general ledger in the same database transaction as its source document.
- Give every posting an immutable link to its source document, event kind, and idempotency key.
- Derive statutory financial statements, trial balance, account balances, and cash flow only from posted journal lines.
- Keep subledgers for student receivables, vendors, payroll, inventory, and bank activity, but reconcile each control account to its subledger.
- Deprecate `LedgerAccount`/`LedgerEntry` as an independent accounting truth. Use it only as a view or projection of the general ledger during migration.
- Never use dashboard totals or synthetic report rows as substitutes for journal postings.

## Enforce posting invariants

- Use `Decimal`; never use binary floats for stored or calculated money.
- Require at least two lines and exact equality of total debits and credits.
- Require each journal line to contain exactly one positive side: debit XOR credit. Reject zero/zero and debit-plus-credit lines at both service and database levels.
- Allocate receipt and voucher sequences under a database lock and scope them by tenant schema, document type, and fiscal year.
- Make posted entries and finalized documents immutable. Correct them with a linked reversal and, when needed, a replacement entry.
- Prevent posting into closed periods. Reopening requires authorization, a reason, an audit event, and a new close snapshot.
- Use maker-checker approval for manual journals, refunds, write-offs, discounts above policy, vendor payments, payroll finalization, asset disposal, and period reopen.
- Make retries safe with idempotency keys and unique source-event constraints.
- Store AD date, derived BS date, and Nepal fiscal year together; define one tested conversion policy.

## Use the posting matrix

Confirm the tenant's approved chart of accounts before implementation. Typical entries are:

| Event | Debit | Credit |
|---|---|---|
| Fee assessment | Student fee receivable | Fee income by fee head |
| Fee receipt | Cash/bank/gateway clearing | Student fee receivable |
| Refund | Refund/fee income reversal | Cash/bank |
| Approved scholarship | Scholarship or concession expense | Student fee receivable |
| Vendor bill | Expense/asset and eligible tax account | Accounts payable and TDS payable |
| Vendor payment | Accounts payable | Cash/bank |
| Payroll finalization | Salary and employer contribution expense | Net salary, TDS, PF/SSF/CIT and other payables |
| Payroll payment | Net salary payable | Bank |
| Statutory deposit | TDS/PF/SSF/CIT payable | Bank |
| Asset depreciation | Depreciation expense | Accumulated depreciation |
| Gateway settlement fee | Bank charge/MSF expense | Gateway clearing |

Treat this table as a design starting point, not a legal conclusion. Resolve VAT, exemption, withholding, grant, restricted-fund, and school-form treatment from approved policy and current sources.

## Model changing rules as data

Do not add new fiscal-year rates as module constants.

- Store rule set, rule type, legal form, jurisdiction, effective-from/to BS and AD dates, source citation, approval status, version, and approver.
- Select rules by transaction date and tenant profile.
- Snapshot the resolved rules and calculation inputs on payroll slips, TDS entries, invoices, depreciation runs, and filings.
- Never recalculate historical finalized records when rules change.
- Fail closed when no approved rule matches; do not silently fall back to an old fiscal year.

## Implement through services

Place orchestration in explicit domain services rather than serializers, signals, or view methods.

1. Validate tenant, role, document state, open period, accounting policy, and rule version.
2. Lock the affected source document and control records with `select_for_update()`.
3. Persist the source transition and balanced draft entry atomically.
4. Apply approval policy and post only when the required approval exists.
5. Emit the audit event after the durable state change; use an outbox for external side effects.
6. Return stable document and journal identifiers to the API.

## Cover the full accounting cycle

When reviewing or extending the system, assess:

- fee catalog, approved fee schedule, fee heads, billing, discounts, scholarships, late fees, receivables, receipts, allocations, refunds, waivers, write-offs, and aging;
- vendor master with PAN/VAT identity, purchase requisition, purchase order, goods receipt, vendor invoice, TDS, payment, and supplier reconciliation;
- cash and bank books, gateway clearing, bank statement import, reconciliation, deposits in transit, bounced payments, and merchant fees;
- employee master, attendance inputs, payroll calculation, approval, liabilities, payment, and statutory deposits;
- restricted/unrestricted grants and donations, budget control, commitments, actuals, and fund accountability;
- stock movements, consumables, fixed assets, custodians, transfers, impairment, depreciation, disposal, and physical verification;
- period close, accruals, prepayments, opening balances, adjustment journals, financial statements, notes, audit schedules, and year rollover.

## Verify before handoff

Read [test-matrix.md](references/test-matrix.md) and run the smallest relevant backend, frontend, and migration checks. Include concurrency, authorization, tenant isolation, reversal, retry, closed-period, and reconciliation tests for financial mutations.

Report separately:

- verified statutory requirements with official citations;
- configurable business policy;
- assumptions requiring accountant, municipality, regulator, or legal approval;
- migrations/backfills and their rollback or reconciliation plan;
- test evidence and any remaining accounting imbalance.
