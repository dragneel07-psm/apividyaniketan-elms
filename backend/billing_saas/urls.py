# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    InvoiceViewSet,
    SaasGrowthAnalyticsView,
    SaasHealthMonitorView,
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

urlpatterns = [
    path(
        "analytics/growth/",
        SaasGrowthAnalyticsView.as_view(),
        name="saas-analytics-growth",
    ),
    path(
        "analytics/health/",
        SaasHealthMonitorView.as_view(),
        name="saas-analytics-health",
    ),
    path("", include(router.urls)),
]
