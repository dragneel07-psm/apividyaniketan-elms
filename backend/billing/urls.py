# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .legacy_views import (
    BillingReportViewSet,
    ExpenseViewSet,
    FeeStructureViewSet,
    FinanceDashboardViewSet,
    InvoiceViewSet,
    PaymentViewSet,
    StudentFeeViewSet,
    SubscriptionPlanHistoryViewSet,
    SubscriptionPlanViewSet,
    SubscriptionViewSet,
)

router = DefaultRouter()
router.register(r"subscriptions", SubscriptionViewSet)
router.register(
    r"subscription-history",
    SubscriptionPlanHistoryViewSet,
    basename="subscription-history",
)
router.register(r"plans", SubscriptionPlanViewSet)
router.register(r"invoices", InvoiceViewSet)

# School Finance
router.register(r"fee-structures", FeeStructureViewSet)
router.register(r"student-fees", StudentFeeViewSet)
router.register(r"payments", PaymentViewSet)
router.register(r"expenses", ExpenseViewSet)
router.register(r"dashboard", FinanceDashboardViewSet, basename="finance-dashboard")
router.register(r"reports", BillingReportViewSet, basename="billing-reports")

urlpatterns = [
    path("", include(router.urls)),
]
