# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"books", views.BookViewSet)
router.register(r"issues", views.BookIssueViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
