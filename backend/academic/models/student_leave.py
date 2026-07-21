# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models
from django.utils import timezone


class StudentLeave(models.Model):
    leave_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    student = models.ForeignKey(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="leave_requests",
        db_constraint=False,
    )
    applied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="submitted_student_leaves",
        db_constraint=False,
    )
    LEAVE_TYPES = [
        ("sick", "Sick Leave"),
        ("personal", "Personal"),
        ("family", "Family Emergency"),
        ("event", "Event / Competition"),
        ("other", "Other"),
    ]
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPES)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    supporting_document_url = models.URLField(blank=True, null=True)

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_student_leaves",
        db_constraint=False,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["student", "status"], name="acad_stleave_student_idx"),
            models.Index(
                fields=["start_date", "end_date"], name="acad_stleave_dates_idx"
            ),
        ]

    def __str__(self):
        return f"{self.student} leave {self.start_date}–{self.end_date} [{self.status}]"

    @property
    def total_days(self):
        delta = self.end_date - self.start_date
        return delta.days + 1
