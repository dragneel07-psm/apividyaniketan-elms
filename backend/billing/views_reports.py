# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Backward-compatible import surface for billing reports viewsets.

New code should import from:
- billing_school.views_reports
"""

from billing_school.views_reports import BillingReportViewSet

__all__ = ["BillingReportViewSet"]
