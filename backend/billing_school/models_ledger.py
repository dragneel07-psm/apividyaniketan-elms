# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models


class LedgerAccount(models.Model):
    """Cash box or bank account for petty cash / bank book tracking."""

    account_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="ledger_accounts",
        db_constraint=False,
    )
    name = models.CharField(max_length=100)
    ACCOUNT_TYPES = [("cash", "Petty Cash"), ("bank", "Bank Account")]
    account_type = models.CharField(
        max_length=10, choices=ACCOUNT_TYPES, default="cash"
    )
    bank_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def current_balance(self):
        from django.db.models import Q, Sum

        entries = self.entries.all()
        credits = (
            entries.filter(entry_type="credit").aggregate(s=Sum("amount"))["s"] or 0
        )
        debits = entries.filter(entry_type="debit").aggregate(s=Sum("amount"))["s"] or 0
        return self.opening_balance + credits - debits


class LedgerEntry(models.Model):
    entry_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="ledger_entries",
        db_constraint=False,
    )
    account = models.ForeignKey(
        LedgerAccount,
        on_delete=models.CASCADE,
        related_name="entries",
        db_constraint=False,
    )
    date = models.DateField()
    ENTRY_TYPES = [("debit", "Debit / Payment"), ("credit", "Credit / Receipt")]
    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=300)
    reference = models.CharField(
        max_length=100, blank=True, help_text="Cheque no, voucher no, etc."
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(
                fields=["tenant", "account", "date"], name="bill_ledger_t_acc_d_idx"
            ),
        ]

    def __str__(self):
        return f"{self.entry_type.upper()} {self.amount} – {self.description[:40]}"
