# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from datetime import datetime, time, timezone
from email.utils import format_datetime

from django.conf import settings


def _legacy_sunset_value() -> str:
    raw_value = str(getattr(settings, "BILLING_LEGACY_SUNSET", "2026-12-31")).strip()
    if not raw_value:
        raw_value = "2026-12-31"

    try:
        sunset_date = datetime.strptime(raw_value, "%Y-%m-%d").date()
        sunset_dt = datetime.combine(sunset_date, time(23, 59, 59, tzinfo=timezone.utc))
        return format_datetime(sunset_dt, usegmt=True)
    except ValueError:
        return raw_value


class LegacyBillingDeprecationMixin:
    """
    Adds RFC-style deprecation metadata on legacy `/api/billing/*` endpoints.
    """

    legacy_replacement_hint = "Use /api/billing/saas/* or /api/billing/school/*"

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response.setdefault("Deprecation", "true")
        response.setdefault("Sunset", _legacy_sunset_value())
        response.setdefault(
            "Link",
            '</api/billing/saas/>; rel="successor-version", </api/billing/school/>; rel="successor-version"',
        )
        response.setdefault("X-API-Deprecated", self.legacy_replacement_hint)
        return response
