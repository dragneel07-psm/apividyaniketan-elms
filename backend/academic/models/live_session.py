# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid

from django.conf import settings
from django.db import models


class LiveSession(models.Model):
    STATUS_CHOICES = [
        ("live", "Live"),
        ("ended", "Ended"),
    ]

    session_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timetable = models.ForeignKey(
        "academic.Timetable",
        on_delete=models.CASCADE,
        related_name="live_sessions",
    )
    # Jitsi room name — unique per session so rooms don't collide across days
    jitsi_room = models.CharField(max_length=200, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="live")
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="started_live_sessions",
    )
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(
                fields=["timetable", "status"], name="ls_timetable_status_idx"
            ),
            models.Index(fields=["status", "started_at"], name="ls_status_started_idx"),
        ]

    def __str__(self):
        return f"LiveSession {self.session_id} [{self.status}] - {self.timetable}"

    @property
    def jitsi_url(self):
        """Public Jitsi Meet URL for this session."""
        return f"https://meet.jit.si/{self.jitsi_room}"
