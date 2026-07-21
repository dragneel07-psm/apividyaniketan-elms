# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Seeds non-destructive dummy data into an existing school tenant for testing:
staff (each with a different staff_role), teachers, and students spread
across Nursery/LKG/UKG and Grade 1-8. Idempotent (get_or_create throughout)
and scoped to a single tenant schema — never touches other tenants.

Usage:
  python manage.py seed_school_demo_data --schema apividyaniketan
  python manage.py seed_school_demo_data --schema apividyaniketan --students 50 --teachers 5 --staff 3
"""

import random

from django.core.management.base import BaseCommand, CommandError
from django.db.models.signals import post_save, pre_save
from django_tenants.utils import schema_context

from academic.models import AcademicClass, Section, Student, Teacher
from academic.signals import sync_student_groups, track_section_change
from core.models import Tenant
from users.models import UserAccount

GRADE_LEVELS = [
    "Nursery", "LKG", "UKG",
    "Grade 1", "Grade 2", "Grade 3", "Grade 4",
    "Grade 5", "Grade 6", "Grade 7", "Grade 8",
]

STAFF_ROLES = ["accountant", "librarian", "receptionist", "hr_manager", "hostel_warden", "transport_manager"]

FIRST_NAMES_M = [
    "Aarav", "Bibek", "Suresh", "Anish", "Kiran", "Prakash", "Rajesh", "Nabin",
    "Sandeep", "Deepak", "Ramesh", "Bishal", "Sujan", "Pratik", "Ashish",
    "Rohit", "Manish", "Sagar", "Nikesh", "Yubraj",
]
FIRST_NAMES_F = [
    "Sita", "Gita", "Anjali", "Puja", "Sunita", "Kamala", "Nisha", "Priya",
    "Sabina", "Rekha", "Sarita", "Bimala", "Sushila", "Kabita", "Rachana",
    "Manisha", "Sabitri", "Laxmi", "Rita", "Sneha",
]
LAST_NAMES = [
    "Sharma", "Thapa", "Gurung", "Shrestha", "Tamang", "Rai", "Magar",
    "Karki", "Adhikari", "Poudel", "Basnet", "Khadka", "Bhattarai",
    "Acharya", "Neupane", "Pandey", "Subedi", "Bista", "Chhetri", "Lama",
]

STUDENT_PASSWORD = "Student@2026!"
TEACHER_PASSWORD = "Teacher@2026!"
STAFF_PASSWORD = "Staff@2026!"


def _random_name(rng: random.Random) -> tuple[str, str]:
    first = rng.choice(FIRST_NAMES_M + FIRST_NAMES_F)
    last = rng.choice(LAST_NAMES)
    return first, last


class Command(BaseCommand):
    help = "Seed dummy staff/teacher/student data into an existing tenant for testing."

    def add_arguments(self, parser):
        parser.add_argument("--schema", required=True, help="Tenant schema to seed into.")
        parser.add_argument("--students", type=int, default=200)
        parser.add_argument("--teachers", type=int, default=10)
        parser.add_argument("--staff", type=int, default=5)
        parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducible names.")

    def handle(self, *args, **options):
        schema = str(options["schema"]).strip().lower()
        n_students = int(options["students"])
        n_teachers = int(options["teachers"])
        n_staff = int(options["staff"])
        rng = random.Random(int(options["seed"]))

        if not schema or schema == "public":
            raise CommandError("--schema must be a non-public tenant schema.")
        if n_staff > len(STAFF_ROLES):
            raise CommandError(f"--staff cannot exceed {len(STAFF_ROLES)} (one per distinct staff_role).")

        tenant = Tenant.objects.filter(schema_name=schema).first()
        if not tenant:
            raise CommandError(f"Tenant schema '{schema}' not found.")

        with schema_context(schema):
            classes = self._ensure_classes()
            self._seed_staff(tenant, n_staff)
            self._seed_teachers(tenant, n_teachers, rng)
            self._seed_students(tenant, n_students, classes, rng)

        self.stdout.write(self.style.SUCCESS(f"\nDemo data seeded into schema={schema}."))
        self.stdout.write("Credentials (shared per role tier):")
        self.stdout.write(f"  Staff:    staff_<role>@{schema}.local / {STAFF_PASSWORD}")
        self.stdout.write(f"  Teachers: teacher1..{n_teachers}@{schema}.local / {TEACHER_PASSWORD}")
        self.stdout.write(f"  Students: student1..{n_students}@{schema}.local / {STUDENT_PASSWORD}")

    def _ensure_classes(self) -> list[Section]:
        sections = []
        for order, name in enumerate(GRADE_LEVELS, start=1):
            cls, _ = AcademicClass.objects.get_or_create(name=name, defaults={"order": order})
            section, _ = Section.objects.get_or_create(
                name="A", academic_class=cls, defaults={"capacity": 40}
            )
            sections.append(section)
        self.stdout.write(self.style.SUCCESS(f"Ensured {len(sections)} classes (Nursery/LKG/UKG + Grade 1-8)."))
        return sections

    def _seed_staff(self, tenant: Tenant, count: int) -> None:
        created = 0
        for staff_role in STAFF_ROLES[:count]:
            email = f"staff_{staff_role}@{tenant.schema_name}.local"
            first, last = staff_role.replace("_", " ").title().split(" ", 1) if "_" in staff_role else (staff_role.title(), "Staff")
            user, was_created = UserAccount.objects.get_or_create(
                email=email,
                defaults={
                    "username": email.split("@", 1)[0],
                    "first_name": first,
                    "last_name": last,
                    "role": "staff",
                    "staff_role": staff_role,
                    "is_staff": True,
                    "is_active": True,
                    "tenant_id": tenant.id,
                },
            )
            if was_created:
                user.set_password(STAFF_PASSWORD)
                user.save(update_fields=["password"])
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Staff: {created} created, {count - created} already existed."))

    def _seed_teachers(self, tenant: Tenant, count: int, rng: random.Random) -> None:
        created = 0
        for i in range(1, count + 1):
            email = f"teacher{i}@{tenant.schema_name}.local"
            first, last = _random_name(rng)
            user, was_created = UserAccount.objects.get_or_create(
                email=email,
                defaults={
                    "username": email.split("@", 1)[0],
                    "first_name": first,
                    "last_name": last,
                    "role": "teacher",
                    "is_active": True,
                    "tenant_id": tenant.id,
                },
            )
            if was_created:
                user.set_password(TEACHER_PASSWORD)
                user.save(update_fields=["password"])
                created += 1
            Teacher.objects.get_or_create(user=user)
        self.stdout.write(self.style.SUCCESS(f"Teachers: {created} created, {count - created} already existed."))

    def _seed_students(self, tenant: Tenant, count: int, sections: list[Section], rng: random.Random) -> None:
        # Disconnect the section-change/group-sync signals during bulk seeding
        # — same guard setup_qa_tenant.py uses, avoids per-row conversation
        # group syncing overhead and cross-schema signal side effects.
        post_save.disconnect(sync_student_groups, sender=Student)
        pre_save.disconnect(track_section_change, sender=Student)
        created = 0
        try:
            for i in range(1, count + 1):
                section = sections[(i - 1) % len(sections)]
                email = f"student{i}@{tenant.schema_name}.local"
                first, last = _random_name(rng)
                user, was_created = UserAccount.objects.get_or_create(
                    email=email,
                    defaults={
                        "username": email.split("@", 1)[0],
                        "first_name": first,
                        "last_name": last,
                        "role": "student",
                        "is_active": True,
                        "tenant_id": tenant.id,
                    },
                )
                if was_created:
                    user.set_password(STUDENT_PASSWORD)
                    user.save(update_fields=["password"])
                    created += 1
                Student.objects.get_or_create(
                    user=user,
                    defaults={"academic_class": section.academic_class, "section": section},
                )
        finally:
            post_save.connect(sync_student_groups, sender=Student)
            pre_save.connect(track_section_change, sender=Student)
        self.stdout.write(self.style.SUCCESS(f"Students: {created} created, {count - created} already existed."))
