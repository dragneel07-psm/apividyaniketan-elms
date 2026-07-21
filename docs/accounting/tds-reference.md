# TDS Quick Reference — Nepal IRD

> Income Tax Act 2058 | Rates current for FY 2081/82
> Last updated: 2026-04-05

---

## TDS Rates at a Glance

| `payment_type` | Rate | Threshold | IRD Section | Notes |
|---|---|---|---|---|
| `vendor_supply` | 1.5% | NPR 50,000 / FY / vendor | Section 88(1) | Cumulative per vendor |
| `vendor_contract` | 1.5% | NPR 50,000 / FY / vendor | Section 88(1) | Cumulative per vendor |
| `rent` | 10.0% | None | Section 88(3) | From first paisa |
| `professional_fee` | 15.0% | None | Section 88(2) | Consultancy, advisory |
| `commission` | 15.0% | None | Section 88(2) | |
| `interest` | 15.0% | None | Section 88(4) | |
| `dividend` | 5.0% | None | Section 88(5) | |
| `salary` | Slab | NPR 5,00,000 / year | Section 87 | Monthly = annual ÷ 12 |

---

## Salary Income Tax Slabs (FY 2081/82, Individual)

| Annual Taxable Income | Marginal Rate |
|---|---|
| Up to NPR 5,00,000 | 1% |
| NPR 5,00,001 – 7,00,000 | 10% |
| NPR 7,00,001 – 10,00,000 | 20% |
| NPR 10,00,001 – 20,00,000 | 30% |
| Above NPR 20,00,000 | 36% |

**Monthly TDS = annual income tax ÷ 12**

### Example — Monthly salary NPR 85,000 (Annual NPR 10,20,000)
```
Up to 5,00,000        × 1%   =   5,000
5,00,001–7,00,000     × 10%  =  20,000
7,00,001–10,00,000    × 20%  =  60,000
10,00,001–10,20,000   × 30%  =   6,000
─────────────────────────────────────────
Annual tax                   =  91,000
Monthly TDS                  =   7,583.33  ≈  NPR 7,583
```

---

## Cumulative Threshold (Vendor Supply & Contract)

The NPR 50,000 threshold is per **vendor** per **fiscal year**, not per payment.

| Scenario | Prior FY Payments | Current Payment | Taxable Amount | TDS @ 1.5% |
|---|---|---|---|---|
| First payment, below threshold | 0 | 40,000 | 0 | 0 |
| Second payment, crosses threshold | 40,000 | 30,000 | 20,000\* | 300 |
| Third payment, fully above threshold | 70,000 | 20,000 | 20,000 | 300 |

\* Only the portion above the threshold (70,000 − 50,000 = 20,000) is newly taxable.

---

## Merchant Service Fees (MSF)

Payment gateway charges deducted from gross receipts:

| Gateway | Default MSF Rate | Notes |
|---|---|---|
| eSewa | 1.5% | Indicative — check merchant agreement |
| Khalti | 2.0% | Indicative — check merchant agreement |
| ConnectIPS | 0.5% | Bank-to-bank transfer |

MSF is auto-calculated and creates a `MerchantServiceFee` record on every gateway payment callback.

**Journal entry for MSF:**
```
Dr  5410/5420/5430  MSF Expense Account    NPR X
    Cr  1030/1040   Gateway Wallet Balance  NPR X
```

---

## TDS Deposit to IRD

1. View pending deposits: `GET /api/billing_school/nas/tds/?is_deposited=false`
2. Mark as deposited after payment to IRD bank: `POST /api/billing_school/nas/tds/{id}/mark-deposited/`
3. Check fiscal year summary: `GET /api/billing_school/nas/tds/summary/?fiscal_year=2081/2082`

**Compliance note**: TDS must be deposited to IRD by the 25th of the following month (for withholding agents). Late deposit attracts interest and penalties under Section 117 of the Income Tax Act 2058.

---

## COA Accounts for TDS

| Account | Code | Type |
|---|---|---|
| TDS Payable to IRD | 2020 | Liability / `tds_payable` |
| TDS Receivable | 1060 | Asset / `receivable` |

**When deducting TDS from a vendor payment:**
```
Dr  Expense Account (5xxx)        NPR Gross
    Cr  2020 TDS Payable to IRD   NPR TDS Amount
    Cr  Bank / Cash               NPR Net Amount
```

**When depositing TDS to IRD:**
```
Dr  2020 TDS Payable to IRD       NPR TDS Amount
    Cr  Bank Balance (1020)       NPR TDS Amount
```
