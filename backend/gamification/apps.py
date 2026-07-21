# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.apps import AppConfig


class GamificationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "gamification"

    def ready(self):
        import gamification.signals
