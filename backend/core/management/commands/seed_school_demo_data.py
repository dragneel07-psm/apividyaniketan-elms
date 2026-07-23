# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Seeds non-destructive dummy data into the school: staff (each with a
different staff_role), teachers, and students spread across Nursery/LKG/UKG
and Grade 1-8. Idempotent (get_or_create throughout).

Usage:
  python manage.py seed_school_demo_data
  python manage.py seed_school_demo_data --students 50 --teachers 5 --staff 3
"""

import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db.models.signals import post_save, pre_save
from django.utils import timezone

from academic.models import AcademicClass, Section, Student, Teacher
from academic.signals import sync_student_groups, track_section_change
from hr_payroll.models import Employee, PayrollPeriod, SalarySlip
from users.models import UserAccount

DEMO_EMAIL_DOMAIN = "school.local"

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

# (name, frequency, coa_income_code) tiered by grade level below
FEE_TYPES = [
    ("Tuition Fee", "monthly", "4100"),
    ("Admission Fee", "one_time", "4110"),
    ("Examination Fee", "term", "4120"),
    ("Transport Fee", "monthly", "4130"),
]
FEE_TIERS = {
    # class name set -> {fee name: amount}
    "early_years": {"Tuition Fee": Decimal("3000"), "Admission Fee": Decimal("4000"), "Examination Fee": Decimal("500"), "Transport Fee": Decimal("1200")},
    "primary": {"Tuition Fee": Decimal("4000"), "Admission Fee": Decimal("5000"), "Examination Fee": Decimal("800"), "Transport Fee": Decimal("1500")},
    "middle": {"Tuition Fee": Decimal("5000"), "Admission Fee": Decimal("6000"), "Examination Fee": Decimal("1000"), "Transport Fee": Decimal("1800")},
}
PAYMENT_METHOD_ACCOUNT = {"cash": "1010", "bank_transfer": "1020", "cheque": "1020", "card": "1020", "online": "1030"}
EXPENSE_CATEGORY_ACCOUNT = {
    "salary": "5100", "maintenance": "5340", "utilities": "5320",
    "supplies": "5310", "transport": "5350", "events": "5230", "other": "5900",
}
EXPENSE_ROWS = [
    ("Teaching Staff Salary - Monthly", "salary", Decimal("450000")),
    ("Electricity & Water Bill", "utilities", Decimal("18000")),
    ("Building & Furniture Repairs", "maintenance", Decimal("12500")),
    ("Classroom & Office Supplies", "supplies", Decimal("8500")),
    ("School Bus Fuel & Maintenance", "transport", Decimal("22000")),
    ("Annual Sports Day Expenses", "events", Decimal("15000")),
]

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
    help = "Seed dummy staff/teacher/student data for testing."

    def add_arguments(self, parser):
        parser.add_argument("--students", type=int, default=200)
        parser.add_argument("--teachers", type=int, default=10)
        parser.add_argument("--staff", type=int, default=5)
        parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducible names.")

    def handle(self, *args, **options):
        n_students = int(options["students"])
        n_teachers = int(options["teachers"])
        n_staff = int(options["staff"])
        rng = random.Random(int(options["seed"]))

        if n_staff > len(STAFF_ROLES):
            raise CommandError(f"--staff cannot exceed {len(STAFF_ROLES)} (one per distinct staff_role).")

        classes = self._ensure_classes()
        self._seed_staff(n_staff)
        self._seed_teachers(n_teachers, rng)
        self._seed_students(n_students, classes, rng)
        self._seed_hr_records()
        self._seed_academic_assignments(classes)
        self._seed_finance_records(classes, rng)

        self.stdout.write(self.style.SUCCESS("\nDemo data seeded."))
        self.stdout.write("Credentials (shared per role tier):")
        self.stdout.write(f"  Staff:    staff_<role>@{DEMO_EMAIL_DOMAIN} / {STAFF_PASSWORD}")
        self.stdout.write(f"  Teachers: teacher1..{n_teachers}@{DEMO_EMAIL_DOMAIN} / {TEACHER_PASSWORD}")
        self.stdout.write(f"  Students: student1..{n_students}@{DEMO_EMAIL_DOMAIN} / {STUDENT_PASSWORD}")

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

    def _seed_staff(self, count: int) -> None:
        created = 0
        for staff_role in STAFF_ROLES[:count]:
            email = f"staff_{staff_role}@{DEMO_EMAIL_DOMAIN}"
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
                },
            )
            if was_created:
                user.set_password(STAFF_PASSWORD)
                user.save(update_fields=["password"])
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Staff: {created} created, {count - created} already existed."))

    def _seed_teachers(self, count: int, rng: random.Random) -> None:
        created = 0
        for i in range(1, count + 1):
            email = f"teacher{i}@{DEMO_EMAIL_DOMAIN}"
            first, last = _random_name(rng)
            user, was_created = UserAccount.objects.get_or_create(
                email=email,
                defaults={
                    "username": email.split("@", 1)[0],
                    "first_name": first,
                    "last_name": last,
                    "role": "teacher",
                    "is_active": True,
                },
            )
            if was_created:
                user.set_password(TEACHER_PASSWORD)
                user.save(update_fields=["password"])
                created += 1
            Teacher.objects.get_or_create(user=user)
        self.stdout.write(self.style.SUCCESS(f"Teachers: {created} created, {count - created} already existed."))

    def _seed_students(self, count: int, sections: list[Section], rng: random.Random) -> None:
        # Disconnect the section-change/group-sync signals during bulk seeding
        # to avoid per-row conversation group syncing overhead.
        post_save.disconnect(sync_student_groups, sender=Student)
        pre_save.disconnect(track_section_change, sender=Student)
        created = 0
        try:
            for i in range(1, count + 1):
                section = sections[(i - 1) % len(sections)]
                email = f"student{i}@{DEMO_EMAIL_DOMAIN}"
                first, last = _random_name(rng)
                user, was_created = UserAccount.objects.get_or_create(
                    email=email,
                    defaults={
                        "username": email.split("@", 1)[0],
                        "first_name": first,
                        "last_name": last,
                        "role": "student",
                        "is_active": True,
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

    def _seed_hr_records(self) -> None:
        # hr_payroll.Employee/PayrollPeriod/SalarySlip are a separate data
        # model from users.UserAccount + academic.Teacher — creating an
        # account doesn't create an HR profile. Backfill one for every
        # staff/teacher account that doesn't have one yet, plus a salary
        # slip in a shared finalized period so the payroll module (and the
        # teacher self-service payslip page) actually has data to show.
        period, _ = PayrollPeriod.objects.get_or_create(
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
        for user in UserAccount.objects.filter(role__in=["teacher", "staff"]):
            if user.role == "teacher":
                designation, basic_salary = TEACHER_DESIGNATION
            else:
                designation, basic_salary = STAFF_DESIGNATIONS.get(user.staff_role, ("Staff", Decimal("35000")))

            employee, was_created = Employee.objects.get_or_create(
                user=user,
                defaults={
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

    def _seed_finance_records(self, classes: list[Section], rng: random.Random) -> None:
        # Fee structures/payments/expenses are the simple layer; Trial Balance
        # and the NAS Financial Statements read ONLY from posted
        # JournalEntry/JournalLine rows (not Payment/Expense directly), so a
        # matching double-entry journal entry is created for every payment
        # and expense below — otherwise those two reports stay empty.
        from billing.bill_numbering import allocate_bill_number
        from billing.models_school import Expense, FeeStructure, Payment, StudentFee
        from billing_school.models_nas import ChartOfAccount, FundAccount, JournalEntry, JournalLine
        from billing_school.views_nas import _seed_default_coa
        from core.models import SchoolProfile

        profile = SchoolProfile.get_solo()
        profile_fields_changed = []
        if not profile.fiscal_year_bs:
            profile.fiscal_year_bs = "2082/83"
            profile_fields_changed.append("fiscal_year_bs")
        if not profile.pan_number:
            profile.pan_number = "301234567"
            profile_fields_changed.append("pan_number")
        if not profile.vat_number:
            profile.vat_number = "600987654"
            profile_fields_changed.append("vat_number")
        if profile_fields_changed:
            profile.save(update_fields=profile_fields_changed)

        coa_created = _seed_default_coa()
        accounts = {a.account_code: a for a in ChartOfAccount.objects.all()}
        admin_user = UserAccount.objects.filter(role="admin").order_by("email").first()

        def tier_for(cls_name: str) -> str:
            if cls_name in {"Nursery", "LKG", "UKG"}:
                return "early_years"
            if cls_name in {"Grade 6", "Grade 7", "Grade 8"}:
                return "middle"
            return "primary"

        fee_structures_created = 0
        class_fee_structures: dict = {}
        for section in classes:
            cls = section.academic_class
            amounts = FEE_TIERS[tier_for(cls.name)]
            class_fee_structures[cls.id] = {}
            for name, frequency, _coa_code in FEE_TYPES:
                fs, created = FeeStructure.objects.get_or_create(
                    name=name, academic_class=cls,
                    defaults={"amount": amounts[name], "frequency": frequency},
                )
                class_fee_structures[cls.id][name] = fs
                if created:
                    fee_structures_created += 1

        today = timezone.localdate()
        status_cycle = ["paid"] * 6 + ["partial"] * 2 + ["overdue"] * 1 + ["pending"] * 1  # 60/20/10/10
        student_fees_created = 0
        payments_created = 0
        payment_rows_for_journal = []

        students = list(
            Student.objects.select_related("user", "academic_class")
            .filter(academic_class__isnull=False)
        )
        for idx, student in enumerate(students):
            cls_fees = class_fee_structures.get(student.academic_class_id)
            if not cls_fees:
                continue
            for fee_idx, (name, frequency, coa_code) in enumerate(FEE_TYPES):
                fs = cls_fees[name]
                status = status_cycle[(idx + fee_idx) % len(status_cycle)]
                due_date = today - timedelta(days=15) if status == "overdue" else today + timedelta(days=15)
                amount_due = fs.amount
                if status == "paid":
                    amount_paid = amount_due
                elif status == "partial":
                    amount_paid = (amount_due / 2).quantize(Decimal("1"))
                else:
                    amount_paid = Decimal("0")

                student_fee, created = StudentFee.objects.get_or_create(
                    student=student, fee_structure=fs,
                    defaults={
                        "amount_due": amount_due, "amount_paid": amount_paid,
                        "due_date": due_date, "status": status,
                    },
                )
                if created:
                    student_fees_created += 1
                if not created or amount_paid <= 0:
                    continue

                method = rng.choice(["cash", "bank_transfer", "online"])
                payment = Payment.objects.create(
                    student=student, student_fee=student_fee,
                    amount=amount_paid, method=method, recorded_by=admin_user,
                )
                payment.bill_number = allocate_bill_number()
                backdated = timezone.now() - timedelta(days=rng.randint(0, 90))
                Payment.objects.filter(pk=payment.pk).update(
                    bill_number=payment.bill_number, payment_date=backdated
                )
                payment.payment_date = backdated
                payments_created += 1
                payment_rows_for_journal.append((payment, coa_code, method))

        expenses_created = 0
        expense_rows_for_journal = []
        for title, category, amount in EXPENSE_ROWS:
            expense, created = Expense.objects.get_or_create(
                title=title, category=category,
                defaults={
                    "amount": amount,
                    "date": today - timedelta(days=rng.randint(1, 90)),
                    "recorded_by": admin_user,
                },
            )
            if created:
                expenses_created += 1
                expense_rows_for_journal.append(expense)

        entries_created = 0
        for payment, income_code, method in payment_rows_for_journal:
            debit_account = accounts.get(PAYMENT_METHOD_ACCOUNT[method])
            credit_account = accounts.get(income_code)
            if not debit_account or not credit_account:
                continue
            entry = JournalEntry.objects.create(
                date_ad=payment.payment_date.date(),
                description=f"Fee receipt - {payment.student.user.get_full_name()}",
                entry_type="fee_receipt",
                reference=payment.bill_number,
            )
            JournalLine.objects.create(entry=entry, account=debit_account, debit=payment.amount, credit=Decimal("0"))
            JournalLine.objects.create(entry=entry, account=credit_account, debit=Decimal("0"), credit=payment.amount)
            entry.post()
            entries_created += 1

        for expense in expense_rows_for_journal:
            debit_account = accounts.get(EXPENSE_CATEGORY_ACCOUNT.get(expense.category, "5900"))
            credit_account = accounts.get("1020")
            if not debit_account or not credit_account:
                continue
            entry = JournalEntry.objects.create(
                date_ad=expense.date, description=expense.title, entry_type="expense",
            )
            JournalLine.objects.create(entry=entry, account=debit_account, debit=expense.amount, credit=Decimal("0"))
            JournalLine.objects.create(entry=entry, account=credit_account, debit=Decimal("0"), credit=expense.amount)
            entry.post()
            entries_created += 1

        fund_created = 0
        for name, fund_type, coa_code, opening in (
            ("General Fund", "unrestricted", "3100", Decimal("500000")),
            ("Scholarship Fund", "restricted", "3200", Decimal("100000")),
        ):
            coa = accounts.get(coa_code)
            if not coa:
                continue
            _, created = FundAccount.objects.get_or_create(
                name=name,
                defaults={"fund_type": fund_type, "linked_account": coa, "opening_balance": opening},
            )
            fund_created += int(created)

        self.stdout.write(
            self.style.SUCCESS(
                f"Finance: {fee_structures_created} fee structures, {student_fees_created} student fees, "
                f"{payments_created} payments, {expenses_created} expenses, {coa_created} COA accounts, "
                f"{entries_created} posted journal entries, {fund_created} fund accounts."
            )
        )
