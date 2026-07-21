# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib import admin

from .models import (
    Project,
    ProjectAttachment,
    ProjectMember,
    ProjectSubmission,
    ProjectTask,
    ProjectUpdate,
    RubricTemplate,
)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "status",
        "is_group",
        "mentor",
        "section",
        "due_date",
        "created_at",
    )
    list_filter = ("status", "is_group")
    search_fields = ("title", "description")
    readonly_fields = ("created_at", "updated_at")
    raw_id_fields = ("mentor", "leader", "subject", "section", "created_by", "tenant")


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ("project", "student", "role", "joined_at")
    list_filter = ("role",)
    raw_id_fields = ("project", "student", "tenant")


@admin.register(ProjectTask)
class ProjectTaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "project",
        "assignee",
        "status",
        "weight",
        "due_date",
        "completed_at",
    )
    list_filter = ("status",)
    search_fields = ("title", "description")
    raw_id_fields = ("project", "assignee", "created_by", "tenant")


@admin.register(ProjectUpdate)
class ProjectUpdateAdmin(admin.ModelAdmin):
    list_display = ("project", "kind", "author", "created_at")
    list_filter = ("kind",)
    search_fields = ("body",)
    raw_id_fields = ("project", "task", "author", "tenant")
    readonly_fields = ("created_at",)


@admin.register(ProjectSubmission)
class ProjectSubmissionAdmin(admin.ModelAdmin):
    list_display = ("project", "submitted_by", "submitted_at", "is_late", "is_final")
    list_filter = ("is_late", "is_final")
    raw_id_fields = ("project", "submitted_by", "tenant")


@admin.register(ProjectAttachment)
class ProjectAttachmentAdmin(admin.ModelAdmin):
    list_display = (
        "attachment_id",
        "project",
        "task",
        "uploaded_by",
        "uploaded_at",
        "size_bytes",
    )
    raw_id_fields = ("project", "task", "update", "uploaded_by", "tenant")
    readonly_fields = ("uploaded_at",)


@admin.register(RubricTemplate)
class RubricTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "subject", "is_shared", "updated_at")
    search_fields = ("name", "description")
    raw_id_fields = ("tenant", "owner", "subject")
    readonly_fields = ("created_at", "updated_at")
