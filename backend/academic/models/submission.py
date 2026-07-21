# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.db import models

from .assessment import Assessment
from .student import Student


class Submission(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("graded", "Graded"),
        ("late", "Submitted Late"),
    ]

    submission_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE, related_name="submissions"
    )
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="submissions"
    )

    # Content
    content = models.TextField(blank=True, null=True, help_text="Text content or essay")
    file_url = models.CharField(
        max_length=500, blank=True, null=True, help_text="URL to uploaded file"
    )

    # Metadata
    submitted_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Grading (Links to Result, but can exist independently before grading)
    is_graded = models.BooleanField(default=False)

    class Meta:
        ordering = ["-submitted_at"]
        unique_together = ["assessment", "student"]

    def __str__(self):
        return f"{self.student} - {self.assessment} ({self.status})"
