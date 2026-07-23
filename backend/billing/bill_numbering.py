# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Sequential bill / receipt number allocator.

Format: {prefix}-{fy_short}-{nnnnn}
  e.g. BL-2082/83-00001

The IRD audit convention is one continuous sequence per tenant per Nepali
fiscal year. The allocator runs inside a transaction and falls back to
the unique-together database constraint if two cashiers somehow race.
"""

from __future__ import annotations

import re

from django.db import transaction

_BILL_RE = re.compile(r"-([0-9]+)$")


def _fy_short(fy: str) -> str:
    """Compress a long FY ('2082/2083') to the short form ('2082/83')."""
    fy = (fy or "").strip()
    if "/" in fy:
        a, b = fy.split("/", 1)
        if len(b) == 4 and len(a) == 4 and b.startswith(a[:2]):
            return f"{a}/{b[-2:]}"
        return fy
    return fy


def _resolve_fy(profile) -> str:
    fy = (getattr(profile, "fiscal_year_bs", "") or "").strip()
    if fy:
        return _fy_short(fy)
    # Fallback: compute from today.
    from billing_school.utils_bs_calendar import fiscal_year_bs

    return _fy_short(fiscal_year_bs())


def allocate_bill_number(tenant=None) -> str:
    """
    Return the next sequential bill number.

    `tenant` is unused and kept only for backward compatibility with
    existing callers; the school is now a singleton so bill numbering
    reads its prefix/fiscal-year identity from SchoolProfile.get_solo().

    Must be called inside a request transaction. The DB-level
    UniqueConstraint(bill_number) is the ultimate safety net.
    """
    from core.models import SchoolProfile

    from .models_school import Payment

    profile = SchoolProfile.get_solo()
    prefix = (profile.bill_prefix or "BL").strip() or "BL"
    fy = _resolve_fy(profile)
    series = f"{prefix}-{fy}-"

    with transaction.atomic():
        last = (
            Payment.objects.select_for_update()
            .filter(bill_number__startswith=series)
            .order_by("-bill_number")
            .values_list("bill_number", flat=True)
            .first()
        )

        next_seq = 1
        if last:
            m = _BILL_RE.search(last)
            if m:
                try:
                    next_seq = int(m.group(1)) + 1
                except ValueError:
                    next_seq = 1

        return f"{series}{next_seq:05d}"
