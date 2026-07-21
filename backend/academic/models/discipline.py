# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import uuid as uuid_lib

from django.conf import settings
from django.db import models


class DisciplinaryIncident(models.Model):
    TYPE_MISCONDUCT = "misconduct"
    TYPE_BULLYING = "bullying"
    TYPE_CHEATING = "cheating"
    TYPE_PROPERTY_DAMAGE = "property_damage"
    TYPE_VERBAL_ABUSE = "verbal_abuse"
    TYPE_PHYSICAL = "physical_altercation"
    TYPE_ATTENDANCE = "attendance_violation"
    TYPE_OTHER = "other"
    INCIDENT_TYPE_CHOICES = (
        (TYPE_MISCONDUCT, "General Misconduct"),
        (TYPE_BULLYING, "Bullying"),
        (TYPE_CHEATING, "Cheating / Academic Dishonesty"),
        (TYPE_PROPERTY_DAMAGE, "Property Damage"),
        (TYPE_VERBAL_ABUSE, "Verbal Abuse"),
        (TYPE_PHYSICAL, "Physical Altercation"),
        (TYPE_ATTENDANCE, "Attendance Violation"),
        (TYPE_OTHER, "Other"),
    )

    SEVERITY_LOW = "low"
    SEVERITY_MEDIUM = "medium"
    SEVERITY_HIGH = "high"
    SEVERITY_CHOICES = (
        (SEVERITY_LOW, "Low"),
        (SEVERITY_MEDIUM, "Medium"),
        (SEVERITY_HIGH, "High"),
    )

    STATUS_OPEN = "open"
    STATUS_RESOLVED = "resolved"
    STATUS_ESCALATED = "escalated"
    STATUS_CHOICES = (
        (STATUS_OPEN, "Open"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_ESCALATED, "Escalated"),
    )

    incident_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="disciplinary_incidents",
        db_constraint=False,
    )
    student = models.ForeignKey(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="disciplinary_incidents",
        db_constraint=False,
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="reported_incidents",
        db_constraint=False,
    )

    incident_date = models.DateField()
    incident_type = models.CharField(
        max_length=30, choices=INCIDENT_TYPE_CHOICES, default=TYPE_OTHER
    )
    severity = models.CharField(
        max_length=10, choices=SEVERITY_CHOICES, default=SEVERITY_LOW
    )
    description = models.TextField()
    action_taken = models.TextField(blank=True)
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default=STATUS_OPEN
    )

    # Parent communication
    parent_notified = models.BooleanField(default=False)
    parent_notified_at = models.DateTimeField(null=True, blank=True)
    parent_response = models.TextField(blank=True)

    # Follow-up
    follow_up_date = models.DateField(null=True, blank=True)
    follow_up_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-incident_date", "-created_at"]
        indexes = [
            models.Index(
                fields=["tenant", "status"], name="sis_disc_tenant_status_idx"
            ),
            models.Index(
                fields=["tenant", "student"], name="sis_disc_tenant_student_idx"
            ),
            models.Index(fields=["incident_date"], name="sis_disc_date_idx"),
        ]

    def __str__(self):
        return f"{self.student} – {self.get_incident_type_display()} ({self.incident_date})"
