# NAS Accounting System — Overview

> **Standard**: Nepal Accounting Standards (NAS) for Non-Profit Organisations 2018
> **Module**: `backend/billing_school/`
> **Last updated**: 2026-04-05 (post QA audit fixes)

---

## Architecture

The NAS accounting module is the **single source of truth** for all financial data. Every monetary event (fee receipt, expense payment, TDS, gateway MSF, depreciation) must produce a posted `JournalEntry` with balanced `JournalLine` records. Financial statements are derived exclusively from posted journal lines — **not** from the raw `Payment` or `Expense` tables.

```
Fee Receipt / Expense / Gateway Payment
         │
         ▼
   JournalEntry (unposted)
    ├── JournalLine (Dr Account A)
    └── JournalLine (Cr Account B)
         │
         ▼  POST action (locks entry)
   JournalEntry (is_posted=True)  ──────────────────────┐
                                                         │
                                         ┌───────────────▼───────────────┐
                                         │     Financial Statements       │
                                         │  Income & Expenditure (NAS §5) │
                                         │  Balance Sheet        (NAS §4) │
                                         │  Cash Flow            (NAS §6) │
                                         │  Changes in Reserves  (NAS §7) │
                                         └───────────────────────────────┘
```

### Key Models

| Model | Purpose | Immutable once posted? |
|---|---|---|
| `ChartOfAccount` | Account hierarchy (1xxx–5xxx) | No (name/sub_type editable) |
| `JournalEntry` | Voucher header (date, type, number) | Yes (`is_posted=True`) |
| `JournalLine` | Individual debit/credit leg | Yes (part of posted entry) |
| `FundAccount` | Restricted/unrestricted fund pots | No |
| `TDSEntry` | Tax Deducted at Source register | No (deposit status updatable) |
| `InventoryItem` | Capital assets register (Form 401/403/405) | No |
| `MerchantServiceFee` | Auto-posted gateway charge record | No |

### Chart of Accounts — Standard NAS Codes

```
1xxx  Assets
  1010  Cash in Hand
  1020  Bank Balance
  1030  eSewa Wallet Balance
  1040  Khalti Wallet Balance
  1050  Fees Receivable
  1060  TDS Receivable
  1070  Prepaid Expenses
  1500  Fixed Assets (parent)
  1590  Less: Accumulated Depreciation

2xxx  Liabilities
  2020  TDS Payable to IRD
  2040  Salary Payable
  2050  Advance from Students

3xxx  Accumulated Fund / Equity
  3100  General / Unrestricted Fund
  3200  Scholarship Fund (Restricted)
  3300  Building Construction Fund

4xxx  Income
  4100  Tuition Fee Income
  4200  Government Grant
  4400  Donations Received
  4500  Interest Income

5xxx  Expenditure
  5100  Teaching Staff Salary
  5300  Administrative Expense
  5400  Bank Charges & MSF
  5500  Depreciation
```

Seed defaults via `POST /api/billing_school/nas/chart-of-accounts/seed-defaults/`.

---

## Account Balance Computation

Account balances follow standard double-entry conventions:

- **Asset / Expenditure** accounts: `balance = total_debits − total_credits`
- **Liability / Income / Equity** accounts: `balance = total_credits − total_debits`

The `ChartOfAccount.balance` property computes this in a **single database query** (`aggregate(d=Sum('debit'), c=Sum('credit'))`) over all linked journal lines.

> **Important**: Only include accounts in financial statements through posted journal lines. `ChartOfAccount.balance` counts all lines regardless of posted status — use `JournalLine.objects.filter(entry__is_posted=True)` when aggregating for statements.

---

## Multi-Tenancy

All NAS models are tenant-scoped via `tenant = FK(core.Tenant, db_constraint=False)`. Every query in `views_nas.py` filters by `_tenant(request)` which is `request.user.tenant`.

System-seeded accounts (`is_system=True`) cannot have their `account_code` changed or be deleted.

---

## Running the Tests

```bash
cd backend
python manage.py test billing_school.tests_nas --verbosity=2
```

41 unit tests covering: TDS calculation, BS calendar, `JournalLine` validation, balance logic, MSF rates.

---

## Related Documents

- [Workflows & Business Rules](./workflows.md)
- [API Reference](./api-reference.md)
- [TDS Quick Reference](./tds-reference.md)
