# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import models
from django.utils import timezone


class Job(models.Model):
    """Background job status persisted for polling and auditability."""

    job_id = models.CharField(max_length=64, primary_key=True)
    task_name = models.CharField(max_length=255)
    tenant_schema = models.CharField(max_length=63, default="public", db_index=True)
    backend = models.CharField(max_length=16, default="sync")
    status = models.CharField(max_length=24, default="queued", db_index=True)
    state = models.CharField(max_length=32, default="PENDING")

    submitted_at = models.DateTimeField(default=timezone.now, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    result = models.JSONField(null=True, blank=True)
    error = models.TextField(blank=True)
    meta = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self) -> str:
        return f"{self.job_id} ({self.status})"
