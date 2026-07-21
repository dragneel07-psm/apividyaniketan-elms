# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ExpenseViewSet,
    FeeHeadViewSet,
    FeeStructureViewSet,
    FinanceDashboardViewSet,
    PaymentViewSet,
    StudentFeeViewSet,
)
from .views_discount import FeeDiscountViewSet
from .views_ledger import LedgerAccountViewSet, LedgerEntryViewSet
from .views_nas import (
    BSCalendarView,
    ChartOfAccountViewSet,
    ConnectIPSCallbackView,
    ConnectIPSInitiateView,
    FundAccountViewSet,
    InventoryItemViewSet,
    JournalEntryViewSet,
    NASFinancialStatementsView,
    TDSEntryViewSet,
)
from .views_payment_gateway import (
    EsewaCallbackView,
    EsewaInitiateView,
    KhaltiCallbackView,
    KhaltiInitiateView,
)
from .views_reports import BillingReportViewSet

router = DefaultRouter()
router.register(r"fee-structures", FeeStructureViewSet)
router.register(r"fee-heads", FeeHeadViewSet, basename="fee-head")
router.register(r"student-fees", StudentFeeViewSet)
router.register(r"payments", PaymentViewSet)
router.register(r"expenses", ExpenseViewSet)
router.register(r"dashboard", FinanceDashboardViewSet, basename="finance-dashboard")
router.register(r"reports", BillingReportViewSet, basename="billing-reports")
router.register(r"discounts", FeeDiscountViewSet, basename="fee-discount")
router.register(r"ledger-accounts", LedgerAccountViewSet, basename="ledger-account")
router.register(r"ledger-entries", LedgerEntryViewSet, basename="ledger-entry")
# NAS Accounting
router.register(r"nas/chart-of-accounts", ChartOfAccountViewSet, basename="nas-coa")
router.register(r"nas/journal-entries", JournalEntryViewSet, basename="nas-je")
router.register(r"nas/fund-accounts", FundAccountViewSet, basename="nas-fund")
router.register(r"nas/tds", TDSEntryViewSet, basename="nas-tds")
router.register(r"nas/inventory", InventoryItemViewSet, basename="nas-inventory")

urlpatterns = [
    path("", include(router.urls)),
    # eSewa
    path("esewa/initiate/", EsewaInitiateView.as_view(), name="esewa-initiate"),
    path("esewa/callback/", EsewaCallbackView.as_view(), name="esewa-callback"),
    # Khalti
    path("khalti/initiate/", KhaltiInitiateView.as_view(), name="khalti-initiate"),
    path("khalti/callback/", KhaltiCallbackView.as_view(), name="khalti-callback"),
    # ConnectIPS
    path(
        "connectips/initiate/",
        ConnectIPSInitiateView.as_view(),
        name="connectips-initiate",
    ),
    path(
        "connectips/callback/",
        ConnectIPSCallbackView.as_view(),
        name="connectips-callback",
    ),
    # NAS Financial Statements
    path(
        "nas/financial-statements/",
        NASFinancialStatementsView.as_view(),
        name="nas-financial-statements",
    ),
    # BS Calendar utility
    path("nas/bs-calendar/", BSCalendarView.as_view(), name="nas-bs-calendar"),
]
