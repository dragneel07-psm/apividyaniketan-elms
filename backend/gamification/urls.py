# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BadgeViewSet,
    GamificationProfileViewSet,
    LeaderboardViewSet,
    StudentBadgeViewSet,
)

router = DefaultRouter()
router.register(r"profile", GamificationProfileViewSet, basename="gamification-profile")


router.register(r"student-badges", StudentBadgeViewSet, basename="student-badges")
router.register(r"leaderboard", LeaderboardViewSet, basename="leaderboard")
router.register(r"available-badges", BadgeViewSet, basename="available-badges")

urlpatterns = [
    path("", include(router.urls)),
]
