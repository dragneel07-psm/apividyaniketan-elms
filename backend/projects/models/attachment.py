# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models

from core.models.tenant import Tenant
from core.upload_validation import document_upload_validators
from core.utils.storage_paths import (
    schema_from_current_connection,
    tenant_scoped_upload_path,
)


def project_attachment_upload_to(instance, filename):
    return tenant_scoped_upload_path(
        schema_from_current_connection(), "project_attachments", filename
    )


class ProjectAttachment(models.Model):
    attachment_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)

    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="attachments"
    )
    task = models.ForeignKey(
        "projects.ProjectTask",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="attachments",
    )
    update = models.ForeignKey(
        "projects.ProjectUpdate",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="attachments",
    )

    file = models.FileField(
        upload_to=project_attachment_upload_to,
        validators=document_upload_validators(),
    )
    mime_type = models.CharField(max_length=100, blank=True)
    size_bytes = models.PositiveBigIntegerField(default=0)

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="project_attachments",
        db_constraint=False,
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"Attachment {self.attachment_id} on {self.project}"
