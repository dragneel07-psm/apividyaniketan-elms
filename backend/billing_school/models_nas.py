# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
NAS (Nepal Accounting Standards) for NPOs 2018 — accounting models.

Implements:
  - Double-entry Chart of Accounts with NAS codes
  - Journal Entry / Journal Line (immutable once posted)
  - Fund Account (Restricted / Unrestricted pots)
  - TDS Entry register
  - Inventory / Jinshi (Form 401/403/405)
  - Merchant Service Fee auto-post record
"""

import uuid as uuid_lib
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

# ─────────────────────────────────────────────────────────────────────────────
# 1. Chart of Accounts
# ─────────────────────────────────────────────────────────────────────────────


class ChartOfAccount(models.Model):
    """
    NAS-compliant chart of accounts for Nepali schools / NPOs.
    Account codes follow standard NAS classification:
      1xxx = Assets   2xxx = Liabilities   3xxx = Accumulated Fund / Equity
      4xxx = Income   5xxx = Expenditure
    """

    ACCOUNT_TYPES = [
        ("asset", "Asset (सम्पत्ति)"),
        ("liability", "Liability (दायित्व)"),
        ("equity", "Accumulated Fund (सञ्चित कोष)"),
        ("income", "Income (आय)"),
        ("expenditure", "Expenditure (खर्च)"),
    ]
    SUB_TYPES = [
        # Assets
        ("current_asset", "Current Asset"),
        ("fixed_asset", "Fixed / Non-current Asset"),
        ("cash_equivalent", "Cash & Cash Equivalent"),
        ("receivable", "Receivable"),
        # Liabilities
        ("current_liability", "Current Liability"),
        ("long_term_liability", "Long-term Liability"),
        ("tds_payable", "TDS Payable"),
        # Equity
        ("accumulated_fund", "Accumulated Fund"),
        ("restricted_fund", "Restricted Fund"),
        ("unrestricted_fund", "Unrestricted Fund"),
        # Income
        ("fee_income", "Fee Income"),
        ("grant_income", "Government / Donor Grant"),
        ("donation_income", "Donation / Voluntary"),
        ("other_income", "Other Income"),
        # Expenditure
        ("staff_expense", "Staff Salary & Benefits"),
        ("admin_expense", "Administration Expense"),
        ("program_expense", "Programme / Academic Expense"),
        ("depreciation", "Depreciation"),
        ("bank_charge", "Bank Charge / MSF"),
        ("tax_expense", "Tax / TDS Expense"),
        ("other_expense", "Other Expenditure"),
    ]

    account_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="chart_of_accounts",
        db_constraint=False,
    )
    account_code = models.CharField(max_length=10, help_text="e.g. 1010, 4100, 5010")
    name = models.CharField(max_length=120)
    name_np = models.CharField(max_length=120, blank=True, help_text="Nepali name")
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    sub_type = models.CharField(max_length=25, choices=SUB_TYPES, blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        db_constraint=False,
    )
    is_system = models.BooleanField(
        default=False, help_text="System accounts cannot be deleted"
    )
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["account_code"]
        unique_together = [("tenant", "account_code")]
        indexes = [
            models.Index(fields=["tenant", "account_type"], name="coa_tenant_type_idx"),
        ]

    def __str__(self):
        return f"{self.account_code} – {self.name}"

    @property
    def balance(self) -> Decimal:
        """Net balance: debit-normal for assets/expenditure, credit-normal for others."""
        from django.db.models import Sum

        agg = self.journal_lines.aggregate(d=Sum("debit"), c=Sum("credit"))
        debits = agg["d"] or Decimal("0")
        credits = agg["c"] or Decimal("0")
        if self.account_type in ("asset", "expenditure"):
            return debits - credits
        return credits - debits


# ─────────────────────────────────────────────────────────────────────────────
# 2. Journal Entry (immutable once posted — NAS audit requirement)
# ─────────────────────────────────────────────────────────────────────────────


class JournalEntry(models.Model):
    ENTRY_TYPES = [
        ("fee_receipt", "Fee Receipt"),
        ("expense", "Expense Payment"),
        ("gateway_msf", "Gateway MSF Auto-post"),
        ("tds_deduction", "TDS Deduction"),
        ("tds_deposit", "TDS Deposit to IRD"),
        ("payroll", "Payroll"),
        ("depreciation", "Depreciation"),
        ("fund_transfer", "Fund Transfer"),
        ("opening", "Opening Balance"),
        ("manual", "Manual Journal"),
    ]

    entry_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="journal_entries",
        db_constraint=False,
    )
    entry_number = models.CharField(
        max_length=20,
        blank=True,
        help_text="Auto-generated voucher number e.g. JV-2081-00042",
    )
    date_ad = models.DateField(help_text="Gregorian date (system timestamp)")
    date_bs = models.CharField(
        max_length=10,
        blank=True,
        help_text="BS date string YYYY-MM-DD (e.g. 2081-04-15)",
    )
    fiscal_year = models.CharField(
        max_length=10, blank=True, help_text="Nepali fiscal year e.g. 2080/2081"
    )
    description = models.CharField(max_length=300)
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPES, default="manual")
    reference = models.CharField(
        max_length=100, blank=True, help_text="Voucher no, cheque no, txn ID"
    )
    is_posted = models.BooleanField(
        default=False, help_text="Once posted, lines cannot be edited"
    )
    narration = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="journal_entries_created",
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_ad", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "date_ad"], name="je_tenant_date_idx"),
            models.Index(fields=["tenant", "entry_type"], name="je_tenant_type_idx"),
        ]
        constraints = [
            # Prevent duplicate voucher numbers per tenant (L6 + C1 guard)
            models.UniqueConstraint(
                fields=["tenant", "entry_number"],
                condition=~models.Q(entry_number=""),
                name="je_tenant_entry_number_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.entry_number or self.entry_id} | {self.date_ad} | {self.description[:50]}"

    def save(self, *args, **kwargs):
        # Always recompute BS date/fiscal year from date_ad so stale values can't persist (L3)
        if self.date_ad:
            from billing_school.utils_bs_calendar import bs_date_str, fiscal_year_bs

            self.date_bs = bs_date_str(self.date_ad)
            self.fiscal_year = fiscal_year_bs(self.date_ad)
        super().save(*args, **kwargs)

    def is_balanced(self) -> bool:
        from django.db.models import Sum

        lines = self.lines.all()
        total_debit = lines.aggregate(s=Sum("debit"))["s"] or Decimal("0")
        total_credit = lines.aggregate(s=Sum("credit"))["s"] or Decimal("0")
        return total_debit == total_credit

    def post(self) -> None:
        """Post entry after balance check. Raises ValidationError if unbalanced."""
        if not self.is_balanced():
            raise ValidationError("Journal entry is not balanced (debits ≠ credits).")
        self.is_posted = True
        self.save(update_fields=["is_posted"])


class JournalLine(models.Model):
    line_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name="lines",
        db_constraint=False,
    )
    account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.PROTECT,
        related_name="journal_lines",
        db_constraint=False,
    )
    debit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    narration = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["entry", "account"], name="jl_entry_account_idx"),
        ]

    def clean(self):
        if self.debit < 0 or self.credit < 0:
            raise ValidationError("Debit and credit amounts must be non-negative.")
        if self.debit > 0 and self.credit > 0:
            raise ValidationError(
                "A journal line cannot have both debit and credit amounts."
            )

    def __str__(self):
        side = f"Dr {self.debit}" if self.debit else f"Cr {self.credit}"
        return f"{self.account.account_code} | {side}"


# ─────────────────────────────────────────────────────────────────────────────
# 3. Fund Account (Restricted / Unrestricted pots — NAS NPO 2018 Section 8)
# ─────────────────────────────────────────────────────────────────────────────


class FundAccount(models.Model):
    FUND_TYPES = [
        ("unrestricted", "Unrestricted Fund (General)"),
        ("restricted", "Restricted Fund (Donor/Govt)"),
        ("endowment", "Endowment Fund"),
    ]

    fund_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="fund_accounts",
        db_constraint=False,
    )
    name = models.CharField(max_length=120)
    name_np = models.CharField(max_length=120, blank=True)
    fund_type = models.CharField(
        max_length=15, choices=FUND_TYPES, default="unrestricted"
    )
    purpose = models.TextField(
        blank=True, help_text="Purpose/restriction from donor or government"
    )
    donor = models.CharField(max_length=120, blank=True)
    linked_account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fund_account",
        db_constraint=False,
        help_text="Chart of Account representing this fund",
    )
    opening_balance = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["fund_type", "name"]

    def __str__(self):
        return f"{self.get_fund_type_display()} – {self.name}"

    @property
    def current_balance(self) -> Decimal:
        """Return balance from the linked COA account, or opening_balance as fallback.

        opening_balance should be recorded as an 'opening' journal entry so that
        linked_account.balance already includes it — avoids double-counting (H5).
        """
        if self.linked_account:
            return self.linked_account.balance
        return self.opening_balance


# ─────────────────────────────────────────────────────────────────────────────
# 4. TDS Entry Register
# ─────────────────────────────────────────────────────────────────────────────


class TDSEntry(models.Model):
    PAYMENT_TYPES = [
        ("vendor_supply", "Vendor / Supply Contract"),
        ("vendor_contract", "Service / Works Contract"),
        ("rent", "Rent"),
        ("professional_fee", "Professional / Consultancy"),
        ("commission", "Commission"),
        ("salary", "Salary (Payroll)"),
        ("interest", "Interest"),
        ("dividend", "Dividend"),
    ]

    tds_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="tds_entries",
        db_constraint=False,
    )
    vendor_name = models.CharField(max_length=150)
    pan_number = models.CharField(
        max_length=20, blank=True, help_text="PAN / VAT registration number"
    )
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES)
    payment_date = models.DateField()
    date_bs = models.CharField(max_length=10, blank=True)
    fiscal_year = models.CharField(max_length=10, blank=True)
    gross_amount = models.DecimalField(max_digits=14, decimal_places=2)
    tds_rate = models.DecimalField(
        max_digits=5, decimal_places=2, help_text="TDS rate (%)"
    )
    tds_amount = models.DecimalField(max_digits=14, decimal_places=2)
    net_amount = models.DecimalField(max_digits=14, decimal_places=2)
    tds_section = models.CharField(
        max_length=30, blank=True, help_text="e.g. Section 88(1)"
    )
    is_deposited = models.BooleanField(
        default=False, help_text="Has TDS been deposited to IRD?"
    )
    deposit_date = models.DateField(null=True, blank=True)
    deposit_ref = models.CharField(
        max_length=100, blank=True, help_text="IRD bank challan / receipt reference"
    )
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tds_entries",
        db_constraint=False,
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date"]
        indexes = [
            models.Index(fields=["tenant", "payment_date"], name="tds_tenant_date_idx"),
            models.Index(fields=["tenant", "fiscal_year"], name="tds_tenant_fy_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.payment_date and not self.date_bs:
            from billing_school.utils_bs_calendar import bs_date_str, fiscal_year_bs

            self.date_bs = bs_date_str(self.payment_date)
            self.fiscal_year = fiscal_year_bs(self.payment_date)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"TDS {self.tds_amount} from {self.vendor_name} | {self.payment_date}"


# ─────────────────────────────────────────────────────────────────────────────
# 5. Inventory / Jinshi (Form 401 – Capital Assets, 403 – Consumables, 405 – Condemned)
# ─────────────────────────────────────────────────────────────────────────────


class InventoryItem(models.Model):
    CATEGORIES = [
        ("furniture", "Furniture & Fixtures"),
        ("equipment", "Office / Lab Equipment"),
        ("computer", "Computer & IT Assets"),
        ("vehicle", "Vehicle"),
        ("building", "Building / Infrastructure"),
        ("library_book", "Library Books"),
        ("sports", "Sports Equipment"),
        ("consumable", "Consumable / Supplies"),
        ("other", "Other"),
    ]
    FORM_TYPES = [
        ("401", "Form 401 – Capital Assets Register"),
        ("403", "Form 403 – Store/Consumables Register"),
        ("405", "Form 405 – Condemned Assets Register"),
    ]
    DEPRECIATION_METHODS = [
        ("straight_line", "Straight Line Method (SLM)"),
        ("diminishing", "Diminishing Balance Method (DBM)"),
        ("none", "No Depreciation (Land / Consumable)"),
    ]
    CONDITIONS = [
        ("good", "Good"),
        ("fair", "Fair"),
        ("poor", "Poor / Needs Repair"),
        ("condemned", "Condemned / Write-off"),
    ]

    item_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="inventory_items",
        db_constraint=False,
    )
    item_code = models.CharField(
        max_length=30, blank=True, help_text="Internal asset tag / barcode"
    )
    name = models.CharField(max_length=150)
    name_np = models.CharField(max_length=150, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    form_type = models.CharField(max_length=3, choices=FORM_TYPES, default="401")
    quantity = models.PositiveIntegerField(default=1)
    unit = models.CharField(max_length=20, default="pcs")
    purchase_date = models.DateField()
    purchase_date_bs = models.CharField(max_length=10, blank=True)
    purchase_price = models.DecimalField(max_digits=14, decimal_places=2)
    supplier = models.CharField(max_length=150, blank=True)
    # Depreciation
    depreciation_method = models.CharField(
        max_length=15,
        choices=DEPRECIATION_METHODS,
        default="straight_line",
    )
    useful_life_years = models.PositiveSmallIntegerField(
        default=5,
        help_text="Estimated useful life in years",
    )
    nepali_dep_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("20.00"),
        help_text="Depreciation rate % per Nepal Govt schedule",
    )
    accumulated_depreciation = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
    )
    # Location & custodian
    location = models.CharField(
        max_length=100, blank=True, help_text="Room / Block / Department"
    )
    custodian = models.CharField(
        max_length=100, blank=True, help_text="Name of responsible staff member"
    )
    condition = models.CharField(max_length=10, choices=CONDITIONS, default="good")
    # Disposal
    disposal_date = models.DateField(null=True, blank=True)
    disposal_date_bs = models.CharField(max_length=10, blank=True)
    disposal_reason = models.CharField(max_length=200, blank=True)
    # Linkage
    purchase_journal = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_purchases",
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "name"]
        indexes = [
            models.Index(fields=["tenant", "category"], name="inv_tenant_cat_idx"),
            models.Index(fields=["tenant", "form_type"], name="inv_tenant_form_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.purchase_date and not self.purchase_date_bs:
            from billing_school.utils_bs_calendar import bs_date_str

            self.purchase_date_bs = bs_date_str(self.purchase_date)
        if self.disposal_date and not self.disposal_date_bs:
            from billing_school.utils_bs_calendar import bs_date_str

            self.disposal_date_bs = bs_date_str(self.disposal_date)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_code or '–'} | {self.name} ({self.get_form_type_display()})"

    @property
    def current_book_value(self) -> Decimal:
        return max(
            Decimal("0"),
            self.purchase_price * self.quantity - self.accumulated_depreciation,
        )

    def annual_depreciation(self) -> Decimal:
        """Annual depreciation amount based on method."""
        if self.depreciation_method == "straight_line":
            if self.useful_life_years:
                return (
                    self.purchase_price * self.quantity / self.useful_life_years
                ).quantize(Decimal("0.01"))
        elif self.depreciation_method == "diminishing":
            return (self.current_book_value * self.nepali_dep_rate / 100).quantize(
                Decimal("0.01")
            )
        return Decimal("0")


# ─────────────────────────────────────────────────────────────────────────────
# 6. Merchant Service Fee (auto-posted on gateway payment)
# ─────────────────────────────────────────────────────────────────────────────


class MerchantServiceFee(models.Model):
    GATEWAYS = [
        ("esewa", "eSewa"),
        ("khalti", "Khalti"),
        ("connectips", "ConnectIPS"),
    ]

    msf_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="merchant_service_fees",
        db_constraint=False,
    )
    payment = models.OneToOneField(
        "billing.Payment",
        on_delete=models.CASCADE,
        related_name="merchant_service_fee",
        db_constraint=False,
    )
    gateway = models.CharField(max_length=15, choices=GATEWAYS)
    gross_amount = models.DecimalField(max_digits=14, decimal_places=2)
    msf_rate = models.DecimalField(
        max_digits=5, decimal_places=2, help_text="MSF rate %"
    )
    msf_amount = models.DecimalField(max_digits=14, decimal_places=2)
    net_amount = models.DecimalField(max_digits=14, decimal_places=2)
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="msf_entries",
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"MSF {self.msf_amount} ({self.gateway}) | Payment {self.payment_id}"
