# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ProjectAttachmentViewSet,
    ProjectSubmissionViewSet,
    ProjectTaskViewSet,
    ProjectUpdateViewSet,
    ProjectViewSet,
    RubricTemplateViewSet,
)

router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="projects")
router.register(r"tasks", ProjectTaskViewSet, basename="project-tasks")
router.register(r"updates", ProjectUpdateViewSet, basename="project-updates")
router.register(
    r"submissions", ProjectSubmissionViewSet, basename="project-submissions"
)
router.register(
    r"attachments", ProjectAttachmentViewSet, basename="project-attachments"
)
router.register(r"rubric-templates", RubricTemplateViewSet, basename="rubric-templates")

urlpatterns = [
    path("", include(router.urls)),
]
