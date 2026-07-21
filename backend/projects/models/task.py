# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models.tenant import Tenant


class ProjectTask(models.Model):
    STATUS_CHOICES = [
        ("todo", "To Do"),
        ("in_progress", "In Progress"),
        ("review", "Review"),
        ("done", "Done"),
        ("blocked", "Blocked"),
    ]

    task_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="tasks"
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    assignee = models.ForeignKey(
        "academic.Student",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="project_tasks",
        db_constraint=False,
    )

    weight = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="todo")
    order = models.PositiveIntegerField(default=0)

    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_project_tasks",
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "created_at"]
        indexes = [
            models.Index(
                fields=["project", "status"], name="proj_task_proj_status_idx"
            ),
            models.Index(fields=["assignee", "status"], name="proj_task_assignee_idx"),
        ]

    def __str__(self):
        return f"{self.title} [{self.status}]"

    def save(self, *args, **kwargs):
        if self.status == "done" and self.completed_at is None:
            self.completed_at = timezone.now()
        elif self.status != "done" and self.completed_at is not None:
            self.completed_at = None
        if self.weight < 1:
            self.weight = 1
        super().save(*args, **kwargs)

    @property
    def is_overdue(self) -> bool:
        if self.due_date is None or self.status == "done":
            return False
        return timezone.now() > self.due_date
