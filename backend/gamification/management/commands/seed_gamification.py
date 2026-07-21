# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.core.management.base import BaseCommand, CommandError

from core.models import Tenant
from gamification.models import Badge

BADGES_DATA = [
    # ─── Lesson milestones ────────────────────────────────────────────────────
    {
        "name": "First Step",
        "description": "Completed your first lesson — the journey begins!",
        "icon_name": "footprints",
        "criteria_type": "lessons_completed",
        "criteria_value": 1,
        "xp_reward": 50,
    },
    {
        "name": "On Fire",
        "description": "Completed 5 lessons — you're on a roll!",
        "icon_name": "flame",
        "criteria_type": "lessons_completed",
        "criteria_value": 5,
        "xp_reward": 150,
    },
    {
        "name": "Dedicated Learner",
        "description": "Completed 10 lessons — dedication pays off.",
        "icon_name": "book-open",
        "criteria_type": "lessons_completed",
        "criteria_value": 10,
        "xp_reward": 300,
    },
    {
        "name": "Scholar",
        "description": "Completed 20 lessons — true scholarly commitment!",
        "icon_name": "graduation-cap",
        "criteria_type": "lessons_completed",
        "criteria_value": 20,
        "xp_reward": 500,
    },
    {
        "name": "Knowledge Master",
        "description": "Completed 50 lessons — you are a master of knowledge!",
        "icon_name": "trophy",
        "criteria_type": "lessons_completed",
        "criteria_value": 50,
        "xp_reward": 1000,
    },
    # ─── Assessment / quiz ────────────────────────────────────────────────────
    {
        "name": "Quiz Starter",
        "description": "Passed your first assessment.",
        "icon_name": "check-circle",
        "criteria_type": "assessments_passed",
        "criteria_value": 1,
        "xp_reward": 75,
    },
    {
        "name": "Quiz Ace",
        "description": "Passed 5 assessments.",
        "icon_name": "award",
        "criteria_type": "assessments_passed",
        "criteria_value": 5,
        "xp_reward": 200,
    },
    {
        "name": "Assessment Champion",
        "description": "Passed 15 assessments — an academic champion!",
        "icon_name": "medal",
        "criteria_type": "assessments_passed",
        "criteria_value": 15,
        "xp_reward": 450,
    },
    {
        "name": "Quiz Master",
        "description": "Scored 100% on a quiz — perfection!",
        "icon_name": "star",
        "criteria_type": "perfect_score",
        "criteria_value": 1,
        "xp_reward": 100,
    },
    {
        "name": "Perfectionist",
        "description": "Achieved 100% on 5 quizzes — consistently flawless!",
        "icon_name": "sparkles",
        "criteria_type": "perfect_score",
        "criteria_value": 5,
        "xp_reward": 400,
    },
    # ─── Streak ───────────────────────────────────────────────────────────────
    {
        "name": "Consistent",
        "description": "Maintained a 3-day learning streak.",
        "icon_name": "zap",
        "criteria_type": "streak_days",
        "criteria_value": 3,
        "xp_reward": 80,
    },
    {
        "name": "Weekly Warrior",
        "description": "Kept a 7-day streak — one full week of learning!",
        "icon_name": "calendar-check",
        "criteria_type": "streak_days",
        "criteria_value": 7,
        "xp_reward": 200,
    },
    {
        "name": "Monthly Champion",
        "description": "30-day streak — a whole month of commitment!",
        "icon_name": "crown",
        "criteria_type": "streak_days",
        "criteria_value": 30,
        "xp_reward": 700,
    },
    # ─── Early bird ───────────────────────────────────────────────────────────
    {
        "name": "Early Bird",
        "description": "Submitted an assignment before the deadline with time to spare.",
        "icon_name": "sun",
        "criteria_type": "early_bird",
        "criteria_value": 1,
        "xp_reward": 60,
    },
    {
        "name": "Always Ahead",
        "description": "Made 5 early submissions — planning ahead is your superpower!",
        "icon_name": "alarm-check",
        "criteria_type": "early_bird",
        "criteria_value": 5,
        "xp_reward": 250,
    },
]


class Command(BaseCommand):
    help = "Seeds default gamification badges for all tenants (or a specific one with --schema)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--schema",
            type=str,
            default=None,
            help="Seed only this tenant schema (subdomain). Omit to seed all tenants.",
        )

    def handle(self, *args, **options):
        schema = options.get("schema")

        if schema:
            tenants = Tenant.objects.filter(subdomain=schema)
            if not tenants.exists():
                raise CommandError(f"No tenant found with subdomain '{schema}'")
        else:
            tenants = Tenant.objects.all()

        if not tenants.exists():
            self.stdout.write(
                self.style.WARNING(
                    "No tenants found. Run init_prod or seed_data first."
                )
            )
            return

        from django.conf import settings
        from django.db import connections

        from core.middleware.tenant import _thread_locals

        total_created = 0
        total_updated = 0

        for tenant in tenants:
            self.stdout.write(
                f"\nProcessing tenant: {tenant.name} ({tenant.subdomain})"
            )

            # Set thread-local routing context
            _thread_locals.tenant = tenant
            _thread_locals.db_alias = tenant.db_alias

            # Register DB alias dynamically if not already registered
            if tenant.db_alias not in settings.DATABASES:
                new_db_config = settings.DATABASES["default"].copy()
                new_db_config["NAME"] = settings.BASE_DIR / tenant.db_name
                settings.DATABASES[tenant.db_alias] = new_db_config
                connections.databases[tenant.db_alias] = new_db_config

            try:
                for badge_data in BADGES_DATA:
                    badge, created = Badge.objects.get_or_create(
                        tenant=tenant,
                        name=badge_data["name"],
                        defaults=badge_data,
                    )
                    if created:
                        total_created += 1
                        self.stdout.write(
                            self.style.SUCCESS(f"  + Created: {badge.name}")
                        )
                    else:
                        # Update all fields so existing badges stay in sync with the catalog
                        for key, value in badge_data.items():
                            setattr(badge, key, value)
                        badge.save()
                        total_updated += 1
                        self.stdout.write(f"  . Updated: {badge.name}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ Error for {tenant.name}: {e}"))
            finally:
                if hasattr(_thread_locals, "tenant"):
                    del _thread_locals.tenant
                if hasattr(_thread_locals, "db_alias"):
                    del _thread_locals.db_alias

        self.stdout.write(
            self.style.SUCCESS(
                f"\nGamification seeding complete! "
                f"Created: {total_created}  Updated: {total_updated}"
            )
        )
