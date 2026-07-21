# NAS Accounting — Workflows & Business Rules

> **Last updated**: 2026-04-05 (post QA audit)

---

## 1. Journal Entry Lifecycle

### 1.1 Creation

```
POST /api/billing_school/nas/journal-entries/
{
  "date_ad": "2026-04-05",
  "description": "Tuition fee receipt — Ram Shrestha",
  "entry_type": "fee_receipt",
  "reference": "RCP-00123",
  "lines": [
    { "account_id": "<1020-uuid>", "debit": 5000, "credit": 0, "narration": "Bank deposit" },
    { "account_id": "<4100-uuid>", "debit": 0, "credit": 5000, "narration": "Tuition fee income" }
  ]
}
```

**Validation rules enforced at creation:**
- Minimum 2 lines required.
- Each `JournalLine` is validated via `full_clean()` before saving:
  - Debit and credit cannot both be > 0 on the same line.
  - Neither debit nor credit can be negative.
- `date_bs` and `fiscal_year` are auto-computed from `date_ad` and stored on save.

**Voucher number generation** (`entry_number`) is atomic:
1. `SELECT ... FOR UPDATE` locks all existing entries for this tenant.
2. `MAX(entry_number)` extracts the last sequence number via regex `r'-(\d+)$'`.
3. New entry is created with `entry_number = f"JV-{bs_year}-{seq+1:05d}"`.
4. Transaction commits — no other concurrent request can read the same MAX until after commit.

This guarantees unique, sequential voucher numbers under concurrent load. The database enforces uniqueness via `UniqueConstraint(fields=['tenant','entry_number'], condition=~Q(entry_number=''))`.

### 1.2 Posting

```
POST /api/billing_school/nas/journal-entries/{id}/post_entry/
```

- Checks `debits == credits` (entry must balance exactly).
- Sets `is_posted = True`. The entry is now **immutable**.
- Emits `billing.journal_entry_posted` audit event.

### 1.3 Reversal (Corrections)

NAS compliance requires corrections via **reversal entries**, never by editing or deleting posted entries.

```
POST /api/billing_school/nas/journal-entries/{id}/reverse/
{
  "date_ad": "2026-04-06",           // optional; defaults to today
  "description": "Reversal — wrong amount posted"  // optional
}
```

**What happens:**
1. Validates that the original entry is posted (only posted entries can be reversed).
2. Creates a new `JournalEntry` with all debit/credit amounts **swapped** (Dr→Cr, Cr→Dr).
3. Sets `entry_type='manual'` and `reference=<original_entry_number>` for traceability.
4. Immediately posts the reversal entry.
5. Emits `billing.journal_entry_reversed` audit event with both entry IDs.

The original entry remains untouched. Both appear in the audit trail.

**You cannot reverse an unposted entry** — post it first, or simply delete it (unposted entries have no ledger effect).

---

## 2. Financial Statements

All four NAS-required statements are generated from **posted journal lines only**. The raw `Payment` and `Expense` tables are not used.

```
GET /api/billing_school/nas/financial-statements/
  ?statement=income_expenditure|balance_sheet|cash_flow|changes_in_reserves
  &from_date=2025-07-17        # AD date (Shrawan 1, 2082)
  &to_date=2026-07-15          # AD date (Ashadh 30, 2082)
  &fiscal_year=2082/2083
```

### 2.1 Income & Expenditure (NAS §5)

- Groups journal lines by `account.sub_type` for posted entries in the date range.
- Income categories: `fee_income`, `grant_income`, `donation_income`, `other_income`.
- Expenditure categories: `staff_expense`, `program_expense`, `admin_expense`, `bank_charge`, `depreciation`, `tax_expense`.
- Surplus/Deficit = Total Income − Total Expenditure.
- Response includes `"source": "journal_entries"`.

**Prerequisite**: All income and expenditure must be journalized. Fee receipts auto-post via the payment gateway callbacks. Manual income (grants, donations) requires a manual journal entry against accounts `4200`–`4900`.

### 2.2 Balance Sheet (NAS §4)

- Groups journal lines by `account.account_type` and `account.sub_type` for all posted entries up to `to_date`.
- Assets: `cash_equivalent` + `receivable` + `current_asset` + `fixed_asset`.
- Liabilities: `tds_payable` + `current_liability` + `long_term_liability`.
- Accumulated Fund: sum of equity-type account balances.
- `balanced` flag: `|total_assets − (total_liabilities + accumulated_fund)| < 0.01`.

### 2.3 Cash Flow — Direct Method (NAS §6)

- Operating inflows: fee receipts from `Payment` table (date-filtered).
- Operating outflows: expenses (by category), MSF (date-filtered by payment date), TDS deposits.
- **Investing activities**: asset purchases from `InventoryItem.purchase_date` — date-filtered to the statement period.
- Financing activities: grants and loan repayments (currently requires manual journalizing; shown as 0 until linked).

### 2.4 Changes in Reserves (NAS §7)

Derives real figures from posted journal lines for the fiscal year:

- **Restricted funds**: `additions` = credit lines on the fund's linked COA account; `utilised` = debit lines.
- **Unrestricted funds**: `surplus_for_year` = net of all income and expenditure journal lines for the fiscal year.
- `closing_balance` = `FundAccount.current_balance` (from `linked_account.balance`).

**Setup required**: Each `FundAccount` should have a `linked_account` pointing to the corresponding equity account (e.g., account `3200` for the Scholarship Fund). Without this linkage, additions/utilised will show as 0.

---

## 3. TDS Workflow

### 3.1 Cumulative Threshold Rule (IRD Nepal)

The NPR 50,000 threshold for `vendor_supply` and `vendor_contract` is **cumulative per vendor per fiscal year**, not per individual transaction.

**How the system enforces this:**

When creating a TDS entry via `POST /api/billing_school/nas/tds/`, the view:
1. Looks up all prior payments to the same `vendor_name` with the same `payment_type` in the current fiscal year.
2. Passes `prior_payments_fy` to `calculate_tds()`.
3. `calculate_tds()` evaluates the threshold cumulatively:
   - `cumulative = prior_payments_fy + gross_amount`
   - If `cumulative ≤ threshold`: not applicable.
   - If `prior < threshold < cumulative`: TDS applies only on `cumulative − threshold`.
   - If `prior ≥ threshold`: TDS applies on full `gross_amount`.

**Example:**
```
Vendor: ABC Supplies | FY: 2082/2083 | threshold: NPR 50,000

Payment 1: NPR 40,000 → cumulative 40,000 → below threshold → TDS: 0
Payment 2: NPR 30,000 → cumulative 70,000 → crosses threshold
           → taxable portion = 70,000 − 50,000 = 20,000
           → TDS = 20,000 × 1.5% = NPR 300

Payment 3: NPR 20,000 → cumulative 90,000 → fully above threshold
           → TDS = 20,000 × 1.5% = NPR 300
```

### 3.2 TDS Rates (Nepal IRD, Income Tax Act 2058)

| Payment Type | Rate | Threshold | Section |
|---|---|---|---|
| `vendor_supply` | 1.5% | NPR 50,000/year/vendor | Section 88(1) |
| `vendor_contract` | 1.5% | NPR 50,000/year/vendor | Section 88(1) |
| `rent` | 10.0% | None (from first paisa) | Section 88(3) |
| `professional_fee` | 15.0% | None | Section 88(2) |
| `commission` | 15.0% | None | Section 88(2) |
| `interest` | 15.0% | None | Section 88(4) |
| `dividend` | 5.0% | None | Section 88(5) |
| `salary` | Slab-based | See slabs below | Section 87 |

**Salary slabs (Individual, FY 2081/82, annual taxable):**

| Annual Taxable Income | Rate |
|---|---|
| Up to NPR 5,00,000 | 1% |
| NPR 5,00,001 – 7,00,000 | 10% |
| NPR 7,00,001 – 10,00,000 | 20% |
| NPR 10,00,001 – 20,00,000 | 30% |
| Above NPR 20,00,000 | 36% |

> Salary TDS is calculated on a monthly basis: `annual_tax / 12`.

### 3.3 Preview Without Saving

```
POST /api/billing_school/nas/tds/calculate/
{ "gross_amount": 30000, "payment_type": "vendor_supply" }
```

Returns `applicable`, `rate`, `tds_amount`, `net_amount`, `section`, `description`. Does not create a record.

### 3.4 Mark TDS Deposited

```
POST /api/billing_school/nas/tds/{id}/mark-deposited/
{ "deposit_date": "2026-04-10", "deposit_ref": "IRD-CHALLAN-2026-0042" }
```

Sets `is_deposited=True`, records date and IRD reference. Emits `billing.tds_marked_deposited` audit event.

---

## 4. Depreciation Workflow

### 4.1 Manual — Depreciation Schedule

View the annual depreciation schedule for all active capital assets:

```
GET /api/billing_school/nas/inventory/depreciation-schedule/
```

Returns per-asset: purchase price, accumulated depreciation, current book value, annual depreciation amount, method, useful life.

### 4.2 Methods

| Method | Formula |
|---|---|
| Straight Line (SLM) | `purchase_price × quantity / useful_life_years` |
| Diminishing Balance (DBM) | `current_book_value × nepali_dep_rate / 100` |
| None | NPR 0 (land, consumables) |

### 4.3 Auto-Posting via Celery Task

The `post_annual_depreciation` task creates and posts a depreciation journal entry for all tenants:

```python
# Triggered manually or via Celery Beat (run once per fiscal year)
from billing_school.tasks import post_annual_depreciation

post_annual_depreciation.delay(fiscal_year='2081/2082')
# or omit fiscal_year to default to the current year
```

**What it does per tenant:**
1. Checks if a posted `depreciation` entry already exists for the fiscal year — skips if yes (idempotent).
2. Sums `annual_depreciation()` for all active Form-401 assets with `condition` in `good/fair/poor`.
3. Creates and posts a journal entry:
   ```
   Dr  5500  Depreciation Expense          NPR X
       Cr  1590  Accumulated Depreciation  NPR X
   ```
4. Increments `accumulated_depreciation` on each asset.

**Prerequisites**: Accounts `5500` (Depreciation) and `1590` (Accumulated Depreciation) must exist in the COA. These are created by `seed-defaults`.

**Recommended Celery Beat schedule**: Run annually at start of Shrawan (mid-July) for the closing fiscal year.

---

## 5. Payment Gateway & MSF Workflow

### 5.1 Supported Gateways

| Gateway | Initiate | Callback | Default MSF Rate |
|---|---|---|---|
| eSewa | `POST /esewa/initiate/` | `GET /esewa/callback/` | 1.5% |
| Khalti | `POST /khalti/initiate/` | `GET /khalti/callback/` | 2.0% |
| ConnectIPS | `POST /connectips/initiate/` | `GET /connectips/callback/` | 0.5% |

MSF rates are indicative defaults. Actual rates depend on merchant agreement.

### 5.2 Callback Flow

```
Student pays → Gateway → Callback URL (AllowAny)
                              │
                              ▼ Signature verification
                         _record_payment()
                              │
                              ├── Creates Payment record
                              ├── Updates StudentFee status
                              └── MerchantServiceFee.get_or_create()
                                       │
                                       ▼ (auto-posts journal if COA linked)
                              Dr  Cash/eSewa account
                              Cr  Fees Receivable
                                  +
                              Dr  MSF Expense account
                              Cr  Cash/eSewa account
```

### 5.3 Fund Account — Balance Calculation

`FundAccount.current_balance` returns:
- `linked_account.balance` if a COA account is linked (journal-based, no double-counting).
- `opening_balance` as fallback if no COA linked.

> **Setup rule**: When a fund account has a `linked_account`, the opening balance must be recorded as an `opening` journal entry (entry_type='opening') against that account. Do not rely on the `opening_balance` field for accounts with a journal linkage.

---

## 6. Voucher Numbering Reference

Format: `JV-{BS_YEAR}-{SEQ:05d}`

| Example | Meaning |
|---|---|
| `JV-2081-00001` | First entry of any BS year 2081 |
| `JV-2082-00042` | 42nd entry (the sequence is global per tenant, not per year) |

The sequence counter is a running global maximum per tenant — it never resets between fiscal years. This ensures globally unique voucher numbers even when entries span multiple BS years.

---

## 7. Journal Entry List — Pagination

The journal entry list endpoint supports pagination to handle large datasets:

```
GET /api/billing_school/nas/journal-entries/
  ?page=1&page_size=50        # default: page=1, page_size=50
  &entry_type=fee_receipt
  &fiscal_year=2081/2082
  &from_date=2025-07-17
  &to_date=2026-07-15
```

Response shape:
```json
{
  "count": 1250,
  "page": 1,
  "page_size": 50,
  "results": [ ... ]
}
```

Maximum `page_size` is 200. Requests with `page_size > 200` are capped.

---

## 8. Audit Trail

Every write operation emits an audit event via `record_audit_event()`:

| Event | Trigger |
|---|---|
| `billing.coa_created` | New COA account created |
| `billing.journal_entry_created` | Journal entry created |
| `billing.journal_entry_posted` | Entry posted (locked) |
| `billing.journal_entry_reversed` | Reversal entry created |
| `billing.tds_entry_created` | TDS entry recorded |
| `billing.tds_marked_deposited` | TDS deposit to IRD marked |
| `billing.inventory_created` | Inventory item added |

Audit events are stored in `core.AuditLog` and are queryable by admin users.
