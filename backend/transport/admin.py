# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib import admin

from .models import Route, StudentTransportAssignment, Vehicle


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active", "created_at"]
    list_filter = ["is_active"]


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ["plate_number", "model", "driver_name", "route", "is_active"]
    list_filter = ["is_active", "route"]


@admin.register(StudentTransportAssignment)
class StudentTransportAssignmentAdmin(admin.ModelAdmin):
    list_display = [
        "student",
        "route",
        "vehicle",
        "pickup_stop",
        "monthly_fee",
        "is_active",
    ]
    list_filter = ["is_active", "route"]
