# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models


class Complaint(models.Model):
    complaint_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant_schema = models.CharField(max_length=63, db_index=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="complaints_filed",
        db_constraint=False,
    )
    CATEGORY_CHOICES = [
        ("academic", "Academic"),
        ("facility", "Facility"),
        ("staff", "Staff Conduct"),
        ("billing", "Billing"),
        ("bullying", "Bullying"),
        ("safety", "Safety"),
        ("other", "Other"),
    ]
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    anonymous = models.BooleanField(default=False)

    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    priority = models.CharField(
        max_length=10,
        choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")],
        default="medium",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_complaints",
        db_constraint=False,
    )
    resolution_note = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["tenant_schema", "status"], name="acad_complaint_schema_idx"
            ),
        ]

    def __str__(self):
        return f"[{self.get_category_display()}] {self.title}"
