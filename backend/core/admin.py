# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib import admin
from django_tenants.admin import TenantAdminMixin

from .models import Job, Tenant


@admin.register(Tenant)
class TenantAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ("name", "schema_name", "type", "status", "created_at")
    list_filter = ("type", "status")
    search_fields = ("name", "schema_name")


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = (
        "job_id",
        "task_name",
        "tenant_schema",
        "status",
        "state",
        "submitted_at",
        "completed_at",
    )
    list_filter = ("backend", "status", "tenant_schema")
    search_fields = ("job_id", "task_name", "tenant_schema")
    readonly_fields = (
        "job_id",
        "submitted_at",
        "started_at",
        "completed_at",
        "created_at",
        "updated_at",
    )
