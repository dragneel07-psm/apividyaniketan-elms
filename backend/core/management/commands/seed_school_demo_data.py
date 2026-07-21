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
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db.models.signals import post_save, pre_save
from django_tenants.utils import schema_context

from academic.models import AcademicClass, Section, Student, Teacher
from academic.signals import sync_student_groups, track_section_change
from core.models import Tenant
from hr_payroll.models import Employee, PayrollPeriod, SalarySlip
from users.models import UserAccount

STAFF_DESIGNATIONS = {
    "accountant": ("Accountant", Decimal("50000")),
    "librarian": ("Librarian", Decimal("35000")),
    "receptionist": ("Receptionist", Decimal("30000")),
    "hr_manager": ("HR Manager", Decimal("55000")),
    "hostel_warden": ("Hostel Warden", Decimal("32000")),
    "transport_manager": ("Transport Manager", Decimal("32000")),
}
TEACHER_DESIGNATION = ("Subject Teacher", Decimal("45000"))
EMPLOYEE_JOIN_DATE = date(2024, 4, 1)

EARLY_YEARS_SUBJECTS = ["English", "Nepali", "Mathematics", "Art & Craft", "General Awareness"]
CORE_SUBJECTS = [
    "English", "Nepali", "Mathematics", "Science",
    "Social Studies", "Computer Science", "Health & Physical Education",
]
N_CLASS_TEACHERS = 11  # one per grade, Nursery -> Grade 8

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
            self._seed_hr_records(tenant)
            self._seed_academic_assignments(classes)

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

    def _seed_hr_records(self, tenant: Tenant) -> None:
        # hr_payroll.Employee/PayrollPeriod/SalarySlip are a separate data
        # model from users.UserAccount + academic.Teacher — creating an
        # account doesn't create an HR profile. Backfill one for every
        # staff/teacher account that doesn't have one yet, plus a salary
        # slip in a shared finalized period so the payroll module (and the
        # teacher self-service payslip page) actually has data to show.
        period, _ = PayrollPeriod.objects.get_or_create(
            tenant=tenant,
            month=3,
            year=2026,
            defaults={
                "name": "March 2026",
                "start_date": date(2026, 3, 1),
                "end_date": date(2026, 3, 31),
                "status": PayrollPeriod.STATUS_FINALIZED,
            },
        )

        employees_created = 0
        slips_created = 0
        for user in UserAccount.objects.filter(tenant=tenant, role__in=["teacher", "staff"]):
            if user.role == "teacher":
                designation, basic_salary = TEACHER_DESIGNATION
            else:
                designation, basic_salary = STAFF_DESIGNATIONS.get(user.staff_role, ("Staff", Decimal("35000")))

            employee, was_created = Employee.objects.get_or_create(
                user=user,
                defaults={
                    "tenant": tenant,
                    "designation": designation,
                    "join_date": EMPLOYEE_JOIN_DATE,
                },
            )
            if was_created:
                employees_created += 1

            _, slip_created = SalarySlip.objects.get_or_create(
                employee=employee,
                payroll_period=period,
                defaults={
                    "tenant": tenant,
                    "basic_salary": basic_salary,
                    "hra": (basic_salary * Decimal("0.1")).quantize(Decimal("1")),
                    "status": SalarySlip.STATUS_FINALIZED,
                },
            )
            if slip_created:
                slips_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"HR: {employees_created} employee profiles created, "
                f"{slips_created} salary slips created (period: {period.name})."
            )
        )

    def _seed_academic_assignments(self, classes: list[Section]) -> None:
        # Assigns every teacher to subjects across all classes (round-robin),
        # and designates one class teacher per grade (Nursery -> Grade 8) via
        # Teacher.designation + Teacher.assigned_classes — there's no
        # dedicated "class teacher" field on Section/AcademicClass itself.
        from academic.models import Subject
        from academic.services.academic_year_service import ensure_current_academic_year

        # SubjectViewSet defaults non-teacher roles to whatever the app
        # considers the *current* academic year — using this helper instead
        # of hardcoding a year keeps seeded Subjects visible through the
        # actual API regardless of what "today" is when this command runs.
        year = ensure_current_academic_year()

        teachers = list(Teacher.objects.select_related("user").order_by("user__email"))
        if not teachers:
            self.stdout.write(self.style.WARNING("No teachers found; skipping subject/class-teacher assignment."))
            return

        subjects_created = 0
        cycle = 0
        for section in classes:
            cls = section.academic_class
            is_early_years = cls.name in {"Nursery", "LKG", "UKG"}
            subject_names = EARLY_YEARS_SUBJECTS if is_early_years else CORE_SUBJECTS
            for subject_name in subject_names:
                teacher = teachers[cycle % len(teachers)]
                cycle += 1
                code = f"{subject_name[:3].upper()}{cls.order}"
                _, was_created = Subject.objects.get_or_create(
                    name=subject_name,
                    academic_class=cls,
                    academic_year=year,
                    defaults={"code": code, "teacher": teacher, "is_active": True},
                )
                if was_created:
                    subjects_created += 1

        class_teacher_count = min(N_CLASS_TEACHERS, len(classes), len(teachers))
        for i in range(class_teacher_count):
            teacher = teachers[i]
            teacher.designation = "class_teacher"
            teacher.assigned_classes.add(classes[i].academic_class)
            teacher.save(update_fields=["designation"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Academic: {subjects_created} subject assignments created, "
                f"{class_teacher_count} class teachers assigned (Nursery -> Grade 8)."
            )
        )
