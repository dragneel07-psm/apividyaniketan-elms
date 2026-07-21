# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.core.exceptions import ValidationError
from django.db import models

from core.models.tenant import Tenant


class ProjectMember(models.Model):
    ROLE_CHOICES = [
        ("leader", "Leader"),
        ("member", "Member"),
    ]

    membership_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="members"
    )
    student = models.ForeignKey(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="project_memberships",
        db_constraint=False,
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "student")
        ordering = ["joined_at"]

    def __str__(self):
        return f"{self.student} in {self.project} ({self.role})"

    def clean(self):
        project = self.project
        if project.max_group_size is not None:
            existing = project.members.exclude(pk=self.pk).count()
            if existing + 1 > project.max_group_size:
                raise ValidationError(
                    f"Project is at its max group size ({project.max_group_size})."
                )
