# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.db import models


class AdmissionEnquiry(models.Model):
    STATUS_CHOICES = [
        ("new", "New"),
        ("contacted", "Contacted"),
        ("interested", "Interested"),
        ("application_started", "Application Started"),
        ("converted", "Converted"),
        ("closed", "Closed"),
    ]
    SOURCE_CHOICES = [
        ("walk_in", "Walk In"),
        ("website", "Website"),
        ("referral", "Referral"),
        ("social", "Social Media"),
        ("phone", "Phone"),
        ("other", "Other"),
    ]

    enquiry_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="admission_enquiries",
        db_constraint=False,
    )

    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150, blank=True, default="")
    guardian_name = models.CharField(max_length=200, blank=True, default="")
    email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20)

    desired_class = models.ForeignKey(
        "academic.AcademicClass",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admission_enquiries",
    )
    desired_section_name = models.CharField(max_length=20, blank=True, default="")

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="new")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="walk_in")
    notes = models.TextField(blank=True, null=True)
    follow_up_date = models.DateField(null=True, blank=True)

    converted_student = models.ForeignKey(
        "academic.Student",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admission_conversions",
    )
    handled_by = models.ForeignKey(
        "users.UserAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handled_admission_enquiries",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["tenant", "status"], name="admission_tenant_status_idx"
            ),
            models.Index(
                fields=["tenant", "created_at"], name="admission_tenant_created_idx"
            ),
        ]

    def __str__(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return f"{full_name or self.phone_number} ({self.status})"
