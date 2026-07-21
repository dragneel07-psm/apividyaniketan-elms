# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Management command: seed_attendance
====================================
Generates realistic attendance history for every student × subject combination
in the current academic year.

Usage:
    python manage.py seed_attendance [--days 30] [--clear]

Options:
    --days N    Number of past school days to generate (default: 30)
    --clear     Delete all existing attendance records before seeding
"""

import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction

from academic.models import Attendance, Student, Subject
from academic.services.academic_year_service import ensure_current_academic_year


def _school_days(end: date, count: int):
    """Return the last `count` weekdays on or before `end`."""
    days = []
    cursor = end
    while len(days) < count:
        if cursor.weekday() < 5:  # Mon–Fri
            days.append(cursor)
        cursor -= timedelta(days=1)
    return days  # newest first


def _status() -> str:
    """Realistic attendance distribution: 83% present, 12% absent, 5% late."""
    r = random.random()
    if r < 0.83:
        return "present"
    if r < 0.95:
        return "absent"
    return "late"


class Command(BaseCommand):
    help = "Seed realistic attendance history for all students in the current academic year"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Number of past school days to generate (default: 30)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing attendance records before seeding",
        )

    def handle(self, *args, **options):
        days_count = options["days"]
        do_clear = options["clear"]

        current_year = ensure_current_academic_year()
        if not current_year:
            self.stdout.write(
                self.style.ERROR("No current academic year found. Aborting.")
            )
            return

        self.stdout.write(f"Academic year: {current_year.name}")

        if do_clear:
            deleted, _ = Attendance.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(f"Deleted {deleted} existing attendance records.")
            )

        # Subjects for this academic year
        subjects = list(
            Subject.objects.filter(academic_year=current_year).select_related(
                "academic_class"
            )
        )
        if not subjects:
            self.stdout.write(
                self.style.WARNING(
                    "No subjects found for the current academic year. "
                    "Try running the main seed script first, or pass ?academic_year= to match."
                )
            )
            # Fall back: use ALL subjects if none match the current year
            subjects = list(Subject.objects.select_related("academic_class").all())
            if not subjects:
                self.stdout.write(self.style.ERROR("No subjects at all. Aborting."))
                return
            self.stdout.write(
                f"Falling back to all {len(subjects)} subjects (no year filter)."
            )

        # Build a map: academic_class_id → [subjects]
        class_subjects: dict[int, list] = {}
        for subj in subjects:
            class_subjects.setdefault(subj.academic_class_id, []).append(subj)

        students = list(
            Student.objects.select_related("academic_class").filter(
                academic_class_id__in=class_subjects.keys()
            )
        )
        if not students:
            self.stdout.write(
                self.style.ERROR(
                    "No students found in classes with subjects. Aborting."
                )
            )
            return

        school_days = _school_days(date.today(), days_count)
        self.stdout.write(
            f"Seeding {days_count} days × {len(students)} students × up to N subjects …"
        )

        created_count = 0
        skipped_count = 0

        records = []
        seen = set()

        for student in students:
            subj_list = class_subjects.get(student.academic_class_id, [])
            if not subj_list:
                continue
            for day in school_days:
                # Each student attends each subject once per day
                for subj in subj_list:
                    key = (student.pk, subj.pk, day)
                    if key in seen:
                        skipped_count += 1
                        continue
                    seen.add(key)
                    records.append(
                        Attendance(
                            student=student,
                            subject=subj,
                            date=day,
                            status=_status(),
                        )
                    )

        # Bulk-insert, ignoring conflicts (unique_together guard)
        with transaction.atomic():
            batch_size = 500
            for i in range(0, len(records), batch_size):
                batch = records[i : i + batch_size]
                objs = Attendance.objects.bulk_create(batch, ignore_conflicts=True)
                created_count += len(objs)

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created_count} attendance records "
                f"({skipped_count} already existed / skipped)."
            )
        )
