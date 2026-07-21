# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django

# Setup Django
sys.path.append("/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from core.models import Tenant
from gamification.models import Badge


def seed_badges():
    # Use the first tenant found (usually 'demo')
    tenant = Tenant.objects.first()
    if not tenant:
        print("No tenant found. Running in default context.")
        return

    # Register the demo database for the script if needed
    from django.conf import settings

    db_path = settings.BASE_DIR / "config" / tenant.db_name
    if "demo" not in settings.DATABASES:
        settings.DATABASES["demo"] = settings.DATABASES["default"].copy()
        settings.DATABASES["demo"]["NAME"] = db_path

    badges_data = [
        {
            "name": "Course Started",
            "description": "Completed your first lesson!",
            "icon_name": "play",
            "criteria_type": "lessons_completed",
            "criteria_value": 1,
            "xp_reward": 50,
        },
        {
            "name": "Quick Learner",
            "description": "Completed 5 lessons.",
            "icon_name": "zap",
            "criteria_type": "lessons_completed",
            "criteria_value": 5,
            "xp_reward": 200,
        },
        {
            "name": "Consistency King",
            "description": "Maintained a 7-day learning streak!",
            "icon_name": "flame",
            "criteria_type": "streak_days",
            "criteria_value": 7,
            "xp_reward": 500,
        },
        {
            "name": "Perfect Score",
            "description": "Achieved 100% on any assessment.",
            "icon_name": "star",
            "criteria_type": "perfect_score",
            "criteria_value": 1,
            "xp_reward": 300,
        },
    ]

    for data in badges_data:
        # Use 'demo' database alias
        badge, created = Badge.objects.using("demo").get_or_create(
            tenant=tenant, name=data["name"], defaults=data
        )
        if created:
            print(f"Created badge: {badge.name}")
        else:
            print(f"Badge already exists: {badge.name}")


if __name__ == "__main__":
    seed_badges()
