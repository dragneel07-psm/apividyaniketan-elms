# NAS Accounting — API Reference

> Base path: `/api/billing_school/`
> Auth: All endpoints require `IsSchoolFinanceManager` permission except gateway callbacks (`AllowAny`) and BS calendar (`IsAuthenticated`).
> Last updated: 2026-04-05

---

## Chart of Accounts

### List accounts
```
GET /api/billing_school/nas/chart-of-accounts/
  ?account_type=asset|liability|equity|income|expenditure
```
Returns active accounts only (`is_active=True`), ordered by `account_code`. Balance is computed from posted journal lines.

### Get account
```
GET /api/billing_school/nas/chart-of-accounts/{account_id}/
```

### Create account
```
POST /api/billing_school/nas/chart-of-accounts/
{
  "account_code": "4150",       // required, unique per tenant
  "name": "Lab Fee Income",     // required
  "account_type": "income",     // required: asset|liability|equity|income|expenditure
  "sub_type": "fee_income",     // optional
  "name_np": "प्रयोगशाला शुल्क", // optional
  "description": ""             // optional
}
```

### Update account
```
PUT /api/billing_school/nas/chart-of-accounts/{account_id}/
```
Updatable fields: `name`, `name_np`, `sub_type`, `description`, `is_active`.
System accounts (`is_system=True`) cannot have `account_code` changed.

### Delete account
```
DELETE /api/billing_school/nas/chart-of-accounts/{account_id}/
```
Returns `400` if the account has journal lines (`ProtectedError`).
Returns `400` if `is_system=True`.
Prefer deactivating (`is_active=False`) over deletion.

### Seed default COA
```
POST /api/billing_school/nas/chart-of-accounts/seed-defaults/
```
Idempotent — creates only accounts that don't already exist. Returns count of newly created accounts.

---

## Journal Entries

### List entries (paginated)
```
GET /api/billing_school/nas/journal-entries/
  ?page=1
  &page_size=50               // default 50, max 200
  &entry_type=fee_receipt|expense|gateway_msf|tds_deduction|tds_deposit|
              payroll|depreciation|fund_transfer|opening|manual
  &fiscal_year=2081/2082
  &from_date=2025-07-17       // AD format YYYY-MM-DD
  &to_date=2026-07-15
```

Response:
```json
{
  "count": 1250,
  "page": 1,
  "page_size": 50,
  "results": [
    {
      "entry_id": "uuid",
      "entry_number": "JV-2081-00042",
      "date_ad": "2025-09-15",
      "date_bs": "2082-05-29",
      "fiscal_year": "2082/2083",
      "description": "...",
      "entry_type": "fee_receipt",
      "reference": "RCP-00123",
      "is_posted": true,
      "narration": "...",
      "created_by": "Ram Shrestha",
      "lines": [
        {
          "line_id": "uuid",
          "account_id": "uuid",
          "account_code": "1020",
          "account_name": "Bank Balance",
          "debit": 5000.0,
          "credit": 0.0,
          "narration": "Bank deposit"
        }
      ]
    }
  ]
}
```

### Get entry
```
GET /api/billing_school/nas/journal-entries/{entry_id}/
```

### Create entry
```
POST /api/billing_school/nas/journal-entries/
{
  "date_ad": "2026-04-05",          // required
  "description": "Rent payment",    // required
  "entry_type": "manual",           // optional, default "manual"
  "reference": "CHQ-0042",          // optional, cheque/voucher/txn ref
  "narration": "Monthly office rent", // optional
  "lines": [                        // required, min 2 lines
    { "account_id": "uuid", "debit": 30000, "credit": 0, "narration": "Rent expense" },
    { "account_id": "uuid", "debit": 0, "credit": 30000, "narration": "Bank payment" }
  ]
}
```

**Rules:**
- Each line: `debit` and `credit` cannot both be > 0; neither can be negative.
- Entry is created unposted; use the `post_entry` action to lock it.
- `entry_number` is assigned atomically (format: `JV-{BS_YEAR}-{SEQ:05d}`).

### Post entry
```
POST /api/billing_school/nas/journal-entries/{entry_id}/post_entry/
```
Validates `sum(debits) == sum(credits)`, then sets `is_posted=True`. Entry becomes immutable.

### Reverse a posted entry
```
POST /api/billing_school/nas/journal-entries/{entry_id}/reverse/
{
  "date_ad": "2026-04-06",              // optional, defaults to today
  "description": "Reversal — error"     // optional
}
```
Creates a new posted entry with all debit/credit lines swapped. Only works on posted entries. Returns the new reversal entry. Both the original and reversal appear in the audit trail.

---

## Fund Accounts

### List funds
```
GET /api/billing_school/nas/fund-accounts/
```
Returns active funds with `opening_balance` and `current_balance`.
`current_balance` = `linked_account.balance` (if COA linked) or `opening_balance`.

### Create fund
```
POST /api/billing_school/nas/fund-accounts/
{
  "name": "Science Lab Fund",
  "name_np": "विज्ञान प्रयोगशाला कोष",
  "fund_type": "restricted",          // unrestricted|restricted|endowment
  "purpose": "Equipment purchase for lab",
  "donor": "World Bank",
  "opening_balance": "250000.00"
}
```

Link to a COA account via `PUT` after creation to enable journal-based balance tracking.

---

## TDS Register

### List TDS entries
```
GET /api/billing_school/nas/tds/
  ?fiscal_year=2081/2082
  &is_deposited=true|false
```

### Create TDS entry
```
POST /api/billing_school/nas/tds/
{
  "vendor_name": "ABC Construction",   // required
  "pan_number": "123456789",           // optional
  "payment_type": "vendor_contract",   // required (see TDS rates table)
  "payment_date": "2026-04-05",        // required
  "gross_amount": "80000.00"           // required
}
```
TDS is auto-calculated using cumulative fiscal-year payments to this vendor. `tds_amount` and `net_amount` are returned in the response.

### Preview TDS (no save)
```
POST /api/billing_school/nas/tds/calculate/
{
  "gross_amount": "30000.00",
  "payment_type": "vendor_supply"
}
```
Returns calculation without creating a record.

### Fiscal year summary
```
GET /api/billing_school/nas/tds/summary/
  ?fiscal_year=2081/2082
```
Returns `total_tds`, `deposited_tds`, `pending_tds`, and breakdown by `payment_type`.

### Mark deposited
```
POST /api/billing_school/nas/tds/{tds_id}/mark-deposited/
{
  "deposit_date": "2026-04-10",
  "deposit_ref": "IRD-CHALLAN-2026-0042"
}
```
Sets `is_deposited=True`. Emits `billing.tds_marked_deposited` audit event.

---

## Inventory (Assets Register)

### List items
```
GET /api/billing_school/nas/inventory/
  ?form_type=401|403|405
  &category=furniture|equipment|computer|vehicle|building|library_book|sports|consumable|other
  &condition=good|fair|poor|condemned
```

### Create item
```
POST /api/billing_school/nas/inventory/
{
  "name": "Dell Laptop",             // required
  "category": "computer",            // required
  "form_type": "401",                // default 401 (capital asset)
  "quantity": 5,
  "unit": "pcs",
  "purchase_date": "2025-08-01",     // required
  "purchase_price": "95000.00",      // required, per unit
  "supplier": "IT Solutions Pvt Ltd",
  "depreciation_method": "straight_line",  // straight_line|diminishing|none
  "useful_life_years": 5,
  "nepali_dep_rate": "25.00",        // rate % per Nepal Govt schedule
  "location": "Computer Lab A",
  "custodian": "Hari Bahadur",
  "condition": "good"
}
```

### Annual depreciation schedule
```
GET /api/billing_school/nas/inventory/depreciation-schedule/
```
Returns all Form-401 active assets with `purchase_price`, `accumulated_dep`, `book_value`, `annual_dep`. Includes `total_annual_dep` for the full inventory.

---

## Financial Statements

### Query statements
```
GET /api/billing_school/nas/financial-statements/
  ?statement=income_expenditure    // or balance_sheet|cash_flow|changes_in_reserves
  &from_date=2025-07-17
  &to_date=2026-07-15
  &fiscal_year=2081/2082
```

All statements are sourced from **posted journal lines only** (`"source": "journal_entries"` in response).

#### Income & Expenditure (`?statement=income_expenditure`)
```json
{
  "statement": "income_expenditure",
  "fiscal_year": "2081/2082",
  "data": {
    "income": {
      "fee_income": 1250000.0,
      "government_grant": 50000.0,
      "donations": 25000.0,
      "other_income": 5000.0,
      "total": 1330000.0
    },
    "expenditure": {
      "staff_salary": 720000.0,
      "programme": 85000.0,
      "administration": 95000.0,
      "bank_charges_msf": 12500.0,
      "depreciation": 45000.0,
      "tax_expense": 0.0,
      "other": 8000.0,
      "total": 965500.0
    },
    "surplus_deficit": 364500.0,
    "label_surplus": "Surplus",
    "source": "journal_entries"
  }
}
```

#### Balance Sheet (`?statement=balance_sheet`)
Assets, liabilities, and accumulated fund as of `to_date`. Includes `balanced` boolean flag.

#### Cash Flow — Direct Method (`?statement=cash_flow`)
Operating, investing (date-filtered asset purchases), and financing activities.

#### Changes in Reserves (`?statement=changes_in_reserves`)
Per-fund opening balance, additions, utilised, and closing balance for the fiscal year.

---

## BS Calendar Utility

### Today in BS
```
GET /api/billing_school/nas/bs-calendar/?action=today
```

### Convert AD → BS
```
GET /api/billing_school/nas/bs-calendar/?action=ad_to_bs&date=2026-04-05
```

Response includes `bs_year`, `bs_month`, `bs_day`, `bs_date_str`, `bs_month_name_en`, `fiscal_year`.

---

## Payment Gateways

### eSewa
```
POST /api/billing_school/esewa/initiate/
{ "student_fee_id": "uuid" }

GET  /api/billing_school/esewa/callback/   // AllowAny — called by eSewa
```

### Khalti
```
POST /api/billing_school/khalti/initiate/
{ "student_fee_id": "uuid" }

GET  /api/billing_school/khalti/callback/  // AllowAny — called by Khalti
```

### ConnectIPS
```
POST /api/billing_school/connectips/initiate/
{ "student_fee_id": "uuid" }

GET  /api/billing_school/connectips/callback/  // AllowAny — called by ConnectIPS
```

All gateway callbacks auto-create a `Payment` record and a `MerchantServiceFee` record on success.

---

## Error Responses

| HTTP Status | Meaning |
|---|---|
| `400` | Validation error (unbalanced entry, negative amounts, system account constraint, etc.) |
| `400` | Trying to reverse an unposted entry |
| `400` | Trying to delete a COA account that has journal lines |
| `400` | Trying to post an already-posted entry |
| `404` | Resource not found or belongs to another tenant |
| `403` | User does not have `IsSchoolFinanceManager` permission |
