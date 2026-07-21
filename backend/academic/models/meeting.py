# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import uuid as uuid_lib

from django.conf import settings
from django.db import models


class ParentTeacherMeeting(models.Model):
    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_CANCELLED = "cancelled"
    STATUS_COMPLETED = "completed"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_COMPLETED, "Completed"),
    )

    SLOT_MORNING = "morning"
    SLOT_AFTERNOON = "afternoon"
    SLOT_EVENING = "evening"
    SLOT_CHOICES = (
        (SLOT_MORNING, "Morning (8am – 12pm)"),
        (SLOT_AFTERNOON, "Afternoon (12pm – 4pm)"),
        (SLOT_EVENING, "Evening (4pm – 7pm)"),
    )

    meeting_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    parent = models.ForeignKey(
        "academic.Parent",
        on_delete=models.CASCADE,
        related_name="meeting_requests",
        db_constraint=False,
    )
    student = models.ForeignKey(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="parent_meetings",
        db_constraint=False,
    )
    teacher = models.ForeignKey(
        "academic.Teacher",
        on_delete=models.CASCADE,
        related_name="parent_meetings",
        db_constraint=False,
    )
    requested_date = models.DateField()
    preferred_slot = models.CharField(
        max_length=20, choices=SLOT_CHOICES, default=SLOT_MORNING
    )
    purpose = models.TextField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING
    )

    # Set by teacher/admin on confirmation
    confirmed_datetime = models.DateTimeField(null=True, blank=True)
    meeting_link = models.URLField(blank=True)
    meeting_notes = models.TextField(blank=True)

    # For cancellations
    cancellation_reason = models.TextField(blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_meetings",
        db_constraint=False,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["parent", "status"], name="acad_ptm_parent_status_idx"
            ),
            models.Index(
                fields=["teacher", "status"], name="acad_ptm_teacher_status_idx"
            ),
            models.Index(fields=["requested_date"], name="acad_ptm_date_idx"),
        ]

    def __str__(self):
        return f"Meeting: {self.parent} ↔ {self.teacher} on {self.requested_date} [{self.status}]"
