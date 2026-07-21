# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.schemas import get_schema_view

from core.views import HealthzView, MetricsView, ReadyzView
from users.views import CustomTokenObtainPairView, CustomTokenRefreshView

# The OpenAPI schema enumerates every endpoint/param — useful for local type
# generation (npm run api:types) but a recon aid if public in production. Keep
# it open only under DEBUG; require staff otherwise.
_SCHEMA_PERMISSIONS = [AllowAny] if settings.DEBUG else [IsAdminUser]

schema_view = get_schema_view(
    title="E-Learning WebApp API",
    description="Tenant-aware LMS + school ERP APIs",
    version="v1",
    permission_classes=_SCHEMA_PERMISSIONS,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", HealthzView.as_view(), name="healthz-root"),
    path("readyz", ReadyzView.as_view(), name="readyz-root"),
    path("metrics", MetricsView.as_view(), name="metrics-root"),
    path("api/schema/", schema_view, name="api-schema"),
    path("api/v1/schema/", schema_view, name="api-schema-v1"),
    path("api/core/", include("core.urls")),
    path("api/users/", include("users.urls")),
    path("api/academic/", include("academic.urls")),
    path("api/billing/saas/", include("billing_saas.urls")),
    path("api/billing/school/", include("billing_school.urls")),
    path("api/billing/", include("billing.urls")),
    path("api/ai/", include("ai_engine.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/library/", include("library.urls")),
    path("api/gamification/", include("gamification.urls")),
    path("api/conversations/", include("conversations.urls")),
    path("api/hr/", include("hr_payroll.urls")),
    path("api/transport/", include("transport.urls")),
    path("api/hostel/", include("hostel.urls")),
    path("api/projects/", include("projects.urls")),
    # Versioned aliases (v1)
    path("api/v1/core/", include("core.urls")),
    path("api/v1/users/", include("users.urls")),
    path("api/v1/academic/", include("academic.urls")),
    path("api/v1/billing/saas/", include("billing_saas.urls")),
    path("api/v1/billing/school/", include("billing_school.urls")),
    path("api/v1/billing/", include("billing.urls")),
    path("api/v1/ai/", include("ai_engine.urls")),
    path("api/v1/notifications/", include("notifications.urls")),
    path("api/v1/library/", include("library.urls")),
    path("api/v1/gamification/", include("gamification.urls")),
    path("api/v1/conversations/", include("conversations.urls")),
    path("api/v1/hr/", include("hr_payroll.urls")),
    path("api/v1/transport/", include("transport.urls")),
    path("api/v1/hostel/", include("hostel.urls")),
    path("api/v1/projects/", include("projects.urls")),
    # JWT Auth
    path("api/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path(
        "api/v1/token/",
        CustomTokenObtainPairView.as_view(),
        name="token_obtain_pair_v1",
    ),
    path(
        "api/v1/token/refresh/",
        CustomTokenRefreshView.as_view(),
        name="token_refresh_v1",
    ),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
