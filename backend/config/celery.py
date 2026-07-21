# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import os

try:
    from celery import Celery
    from celery.schedules import crontab
except Exception:

    class Celery:  # type: ignore[override]
        def __init__(self, *_args, **_kwargs):
            self.name = "config"

        def config_from_object(self, *_args, **_kwargs):
            return None

        def autodiscover_tasks(self, *_args, **_kwargs):
            return None

    def crontab(*_args, **_kwargs):  # type: ignore[misc]
        return None


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks(
    [
        "academic",
        "ai_engine",
        "billing",
        "billing_school",
        "hr_payroll",
        "library",
        "notifications",
        "projects",
        "transport",
        "hostel",
    ]
)

try:
    # Route heavy AI/LLM tasks to a dedicated queue so they don't starve
    # notifications or billing tasks. Start the worker with --queues=default,ai
    app.conf.task_default_queue = "default"
    app.conf.task_routes = {
        "ai.*": {"queue": "ai"},
        "ai_engine.*": {"queue": "ai"},
    }

    app.conf.beat_schedule = {
        "send-fee-reminders": {
            "task": "billing_school.tasks.send_fee_due_reminders",
            "schedule": crontab(hour=8, minute=0),
        },
        "send-parent-digests": {
            "task": "ai.parent_digest",
            "schedule": crontab(hour=7, minute=0),  # daily at 7 AM
        },
        "library-mark-overdue": {
            "task": "library.mark_overdue_book_issues",
            "schedule": crontab(hour=1, minute=0),  # daily at 1 AM
        },
        "projects-scan-overdue-tasks": {
            "task": "projects.scan_overdue_tasks",
            "schedule": crontab(minute=0),  # hourly on the hour
        },
        "projects-scan-due-soon": {
            "task": "projects.scan_due_soon_projects",
            "schedule": crontab(hour=9, minute=0),  # daily at 9 AM
        },
        "billing-apply-late-fees": {
            "task": "billing.apply_late_fees",
            "schedule": crontab(hour=2, minute=30),  # daily at 02:30
        },
    }
except Exception:
    pass
