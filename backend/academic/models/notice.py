# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.conf import settings
from django.db import models

from core.upload_validation import notice_upload_validators
from core.utils.storage_paths import (
    schema_from_current_connection,
    tenant_scoped_upload_path,
)

from .class_section import AcademicClass
from .student import Student


def notice_attachment_upload_to(instance, filename):
    tenant = getattr(instance, "tenant", None)
    schema_name = (
        getattr(tenant, "schema_name", None)
        if tenant
        else schema_from_current_connection()
    )
    return tenant_scoped_upload_path(schema_name, "notices", filename)


class Notice(models.Model):
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("normal", "Normal"),
        ("high", "High"),
    ]

    AUDIENCE_CHOICES = [
        ("school", "Whole School"),
        ("class", "Specific Class"),
        ("student", "Specific Student"),
    ]

    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="notices",
        null=True,
        blank=True,
        db_constraint=False,
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    category = models.CharField(
        max_length=50, default="General"
    )  # e.g., Academic, Event, Holiday
    priority = models.CharField(
        max_length=20, choices=PRIORITY_CHOICES, default="normal"
    )

    target_audience = models.CharField(
        max_length=20, choices=AUDIENCE_CHOICES, default="school"
    )
    target_class = models.ForeignKey(
        AcademicClass,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Required if audience is 'Specific Class'",
    )
    target_student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Required if audience is 'Specific Student'",
    )

    published_date = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateField(null=True, blank=True)
    attachment = models.FileField(
        upload_to=notice_attachment_upload_to,
        null=True,
        blank=True,
        help_text="Upload PDF or Image",
        validators=notice_upload_validators(),
    )

    class Meta:
        ordering = ["-published_date"]

    def __str__(self):
        return self.title


class NoticeRead(models.Model):
    """Tracks which users have opened which notices."""

    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="notice_reads",
        null=True,
        blank=True,
        db_constraint=False,
    )
    notice = models.ForeignKey(Notice, on_delete=models.CASCADE, related_name="reads")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notice_reads",
        db_constraint=False,
    )
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("notice", "user")
        indexes = [
            models.Index(fields=["user", "notice"], name="acad_noticeread_user_idx"),
        ]

    def __str__(self):
        return f"{self.user_id} read notice {self.notice_id}"
