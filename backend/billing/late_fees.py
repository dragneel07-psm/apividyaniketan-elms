# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Late-fee accrual (Phase C).

A scheduled task scans StudentFee rows that are past due_date + grace_days,
have a non-zero outstanding balance, and haven't had a late fee applied
yet. The fee is added to amount_due, status flips to 'overdue', and we
record the surcharge amount + timestamp on the row so the task is
idempotent.
"""

from __future__ import annotations

from datetime import date as _date
from decimal import Decimal

from django.db import transaction
from django.utils import timezone


def _compute_late_fee(structure, balance: Decimal) -> Decimal:
    """Return the late-fee amount given a FeeStructure policy and outstanding balance."""
    rate = Decimal(str(structure.late_fee_amount or 0))
    if structure.late_fee_type == "flat":
        return rate.quantize(Decimal("0.01"))
    if structure.late_fee_type == "percent":
        if rate <= 0 or balance <= 0:
            return Decimal("0")
        return (balance * rate / Decimal("100")).quantize(Decimal("0.01"))
    return Decimal("0")


def apply_late_fees(today: _date | None = None, *, tenant=None) -> dict:
    """
    Walk eligible StudentFees and accrue late fees.

    Returns a summary dict suitable for logging / Celery results.
    """
    from django.db.models import F

    from .models_school import StudentFee

    today = today or timezone.now().date()

    qs = (
        StudentFee.objects.select_related("fee_structure", "tenant")
        .exclude(status__in=["paid", "waived"])
        .filter(late_fee_applied=0)
        .filter(fee_structure__late_fee_type__in=["flat", "percent"])
    )
    if tenant is not None:
        qs = qs.filter(tenant=tenant)

    applied_count = 0
    skipped_count = 0
    total_added = Decimal("0")

    for fee in qs.iterator():
        structure = fee.fee_structure
        if not structure or structure.late_fee_type == "none":
            skipped_count += 1
            continue

        grace = int(getattr(structure, "grace_days", 0) or 0)
        cutoff = fee.due_date
        # Add grace days
        from datetime import timedelta

        cutoff = cutoff + timedelta(days=grace)
        if today <= cutoff:
            skipped_count += 1
            continue

        balance = Decimal(str(fee.amount_due)) - Decimal(str(fee.amount_paid))
        if balance <= 0:
            skipped_count += 1
            continue

        late = _compute_late_fee(structure, balance)
        if late <= 0:
            skipped_count += 1
            continue

        with transaction.atomic():
            # Re-read with lock to avoid races with concurrent payments / re-runs
            locked = StudentFee.objects.select_for_update().get(pk=fee.pk)
            if locked.late_fee_applied != 0:
                skipped_count += 1
                continue
            locked.amount_due = Decimal(str(locked.amount_due)) + late
            locked.late_fee_applied = late
            locked.late_fee_applied_at = timezone.now()
            if locked.status not in ("paid", "waived"):
                locked.status = "overdue"
            locked.save(
                update_fields=[
                    "amount_due",
                    "late_fee_applied",
                    "late_fee_applied_at",
                    "status",
                    "updated_at",
                ]
            )

        applied_count += 1
        total_added += late

    return {
        "applied": applied_count,
        "skipped": skipped_count,
        "total_added": str(total_added),
        "as_of": today.isoformat(),
    }
