# Accounting System Documentation

> NAS NPO 2018 compliant accounting for multi-tenant school LMS
> Module: `backend/billing_school/` | Updated: 2026-04-05

---

## Documents

| Document | Contents |
|---|---|
| [System Overview](./nas-accounting-system.md) | Architecture, models, COA codes, multi-tenancy, testing |
| [Workflows & Business Rules](./workflows.md) | Journal lifecycle, financial statements, TDS, depreciation, gateways |
| [API Reference](./api-reference.md) | Every endpoint with request/response examples |
| [TDS Quick Reference](./tds-reference.md) | Rate table, salary slabs, cumulative threshold examples, MSF rates |

---

## Quick Start

```bash
# 1. Seed default Chart of Accounts for a new tenant
POST /api/billing_school/nas/chart-of-accounts/seed-defaults/

# 2. Create a journal entry
POST /api/billing_school/nas/journal-entries/

# 3. Post the entry (locks it)
POST /api/billing_school/nas/journal-entries/{id}/post_entry/

# 4. View financial statements
GET  /api/billing_school/nas/financial-statements/?statement=income_expenditure
     &fiscal_year=2081/2082&from_date=2025-07-17&to_date=2026-07-15

# 5. Run annual depreciation (Celery task)
from billing_school.tasks import post_annual_depreciation
post_annual_depreciation.delay(fiscal_year='2081/2082')
```

---

## Key Constraints

- **Posted entries are immutable.** Use the `reverse` action for corrections.
- **Financial statements use posted journal lines only.** All monetary events must be journalized.
- **Voucher numbers are globally sequential per tenant** — never reset between fiscal years.
- **TDS thresholds are cumulative per vendor per fiscal year** — not per transaction.
- **FundAccount.current_balance** = `linked_account.balance` (no opening_balance addition — prevent double-counting).

---

## Running Tests

```bash
cd backend
python manage.py test billing_school.tests_nas --verbosity=2
# 41 tests: TDS calculation, BS calendar, JournalLine validation, balance logic, MSF
```
