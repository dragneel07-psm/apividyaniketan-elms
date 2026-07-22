# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Extends payroll depth for an existing school tenant's real teacher/staff
Employee records beyond the single March-2026 SalarySlip seed_school_demo_data
creates, so the teacher portal's Payslips page shows real history (mixed
draft/finalized/paid) instead of one row. Reuses each employee's existing
basic_salary/hra as the base rather than duplicating the designation->salary
table that lives in core/management/commands/seed_school_demo_data.py.
Idempotent (get_or_create throughout).

Assumes seed_school_demo_data has already been run for the target schema.

Usage:
  python manage.py seed_payroll_history_demo_data --schema apividyaniketan
"""

from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import schema_context

from core.models import Tenant
from hr_payroll.models import Employee, PayrollPeriod, SalarySlip

# (month, year, name, status, paid_days_delta, payment_method)
PERIOD_SPECS = [
    (1, 2026, "January 2026", SalarySlip.STATUS_PAID, 0, SalarySlip.METHOD_BANK),
    (2, 2026, "February 2026", SalarySlip.STATUS_PAID, -1, SalarySlip.METHOD_BANK),
    (4, 2026, "April 2026", SalarySlip.STATUS_DRAFT, 0, ""),
]


class Command(BaseCommand):
    help = (
        "Seed additional PayrollPeriod/SalarySlip history for existing "
        "employees in a tenant. Run seed_school_demo_data first."
    )

    def add_arguments(self, parser):
        parser.add_argument("--schema", required=True, help="Tenant schema to seed into.")

    def handle(self, *args, **options):
        schema = str(options["schema"]).strip().lower()

        if not schema or schema == "public":
            raise CommandError("--schema must be a non-public tenant schema.")

        tenant = Tenant.objects.filter(schema_name=schema).first()
        if not tenant:
            raise CommandError(f"Tenant schema '{schema}' not found.")

        with schema_context(schema):
            employees = list(Employee.objects.filter(tenant=tenant).select_related("user"))
            if not employees:
                raise CommandError(
                    f"No employees found in schema '{schema}'. Run seed_school_demo_data first."
                )

            periods_created = 0
            slips_created = 0

            for month, year, name, status, paid_days_delta, payment_method in PERIOD_SPECS:
                start_date = date(year, month, 1)
                end_date = date(year, month, 28)
                period, period_created = PayrollPeriod.objects.get_or_create(
                    tenant=tenant,
                    month=month,
                    year=year,
                    defaults={
                        "name": name,
                        "start_date": start_date,
                        "end_date": end_date,
                        "status": PayrollPeriod.STATUS_FINALIZED if status != SalarySlip.STATUS_DRAFT else PayrollPeriod.STATUS_DRAFT,
                    },
                )
                if period_created:
                    periods_created += 1

                for employee in employees:
                    base_slip = (
                        SalarySlip.objects.filter(employee=employee)
                        .order_by("-payroll_period__year", "-payroll_period__month")
                        .first()
                    )
                    basic_salary = base_slip.basic_salary if base_slip else 35000
                    hra = base_slip.hra if base_slip else basic_salary * 1 / 10

                    _, slip_created = SalarySlip.objects.get_or_create(
                        employee=employee,
                        payroll_period=period,
                        defaults={
                            "tenant": tenant,
                            "working_days": 22,
                            "paid_days": 22 + paid_days_delta,
                            "absent_days": max(0, -paid_days_delta),
                            "basic_salary": basic_salary,
                            "hra": hra,
                            "status": status,
                            "payment_date": end_date if status == SalarySlip.STATUS_PAID else None,
                            "payment_method": payment_method,
                        },
                    )
                    if slip_created:
                        slips_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nPayroll history demo data seeded into schema={schema}: "
                f"{periods_created} payroll periods, {slips_created} salary slips created."
            )
        )
