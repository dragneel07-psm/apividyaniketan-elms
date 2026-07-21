# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import re_path

from ai_engine.consumers import ProgressReportStreamConsumer, TutorStreamConsumer
from notifications.consumers import NotificationConsumer
from projects.consumers import MentorDigestStreamConsumer, ProjectStreamConsumer

websocket_urlpatterns = [
    re_path(r"^ws/tutor/chat/$", TutorStreamConsumer.as_asgi()),
    re_path(r"^ws/progress-report/$", ProgressReportStreamConsumer.as_asgi()),
    re_path(r"^ws/notifications/$", NotificationConsumer.as_asgi()),
    # Mentor digest must come before the project_id pattern so "digest" is
    # not mistaken for a UUID.
    re_path(r"^ws/projects/digest/$", MentorDigestStreamConsumer.as_asgi()),
    re_path(
        r"^ws/projects/(?P<project_id>[0-9a-f-]+)/$",
        ProjectStreamConsumer.as_asgi(),
    ),
]
