# Accounting Project Map

Reviewed against the repository on 2026-08-12. Reinspect before acting because this is a living codebase.

## Current implementation

- `backend/billing/models_school.py`: fee discounts, fee structures and heads, student fees, payments, expenses, bill numbers, late-fee and scholarship fields.
- `backend/billing_school/models_nas.py`: chart of accounts, journals, journal lines, funds, TDS register, inventory/assets, depreciation, and merchant service fees.
- `backend/billing_school/models_ledger.py`: separate cash/bank ledger accounts and entries.
- `backend/billing_school/views.py`: fee assignment, collections, receipt generation, expenses, and finance dashboards.
- `backend/billing_school/views_nas.py`: chart seeding, manual journals, posting/reversal, TDS, inventory, NAS statements, BS calendar, and ConnectIPS.
- `backend/billing_school/views_reports.py`: fee reports, day/cash/bank books, student ledger, aging, scholarship register, and trial balance.
- `backend/hr_payroll/`: employee, leave, attendance, Nepal payroll calculation, payroll periods, slips, payment states, and appraisals.
- `frontend/app/admin/finance/`: finance overview, fees, collection, bulk billing, manual accounting, and reports.
- `frontend/app/admin/hr/PayrollManager.tsx`, `frontend/app/admin/inventory/`, student/parent fee pages, and teacher payroll pages are related consumers.

## Foundations worth preserving

- Schema-per-tenant isolation and billing schema guards.
- Idempotency support on key billing mutations.
- Audit events on many fee, payment, expense, journal, report, and payroll actions.
- Posted journal balance checks, reversal entries, locked numbering paths, BS date derivation, and calculation snapshots on salary slips.
- Existing finance contract, NAS, payroll, security, and E2E tests.

## Priority review findings

### P0: operational finance does not feed the canonical ledger

`PaymentViewSet.perform_create()` and `ExpenseViewSet.perform_create()` update operational models and audit logs but do not create posted `JournalEntry` records. Payroll payment/finalization also lacks a visible general-ledger link. Trial balance and NAS statements use posted journal lines, so they can omit ordinary receipts, expenses, and payroll even when dashboards show them.

### P0: mutable money can desynchronize subledgers

Payments and expenses expose normal model-viewset update and delete behavior. Payment update/delete does not visibly reverse its prior effect on `StudentFee.amount_paid`, status, or the general ledger. Completed receipts and expenses should use void/reversal workflows, not destructive CRUD.

### P0: three competing financial truths exist

The system contains the NAS journal, `LedgerAccount`/`LedgerEntry`, and reports synthesized directly from `Payment`, `Expense`, and `StudentFee`. Choose the posted journal as canonical, reconcile subledgers to it, and retire or project the independent ledger.

### P1: regulatory rules are hard-coded and inconsistent

`backend/billing_school/utils_tds.py` labels salary slabs as FY 2081/82. `backend/hr_payroll/payroll_nepal.py` defaults to FY 2082/83 and has a different top-slab structure. Gateway MSF rates and asset depreciation defaults are also code constants. Move them to approved, effective-dated rule sets and snapshot resolved versions.

### P1: accounting lifecycle controls are incomplete

There is no visible fiscal-period close/reopen model, approval chain for postings, source-document foreign key on journals, bank reconciliation workflow, vendor subledger, or statutory liability settlement reconciliation. Manual journal numbering is protected, but all source types need the same concurrency discipline.

### P1: procurement and inventory are registers, not a complete flow

`InventoryItem` records assets/consumables and depreciation, but there is no full requisition, purchase order, goods receipt, vendor invoice, stock movement, physical-count adjustment, or approved disposal chain linked to accounting.

### P1: legal applicability is not explicit

NAS for NPO treatment is named throughout the module, but a tenant-level legal-form and accounting-framework decision is not evident in the finance flow. A private company school, community school, and public educational trust can require different reporting and tax treatment.

### P2: reports need a common basis

Dashboard revenue/expense metrics use operational tables while trial balance and NAS statements use journals. Reports need documented recognition basis, date basis, posted/draft rule, opening balances, comparative periods, and reconciliation totals.

## Safe improvement order

1. Add tenant accounting profile, effective-dated rules, fiscal periods, document sequences, approval policy, and source-linked posting metadata.
2. Build a tested posting service and make receipts, expenses, payroll, TDS deposits, gateway settlements, refunds, and depreciation use it atomically.
3. Lock completed source documents and introduce void/reverse/replace workflows.
4. Reconcile and backfill historical operational records into the journal with a dry-run discrepancy report.
5. Move cash/bank and all financial statements to the canonical ledger; add subledger-control reconciliations.
6. Add vendor/procurement, bank reconciliation, budget/commitment, and complete inventory workflows.

Do not backfill or post production records without explicit authorization, an accountant-approved mapping, a dry run, backups, and tenant-by-tenant reconciliation.
