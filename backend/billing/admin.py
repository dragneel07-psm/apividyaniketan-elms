# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib import admin

from .models import Subscription, SubscriptionPlan


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "price_monthly",
        "price_yearly",
        "student_limit",
        "created_at",
    )
    search_fields = ("name",)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "plan",
        "status",
        "start_date",
        "end_date",
        "student_limit",
        "ai_token_limit",
    )
    list_filter = ("plan", "status")
    search_fields = ("tenant__name",)
    raw_id_fields = ("tenant", "plan")
    readonly_fields = ("start_date",)
