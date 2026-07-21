# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import uuid as uuid_lib

from django.conf import settings
from django.db import models


class StudentDocument(models.Model):
    TYPE_TC = "transfer_certificate"
    TYPE_CHARACTER = "character_certificate"
    TYPE_BONAFIDE = "bonafide_certificate"
    TYPE_FEE_SUMMARY = "fee_receipt_summary"
    TYPE_CUSTOM = "custom"
    DOCUMENT_TYPE_CHOICES = (
        (TYPE_TC, "Transfer Certificate"),
        (TYPE_CHARACTER, "Character Certificate"),
        (TYPE_BONAFIDE, "Bonafide Certificate"),
        (TYPE_FEE_SUMMARY, "Fee Receipt Summary"),
        (TYPE_CUSTOM, "Custom Document"),
    )

    document_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="student_documents",
        db_constraint=False,
    )
    student = models.ForeignKey(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="documents",
        db_constraint=False,
    )
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES)
    document_number = models.CharField(
        max_length=50, blank=True, help_text="Auto-generated serial number"
    )
    issued_date = models.DateField()
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="issued_documents",
        db_constraint=False,
    )

    # For TC: reason for leaving
    reason = models.TextField(blank=True)
    remarks = models.TextField(blank=True)

    # For TC: marks student as transferred out
    marks_as_transferred = models.BooleanField(default=False)

    # Flexible metadata (e.g. purpose for bonafide, custom fields)
    metadata = models.JSONField(default=dict, blank=True)

    is_cancelled = models.BooleanField(default=False)
    cancellation_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["tenant", "document_type"], name="sis_doc_tenant_type_idx"
            ),
            models.Index(
                fields=["tenant", "student"], name="sis_doc_tenant_student_idx"
            ),
        ]

    def __str__(self):
        return (
            f"{self.get_document_type_display()} – {self.student} ({self.issued_date})"
        )

    def save(self, *args, **kwargs):
        if not self.document_number:
            prefix_map = {
                self.TYPE_TC: "TC",
                self.TYPE_CHARACTER: "CC",
                self.TYPE_BONAFIDE: "BF",
                self.TYPE_FEE_SUMMARY: "FR",
                self.TYPE_CUSTOM: "DOC",
            }
            prefix = prefix_map.get(self.document_type, "DOC")
            year = self.issued_date.year if self.issued_date else "00"
            # Count existing docs of same type for this tenant this year
            count = (
                StudentDocument.objects.filter(
                    tenant=self.tenant,
                    document_type=self.document_type,
                    issued_date__year=year,
                ).count()
                + 1
            )
            self.document_number = f"{prefix}-{year}-{count:04d}"
        super().save(*args, **kwargs)
