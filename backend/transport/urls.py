# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework.routers import DefaultRouter

from .views import RouteViewSet, StudentTransportAssignmentViewSet, VehicleViewSet

router = DefaultRouter()
router.register(r"routes", RouteViewSet, basename="route")
router.register(r"vehicles", VehicleViewSet, basename="vehicle")
router.register(
    r"assignments", StudentTransportAssignmentViewSet, basename="transport-assignment"
)

urlpatterns = router.urls
