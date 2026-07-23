# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib import admin

from .models import Job, SchoolProfile


@admin.register(SchoolProfile)
class SchoolProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "current_academic_year", "established_year")


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = (
        "job_id",
        "task_name",
        "status",
        "state",
        "submitted_at",
        "completed_at",
    )
    list_filter = ("backend", "status")
    search_fields = ("job_id", "task_name")
    readonly_fields = (
        "job_id",
        "submitted_at",
        "started_at",
        "completed_at",
        "created_at",
        "updated_at",
    )
