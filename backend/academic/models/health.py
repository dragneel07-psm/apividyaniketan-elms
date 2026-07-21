# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import uuid as uuid_lib

from django.db import models

BLOOD_GROUP_CHOICES = (
    ("A+", "A+"),
    ("A-", "A-"),
    ("B+", "B+"),
    ("B-", "B-"),
    ("AB+", "AB+"),
    ("AB-", "AB-"),
    ("O+", "O+"),
    ("O-", "O-"),
    ("unknown", "Unknown"),
)


class StudentHealthRecord(models.Model):
    health_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="student_health_records",
        db_constraint=False,
    )
    student = models.OneToOneField(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="health_record",
        db_constraint=False,
    )

    # Physical
    blood_group = models.CharField(
        max_length=10, choices=BLOOD_GROUP_CHOICES, default="unknown"
    )
    height_cm = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True
    )
    weight_kg = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True
    )

    # Medical
    allergies = models.TextField(
        blank=True, help_text="Comma-separated list of known allergies"
    )
    chronic_conditions = models.TextField(
        blank=True, help_text="Asthma, diabetes, etc."
    )
    current_medications = models.TextField(blank=True)
    immunization_notes = models.TextField(blank=True)

    # Emergency contact
    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relation = models.CharField(max_length=50, blank=True)

    # Doctor
    doctor_name = models.CharField(max_length=150, blank=True)
    doctor_phone = models.CharField(max_length=20, blank=True)

    # Insurance
    insurance_provider = models.CharField(max_length=100, blank=True)
    insurance_number = models.CharField(max_length=60, blank=True)

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant"], name="sis_health_tenant_idx"),
        ]

    def __str__(self):
        return f"Health: {self.student} ({self.blood_group})"


class ImmunizationRecord(models.Model):
    """Individual vaccination entries linked to a health record."""

    immunization_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    health_record = models.ForeignKey(
        StudentHealthRecord,
        on_delete=models.CASCADE,
        related_name="immunizations",
        db_constraint=False,
    )
    vaccine_name = models.CharField(max_length=120)
    date_administered = models.DateField(null=True, blank=True)
    next_due_date = models.DateField(null=True, blank=True)
    administered_by = models.CharField(max_length=150, blank=True)
    remarks = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-date_administered"]

    def __str__(self):
        return f"{self.vaccine_name} – {self.date_administered}"
