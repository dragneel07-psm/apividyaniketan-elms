# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Backward-compatible import surface for billing viewsets.

New code should import directly from billing_school.views.
"""

from billing.shared_views import BillingIdempotencyMixin, BillingSchemaGuardMixin
from billing_school.views import (
    ExpenseViewSet,
    FeeStructureViewSet,
    FinanceDashboardViewSet,
    PaymentViewSet,
    StudentFeeViewSet,
)

__all__ = [
    "BillingSchemaGuardMixin",
    "BillingIdempotencyMixin",
    "FeeStructureViewSet",
    "StudentFeeViewSet",
    "PaymentViewSet",
    "ExpenseViewSet",
    "FinanceDashboardViewSet",
]
