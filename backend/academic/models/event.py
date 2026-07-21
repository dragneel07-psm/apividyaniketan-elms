# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid

from django.db import models

EVENT_TYPE_CHOICES = [
    ("holiday", "Public Holiday"),
    ("exam", "Examination"),
    ("sports", "Sports Event"),
    ("cultural", "Cultural Event"),
    ("ptm", "Parent-Teacher Meeting"),
    ("academic", "Academic Activity"),
    ("meeting", "Staff Meeting"),
    ("other", "Other"),
]

AUDIENCE_CHOICES = [
    ("all", "Everyone"),
    ("students", "Students"),
    ("teachers", "Teachers"),
    ("parents", "Parents"),
    ("staff", "Staff Only"),
]


class SchoolEvent(models.Model):
    event_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="school_events",
        db_constraint=False,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_type = models.CharField(
        max_length=20, choices=EVENT_TYPE_CHOICES, default="other"
    )
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default="all")

    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    is_all_day = models.BooleanField(default=True)

    location = models.CharField(max_length=200, blank=True)
    is_holiday = models.BooleanField(default=False)  # marks days off (no classes)
    color = models.CharField(
        max_length=7, blank=True, default=""
    )  # hex color for calendar

    created_by = models.ForeignKey(
        "users.UserAccount",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_events",
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_date", "start_time"]
        indexes = [
            models.Index(
                fields=["tenant", "start_date"], name="event_tenant_start_idx"
            ),
            models.Index(fields=["tenant", "event_type"], name="event_tenant_type_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.start_date})"
