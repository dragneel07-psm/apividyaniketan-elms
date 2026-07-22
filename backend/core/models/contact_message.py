# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.db import models

from .tenant import Tenant


class ContactMessage(models.Model):
    """A visitor-submitted message from the public school marketing site's
    Contact page. Lives in the shared/public schema (core is a SHARED_APPS
    app) like Tenant/AuditLog — scoped per school via the tenant FK, same
    pattern as those models, not a per-tenant-schema table."""

    DEPARTMENT_CHOICES = [
        ("general", "General Inquiry"),
        ("admissions", "Admissions"),
        ("academics", "Academics"),
        ("finance", "Finance / Fees"),
        ("transport", "Transportation"),
        ("other", "Other"),
    ]

    message_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="contact_messages")
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, default="")
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES, default="general")
    subject = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — {self.subject}"
