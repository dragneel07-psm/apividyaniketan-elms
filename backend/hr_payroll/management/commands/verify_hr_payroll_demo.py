"""Exercise HR/payroll API workflows against seeded tenant data, then roll back."""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django_tenants.utils import schema_context
from rest_framework.test import APIRequestFactory, force_authenticate

from core.models import Tenant
from hr_payroll.models import Employee, LeaveApplication, PayrollPeriod, SalarySlip
from hr_payroll.views import (
    DepartmentViewSet,
    EmployeeViewSet,
    HRDashboardViewSet,
    LeaveApplicationViewSet,
    LeaveTypeViewSet,
    PayrollPeriodViewSet,
    SalarySlipViewSet,
    StaffAttendanceViewSet,
)
from users.models import UserAccount


class Command(BaseCommand):
    help = "Verify seeded HR/payroll list and action endpoints without retaining mutations."

    def add_arguments(self, parser):
        parser.add_argument("--schema", required=True)

    def handle(self, *args, **options):
        schema = str(options["schema"]).strip().lower()
        tenant = Tenant.objects.filter(schema_name=schema).first()
        if not tenant or schema == "public":
            raise CommandError(f"Non-public tenant '{schema}' was not found.")

        with schema_context(schema), transaction.atomic():
            user = UserAccount.objects.filter(
                tenant=tenant, email=f"hrdemo01@{schema}.local"
            ).first()
            if not user:
                raise CommandError("Seeded HR manager is missing. Run seed_hr_payroll_demo first.")
            factory = APIRequestFactory()
            checks = []

            slips = SalarySlip.objects.filter(tenant=tenant)
            if slips.count() < 24:
                raise CommandError("Expected at least 24 seeded salary slips.")
            if {"pf", "ssf", "none"} - set(
                Employee.objects.filter(tenant=tenant).values_list(
                    "social_security_scheme", flat=True
                )
            ):
                raise CommandError("PF, SSF and no-scheme employee variants are required.")
            for slip in slips:
                expected_gross = (
                    slip.basic_salary + slip.hra + slip.da
                    + slip.transport_allowance + slip.medical_allowance
                    + slip.other_allowance
                )
                expected_deductions = (
                    slip.pf_employee + slip.ssf_employee + slip.cit_deduction
                    + slip.insurance_deduction + slip.tds
                    + slip.professional_tax + slip.other_deduction
                )
                if slip.gross_salary != expected_gross:
                    raise CommandError(f"Gross salary mismatch on slip {slip.pk}.")
                if slip.total_deductions != expected_deductions:
                    raise CommandError(f"Deduction mismatch on slip {slip.pk}.")
                if slip.net_salary != expected_gross - expected_deductions:
                    raise CommandError(f"Net salary mismatch on slip {slip.pk}.")
            checks.append(("payroll.calculation_invariants", 200))

            def call(label, view, method="get", path="/", data=None, pk=None):
                request = getattr(factory, method)(
                    path, data or {}, format="json", HTTP_HOST="localhost"
                )
                request.tenant = tenant
                force_authenticate(request, user=user)
                kwargs = {"pk": pk} if pk else {}
                response = view(request, **kwargs)
                checks.append((label, response.status_code))
                if not 200 <= response.status_code < 300:
                    raise CommandError(f"{label} failed: HTTP {response.status_code} {getattr(response, 'data', '')}")
                return response

            list_views = [
                ("departments.list", DepartmentViewSet.as_view({"get": "list"})),
                ("employees.list", EmployeeViewSet.as_view({"get": "list"})),
                ("leave_types.list", LeaveTypeViewSet.as_view({"get": "list"})),
                ("leaves.list", LeaveApplicationViewSet.as_view({"get": "list"})),
                ("attendance.list", StaffAttendanceViewSet.as_view({"get": "list"})),
                ("periods.list", PayrollPeriodViewSet.as_view({"get": "list"})),
                ("slips.list", SalarySlipViewSet.as_view({"get": "list"})),
                ("dashboard.stats", HRDashboardViewSet.as_view({"get": "stats"})),
            ]
            for label, view in list_views:
                call(label, view)

            employee = Employee.objects.filter(tenant=tenant, employee_code="HRD008").get()
            call("employee.deactivate", EmployeeViewSet.as_view({"post": "deactivate"}), "post", pk=employee.pk)
            call("employee.reactivate", EmployeeViewSet.as_view({"post": "reactivate"}), "post", pk=employee.pk)

            pending_leave = LeaveApplication.objects.filter(tenant=tenant, status="pending").first()
            if not pending_leave:
                raise CommandError("A pending seeded leave application is required.")
            call(
                "leave.approve", LeaveApplicationViewSet.as_view({"post": "approve"}),
                "post", data={"remarks": "Verified by automated QA"}, pk=pending_leave.pk,
            )

            call(
                "attendance.bulk_mark", StaffAttendanceViewSet.as_view({"post": "bulk_mark"}),
                "post",
                data={"date": "2026-07-31", "records": [{"employee_id": str(employee.pk), "status": "present"}]},
            )

            draft = PayrollPeriod.objects.filter(tenant=tenant, status="draft").first()
            if not draft:
                raise CommandError("A draft seeded payroll period is required.")
            call("payroll.generate", PayrollPeriodViewSet.as_view({"post": "generate_slips"}), "post", pk=draft.pk)
            call("payroll.finalize", PayrollPeriodViewSet.as_view({"post": "finalize"}), "post", pk=draft.pk)

            slip = SalarySlip.objects.filter(tenant=tenant, payroll_period=draft).first()
            call(
                "salary_slip.mark_paid", SalarySlipViewSet.as_view({"post": "mark_paid"}),
                "post",
                data={"payment_date": "2026-07-05", "payment_method": "bank_transfer", "transaction_reference": "QA-VERIFY"},
                pk=slip.pk,
            )
            call("salary_slip.pdf", SalarySlipViewSet.as_view({"get": "payslip_pdf"}), "get", pk=slip.pk)

            transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS(f"Verified {len(checks)} HR/payroll API workflows in {schema}; mutations rolled back."))
        for label, status_code in checks:
            self.stdout.write(f"  {label}: HTTP {status_code}")
