# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models


class Teacher(models.Model):
    teacher_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="teacher_profile",
        db_constraint=False,
    )

    DESIGNATION_CHOICES = [
        ("subject_teacher", "Subject Teacher"),
        ("class_teacher", "Class Teacher"),
        ("program_director", "Program Director"),
    ]
    designation = models.CharField(
        max_length=50, choices=DESIGNATION_CHOICES, default="subject_teacher"
    )
    # Using string reference to avoid circular import if necessary, though AcademicClass is in same app
    assigned_classes = models.ManyToManyField(
        "academic.AcademicClass", blank=True, related_name="assigned_teachers"
    )

    def __str__(self):
        return f"{self.user.username} ({self.get_designation_display()})"
