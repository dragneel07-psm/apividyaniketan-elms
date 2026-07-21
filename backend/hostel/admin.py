# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib import admin

from .models import HostelAllotment, HostelBlock, HostelRoom


@admin.register(HostelBlock)
class HostelBlockAdmin(admin.ModelAdmin):
    list_display = ["name", "gender", "warden_name", "total_rooms", "is_active"]


@admin.register(HostelRoom)
class HostelRoomAdmin(admin.ModelAdmin):
    list_display = [
        "room_number",
        "block",
        "room_type",
        "capacity",
        "monthly_fee",
        "is_active",
    ]
    list_filter = ["block", "room_type", "is_active"]


@admin.register(HostelAllotment)
class HostelAllotmentAdmin(admin.ModelAdmin):
    list_display = ["student", "room", "check_in_date", "check_out_date", "is_active"]
    list_filter = ["is_active", "room__block"]
