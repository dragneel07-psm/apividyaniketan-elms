"""Seed comprehensive, idempotent HR and Nepal payroll demonstration data."""

from datetime import date, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from hr_payroll.models import (
    Department,
    Employee,
    LeaveApplication,
    LeaveType,
    PayrollPeriod,
    SalarySlip,
    StaffAttendance,
)
from hr_payroll.payroll_nepal import calculate_monthly_payroll
from users.models import UserAccount


EMPLOYEES = [
    ("HRD001", "Aarati", "Shrestha", "HR Manager", "Administration", "staff", "hr_manager", "permanent", "65000", "pf", "couple", "2500", "1000"),
    ("HRD002", "Bikash", "Adhikari", "Accountant", "Finance", "staff", "accountant", "permanent", "60000", "ssf", "single", "3000", "1200"),
    ("HRD003", "Nirmala", "Gurung", "Senior Teacher", "Academics", "teacher", "", "permanent", "55000", "pf", "couple", "2000", "800"),
    ("HRD004", "Roshan", "Karki", "Science Teacher", "Academics", "teacher", "", "permanent", "48000", "ssf", "single", "0", "750"),
    ("HRD005", "Sabina", "Rai", "Librarian", "Administration", "staff", "librarian", "fixed_term", "38000", "pf", "single", "1000", "500"),
    ("HRD006", "Deepak", "Thapa", "Transport Manager", "Operations", "staff", "transport_manager", "permanent", "42000", "ssf", "couple", "0", "600"),
    ("HRD007", "Puja", "Basnet", "Receptionist", "Administration", "staff", "receptionist", "probationary", "32000", "none", "single", "0", "400"),
    ("HRD008", "Suman", "Tamang", "Part-time Coach", "Activities", "staff", "", "part_time", "25000", "none", "single", "0", "0"),
]

DEPARTMENTS = {
    "Administration": "ADM",
    "Finance": "FIN",
    "Academics": "ACD",
    "Operations": "OPS",
    "Activities": "ACT",
}

LEAVE_TYPES = [
    ("Casual Leave", "CL", 12, True, False, 0),
    ("Sick Leave", "SL", 15, True, True, 5),
    ("Annual Leave", "AL", 18, True, True, 10),
    ("Unpaid Leave", "UL", 30, False, False, 0),
]


class Command(BaseCommand):
    help = "Seed complete HR/payroll demo data."

    def handle(self, *args, **options):
        with transaction.atomic():
            departments = self._departments()
            employees = self._employees(departments)
            self._department_heads(departments, employees)
            leave_types = self._leave_types()
            self._attendance(employees)
            self._leave_applications(employees, leave_types)
            self._payroll(employees)
            counts = {
                "departments": Department.objects.all().count(),
                "employees": Employee.objects.all().count(),
                "leave_types": LeaveType.objects.all().count(),
                "leave_applications": LeaveApplication.objects.all().count(),
                "attendance": StaffAttendance.objects.all().count(),
                "periods": PayrollPeriod.objects.all().count(),
                "salary_slips": SalarySlip.objects.all().count(),
            }

        summary = ", ".join(f"{key}={value}" for key, value in counts.items())
        self.stdout.write(self.style.SUCCESS(f"HR/payroll demo ready: {summary}"))
        self.stdout.write("Test HR login: hrdemo01@school.local / HRDemo@2026!")

    def _departments(self):
        result = {}
        for name, code in DEPARTMENTS.items():
            department, _ = Department.objects.update_or_create(
                name=name,
                defaults={"code": code, "description": f"{name} department test records"},
            )
            result[name] = department
        return result

    def _employees(self, departments):
        result = []
        for index, row in enumerate(EMPLOYEES, start=1):
            code, first, last, designation, department, role, staff_role, contract, salary, scheme, marital, cit, insurance = row
            email = f"hrdemo{index:02d}@school.local"
            user, created = UserAccount.objects.get_or_create(
                email=email,
                defaults={
                    "username": f"hrdemo{index:02d}",
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                    "staff_role": staff_role,
                    "is_active": True,
                    "is_staff": role == "staff",
                },
            )
            if created:
                user.set_password("HRDemo@2026!")
                user.save(update_fields=["password"])
            else:
                UserAccount.objects.filter(pk=user.pk).update(
                    first_name=first, last_name=last, role=role,
                    staff_role=staff_role, is_active=True,
                )

            employee, _ = Employee.objects.update_or_create(
                user=user,
                defaults={
                    "employee_code": code,
                    "department": departments[department],
                    "designation": designation,
                    "contract_type": contract,
                    "join_date": date(2024, 4, 1) + timedelta(days=index * 7),
                    "basic_salary": Decimal(salary),
                    "salary_grade": f"G{max(1, 6 - index // 2)}",
                    "pan_number": f"60{index:07d}",
                    "marital_status": marital,
                    "social_security_scheme": scheme,
                    "pf_number": f"EPF-{code}" if scheme == "pf" else "",
                    "ssf_number": f"SSF-{code}" if scheme == "ssf" else "",
                    "cit_number": f"CIT-{code}" if Decimal(cit) else "",
                    "recurring_cit_monthly": Decimal(cit),
                    "insurance_monthly": Decimal(insurance),
                    "bank_account_number": f"001000000{index:03d}",
                    "bank_name": "Nepal Demo Bank",
                    "bank_ifsc": "NDBLNPKA",
                    "emergency_contact_name": f"Emergency Contact {index}",
                    "emergency_contact_phone": f"9800000{index:03d}",
                    "is_active": True,
                },
            )
            result.append(employee)
        return result

    def _department_heads(self, departments, employees):
        by_department = {}
        for employee in employees:
            by_department.setdefault(employee.department.name, employee)
        for name, department in departments.items():
            department.head = by_department.get(name)
            department.save(update_fields=["head"])

    def _leave_types(self):
        result = {}
        for name, code, maximum, paid, carry, carry_max in LEAVE_TYPES:
            leave_type, _ = LeaveType.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "max_days_per_year": maximum,
                    "is_paid": paid,
                    "carry_forward": carry,
                    "carry_forward_max_days": carry_max,
                },
            )
            result[code] = leave_type
        return result

    def _attendance(self, employees):
        statuses = ["present", "present", "late", "present", "half_day", "present", "absent", "present", "on_leave", "present"]
        start = date(2026, 6, 15)
        marker = employees[0].user
        for employee_index, employee in enumerate(employees):
            for day_index, status in enumerate(statuses):
                attendance_date = start + timedelta(days=day_index)
                actual_status = statuses[(day_index + employee_index) % len(statuses)]
                StaffAttendance.objects.update_or_create(
                    employee=employee,
                    date=attendance_date,
                    defaults={
                        "status": actual_status,
                        "check_in_time": time(9, 0 + min(employee_index * 2, 30)) if actual_status in {"present", "late", "half_day"} else None,
                        "check_out_time": time(16, 0) if actual_status in {"present", "late"} else None,
                        "remarks": "Seeded attendance record",
                        "marked_by": marker,
                    },
                )

    def _leave_applications(self, employees, leave_types):
        rows = [
            (0, "CL", date(2026, 7, 2), date(2026, 7, 2), "pending", "Personal work"),
            (1, "SL", date(2026, 6, 22), date(2026, 6, 23), "approved", "Medical rest"),
            (2, "AL", date(2026, 8, 3), date(2026, 8, 7), "approved", "Family travel"),
            (3, "UL", date(2026, 5, 12), date(2026, 5, 12), "rejected", "Personal appointment"),
        ]
        reviewer = employees[0].user
        for employee_index, code, start, end, status, reason in rows:
            defaults = {
                "total_days": Decimal((end - start).days + 1),
                "reason": reason,
                "status": status,
                "reviewed_by": reviewer if status != "pending" else None,
                "reviewed_at": timezone.now() if status != "pending" else None,
                "review_remarks": "Seeded review decision" if status != "pending" else "",
            }
            LeaveApplication.objects.update_or_create(
                employee=employees[employee_index], leave_type=leave_types[code],
                start_date=start, end_date=end, defaults=defaults,
            )

    def _payroll(self, employees):
        periods = [
            (4, "April 2026", date(2026, 4, 1), date(2026, 4, 30), "paid"),
            (5, "May 2026", date(2026, 5, 1), date(2026, 5, 31), "finalized"),
            (6, "June 2026", date(2026, 6, 1), date(2026, 6, 30), "draft"),
        ]
        for month, name, start, end, status in periods:
            period, _ = PayrollPeriod.objects.update_or_create(
                month=month, year=2026,
                defaults={
                    "name": name, "start_date": start, "end_date": end,
                    "working_days": 26, "status": status,
                    "finalized_at": timezone.now() if status != "draft" else None,
                    "finalized_by": employees[0].user if status != "draft" else None,
                    "notes": "Nepal standard payroll test period",
                },
            )
            for index, employee in enumerate(employees):
                values = calculate_monthly_payroll(employee)
                slip_status = "paid" if status == "paid" else ("finalized" if status == "finalized" else "draft")
                SalarySlip.objects.update_or_create(
                    employee=employee, payroll_period=period,
                    defaults={
                        "working_days": 26,
                        "paid_days": 25 if index % 4 == 0 else 26,
                        "absent_days": 1 if index % 4 == 0 else 0,
                        "lop_days": Decimal("1") if index % 4 == 0 else Decimal("0"),
                        **values,
                        "status": slip_status,
                        "payment_date": date(2026, 5, 5) if slip_status == "paid" else None,
                        "payment_method": "bank_transfer" if slip_status == "paid" else "",
                        "transaction_reference": f"NDB-APR-{index + 1:04d}" if slip_status == "paid" else "",
                    },
                )
