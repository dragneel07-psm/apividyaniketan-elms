# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib import admin

from .models import AIInteractionLog


@admin.register(AIInteractionLog)
class AIInteractionLogAdmin(admin.ModelAdmin):
    list_display = ("tenant", "user", "feature_used", "total_tokens", "timestamp")
    list_filter = ("feature_used", "tenant")
    search_fields = ("user__username", "tenant__name")
    raw_id_fields = ("tenant", "user")
    readonly_fields = ("timestamp",)
    date_hierarchy = "timestamp"
