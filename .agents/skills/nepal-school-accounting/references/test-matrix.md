# Accounting Test Matrix

Use the relevant rows for every financial change.

| Area | Required proof |
|---|---|
| Double entry | Balanced entry posts; unbalanced, zero/zero, dual-sided, negative, and one-line entries fail |
| Source linkage | One source event creates one journal entry; retry returns the same result; reversal links to original |
| Immutability | Posted journal and finalized receipt/expense/payroll cannot be edited or deleted |
| Correction | Void/reversal restores subledger, control account, document status, and audit history |
| Allocation | Partial, split, advance, overpayment, refund, waiver, and write-off reconcile to student balance |
| Period control | Closed period rejects posting; authorized reopen and re-close are audited |
| Numbering | Parallel requests produce unique, gap-explained sequences scoped by fiscal year and type |
| Rules | Boundary dates and slab/threshold edges choose the correct approved rule version |
| Payroll | Single/couple and PF/SSF/none cases snapshot rules; liabilities equal deductions and employer costs |
| TDS | Counterparty status, PAN identity, cumulative threshold, deposit, correction, and fiscal-year rollover reconcile |
| Cash/bank | Payment, gateway clearing, MSF, settlement, bounced item, and reconciliation produce expected balances |
| Assets | Purchase, transfer, depreciation, impairment, disposal, and physical count preserve cost and accumulated depreciation |
| Reports | Trial balance balances; statements tie to it; control accounts tie to subledgers; opening plus movement equals closing |
| Authorization | Cashier, accountant, approver, HR, school admin, teacher, parent, student, and SaaS roles have tested boundaries |
| Tenant isolation | Identifiers, exports, tasks, caches, and callbacks cannot read or mutate another schema |
| Audit | Actor, reason, before/after summary, correlation id, tenant, source, approval, and timestamps are retained |
| Precision | Decimal rounding occurs once at the policy boundary and matches stored totals and exported values |
| Migration | Dry run, row counts, debit-credit totals, unresolved mappings, rerun safety, and rollback/forward-fix are tested |

## Property-style invariants

- Sum of posted debits equals sum of posted credits for every entry and for the whole ledger.
- Receivable control equals the total student subledger after every committed event.
- Payable control equals vendor/payroll/statutory subledgers after every committed event.
- Cash and bank control accounts equal reconciled ledger balances plus explained outstanding items.
- A source event is represented zero or one time before posting, exactly one time after posting, and by an equal opposite effect after reversal.
- Re-running a command with the same idempotency key never changes totals.
- Changing the active rule set never changes a finalized historical snapshot.

Run focused Django tests first, then the relevant frontend type/lint/unit checks and E2E journey. For schema changes, run `makemigrations --check --dry-run` and test both shared and tenant migration paths.
