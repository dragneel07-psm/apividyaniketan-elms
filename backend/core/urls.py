# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AuditLogViewSet,
    BackupViewSet,
    GlobalSettingsViewSet,
    HealthzView,
    JobStatusView,
    MetricsView,
    ReadyzView,
    SaasAIUsageView,
    SchoolProfileView,
    SystemStatusView,
    TenantCapabilitiesView,
    ContactMessageViewSet,
    SchoolPublicInfoView,
)

router = DefaultRouter()
router.register(r"audit-logs", AuditLogViewSet)
router.register(r"settings", GlobalSettingsViewSet, basename="settings")
router.register(r"backups", BackupViewSet, basename="backups")
router.register(r"contact-messages", ContactMessageViewSet, basename="contact-messages")

urlpatterns = [
    path("", include(router.urls)),
    path("healthz/", HealthzView.as_view(), name="healthz"),
    path("readyz/", ReadyzView.as_view(), name="readyz"),
    path("metrics/", MetricsView.as_view(), name="metrics"),
    path("jobs/<str:job_id>/", JobStatusView.as_view(), name="job-status"),
    path("system-status/", SystemStatusView.as_view(), name="system-status"),
    path("school-public-info/", SchoolPublicInfoView.as_view(), name="school-public-info"),
    path("capabilities/", TenantCapabilitiesView.as_view(), name="tenant-capabilities"),
    path("school-profile/", SchoolProfileView.as_view(), name="school-profile"),
    path("saas-ai-usage/", SaasAIUsageView.as_view(), name="saas-ai-usage"),
]
