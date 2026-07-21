# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models

from core.models.tenant import Tenant


class ProjectUpdate(models.Model):
    KIND_CHOICES = [
        ("comment", "Comment"),
        ("status_change", "Status Change"),
        ("task_added", "Task Added"),
        ("task_completed", "Task Completed"),
        ("submission", "Submission"),
        ("grade", "Grade"),
    ]

    update_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="updates"
    )
    task = models.ForeignKey(
        "projects.ProjectTask",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updates",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="project_updates",
        db_constraint=False,
    )

    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="comment")
    body = models.TextField(blank=True)
    meta = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["project", "-created_at"], name="proj_upd_proj_time_idx"
            ),
        ]

    def __str__(self):
        return f"{self.kind} on {self.project} at {self.created_at:%Y-%m-%d %H:%M}"
