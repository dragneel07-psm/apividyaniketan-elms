# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NotificationTemplateViewSet, NotificationViewSet

router = DefaultRouter()
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(
    r"templates", NotificationTemplateViewSet, basename="notification-template"
)

urlpatterns = [
    path(
        "dispatch/",
        NotificationViewSet.as_view({"post": "enqueue_notification"}),
        name="notification-dispatch",
    ),
    path("", include(router.urls)),
]
