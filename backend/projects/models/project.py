# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from core.models.tenant import Tenant


class Project(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("active", "Active"),
        ("submitted", "Submitted"),
        ("graded", "Graded"),
        ("archived", "Archived"),
    ]

    ALLOWED_TRANSITIONS = {
        "draft": {"active", "archived"},
        "active": {"submitted", "archived"},
        "submitted": {"graded", "active"},
        "graded": {"archived"},
        "archived": set(),
    }

    project_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    subject = models.ForeignKey(
        "academic.Subject",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projects",
        db_constraint=False,
    )
    section = models.ForeignKey(
        "academic.Section",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projects",
        db_constraint=False,
        help_text=(
            "Primary class section for the project. Optional — members can "
            "span multiple sections (cross-class collaboration)."
        ),
    )

    mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="mentored_projects",
        db_constraint=False,
    )
    leader = models.ForeignKey(
        "academic.Student",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_projects",
        db_constraint=False,
    )

    is_group = models.BooleanField(default=False)
    min_group_size = models.PositiveIntegerField(null=True, blank=True)
    max_group_size = models.PositiveIntegerField(null=True, blank=True)

    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    final_grade = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    rubric_json = models.JSONField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_projects",
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status"], name="proj_tenant_status_idx"),
            models.Index(fields=["mentor", "status"], name="proj_mentor_status_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"

    def clean(self):
        if (
            self.min_group_size is not None
            and self.max_group_size is not None
            and self.min_group_size > self.max_group_size
        ):
            raise ValidationError(
                {"min_group_size": "min_group_size cannot exceed max_group_size."}
            )
        if not self.is_group and (self.min_group_size or self.max_group_size):
            raise ValidationError(
                {"is_group": "Group size limits only apply when is_group is True."}
            )

    @property
    def total_weight(self):
        return sum(t.weight for t in self.tasks.all())

    @property
    def completed_weight(self):
        return sum(t.weight for t in self.tasks.all() if t.status == "done")

    @property
    def progress_percent(self):
        total = self.total_weight
        if total == 0:
            return 0
        return round(self.completed_weight * 100.0 / total, 1)

    @property
    def progress_label(self):
        all_tasks = list(self.tasks.all())
        done = sum(1 for t in all_tasks if t.status == "done")
        return f"{done} of {len(all_tasks)} tasks done"

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.ALLOWED_TRANSITIONS.get(self.status, set())
