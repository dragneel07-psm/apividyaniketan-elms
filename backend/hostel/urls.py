# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework.routers import DefaultRouter

from .views import HostelAllotmentViewSet, HostelBlockViewSet, HostelRoomViewSet

router = DefaultRouter()
router.register(r"blocks", HostelBlockViewSet, basename="hostel-block")
router.register(r"rooms", HostelRoomViewSet, basename="hostel-room")
router.register(r"allotments", HostelAllotmentViewSet, basename="hostel-allotment")

urlpatterns = router.urls
