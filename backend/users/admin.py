# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import UserAccount


@admin.register(UserAccount)
class UserAccountAdmin(BaseUserAdmin):
    list_display = ("username", "email", "first_name", "last_name", "role", "tenant")
    list_filter = ("role", "tenant", "is_staff", "is_active")
    search_fields = ("username", "email", "first_name", "last_name")

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Additional Info", {"fields": ("role", "tenant")}),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (
            "Additional Info",
            {"fields": ("role", "tenant", "email", "first_name", "last_name")},
        ),
    )
