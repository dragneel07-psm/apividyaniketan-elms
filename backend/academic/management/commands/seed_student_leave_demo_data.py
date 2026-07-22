# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Seeds StudentLeave demo data (leave requests students/parents submit and
teachers/admin review) for an existing school tenant, so the teacher
portal's Leaves page has pending/approved/rejected requests to act on.
Idempotent (get_or_create throughout).

Assumes seed_school_demo_data has already been run for the target schema.

Usage:
  python manage.py seed_student_leave_demo_data --schema apividyaniketan
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django_tenants.utils import schema_context

from academic.models import Parent, Student, Teacher
from academic.models.student_leave import StudentLeave
from core.models import Tenant
from users.models import UserAccount

LEAVE_REASONS = {
    "sick": "Feeling unwell with fever; advised rest by the family doctor.",
    "personal": "Attending to a personal family matter.",
    "family": "Family emergency requiring travel out of the city.",
    "event": "Representing the school at an inter-school competition.",
    "other": "Requesting leave for an unavoidable commitment.",
}

# Every 5th student gets a leave request; the request's outcome cycles
# through this sequence for variety.
STATUS_CYCLE = ["approved", "pending", "rejected", "approved", "pending"]


class Command(BaseCommand):
    help = (
        "Seed StudentLeave demo data (pending/approved/rejected requests) "
        "for an existing tenant. Run seed_school_demo_data first."
    )

    def add_arguments(self, parser):
        parser.add_argument("--schema", required=True, help="Tenant schema to seed into.")
        parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducible dates.")

    def handle(self, *args, **options):
        schema = str(options["schema"]).strip().lower()
        rng = random.Random(int(options["seed"]))

        if not schema or schema == "public":
            raise CommandError("--schema must be a non-public tenant schema.")

        tenant = Tenant.objects.filter(schema_name=schema).first()
        if not tenant:
            raise CommandError(f"Tenant schema '{schema}' not found.")

        with schema_context(schema):
            students = list(
                Student.objects.filter(user__tenant=tenant, academic_class__isnull=False)
                .select_related("user", "academic_class")
                .order_by("student_id")
            )
            if not students:
                raise CommandError(
                    f"No students found in schema '{schema}'. Run seed_school_demo_data first."
                )
            admin_user = UserAccount.objects.filter(tenant=tenant, role="admin").order_by("email").first()
            class_teachers = {
                academic_class_id: teacher.user
                for teacher in Teacher.objects.filter(designation="class_teacher").select_related("user").prefetch_related("assigned_classes")
                for academic_class_id in teacher.assigned_classes.values_list("id", flat=True)
            }

            today = timezone.localdate()
            leaves_created = 0
            for idx, student in enumerate(students):
                if idx % 5 != 0:
                    continue
                status = STATUS_CYCLE[(idx // 5) % len(STATUS_CYCLE)]
                leave_type = rng.choice(list(LEAVE_REASONS.keys()))
                start_date = today - timedelta(days=rng.randint(3, 45))
                end_date = start_date + timedelta(days=rng.randint(0, 2))
                applied_by = _first_parent_user(student) or student.user
                reviewer = class_teachers.get(student.academic_class_id, admin_user)

                defaults = {
                    "applied_by": applied_by,
                    "leave_type": leave_type,
                    "start_date": start_date,
                    "end_date": end_date,
                    "reason": LEAVE_REASONS[leave_type],
                    "status": status,
                }
                if status != "pending":
                    defaults.update(
                        {
                            "reviewed_by": reviewer,
                            "reviewed_at": timezone.now() - timedelta(days=rng.randint(0, 2)),
                            "review_remarks": "Approved as requested." if status == "approved" else "Insufficient supporting information provided.",
                        }
                    )

                _, was_created = StudentLeave.objects.get_or_create(
                    student=student,
                    start_date=start_date,
                    defaults=defaults,
                )
                if was_created:
                    leaves_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nStudent leave demo data seeded into schema={schema}: {leaves_created} leave requests created."
            )
        )


def _first_parent_user(student):
    parent = Parent.objects.filter(students=student).first()
    return parent.user if parent else None
