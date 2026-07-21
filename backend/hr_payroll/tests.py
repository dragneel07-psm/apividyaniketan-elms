# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Self-service payroll access tests — an employee must only ever see their own
salary slip, never write to any slip, while HR (admin/staff) keeps full access.

Run with: python manage.py test hr_payroll
"""

from datetime import date
from decimal import Decimal

from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from hr_payroll.models import Employee, PayrollPeriod, SalarySlip
from users.models import UserAccount


class SalarySlipSelfServiceTests(FastTenantTestCase):
    """One tenant, two employees (teachers) and one HR admin."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Payroll Self-Service Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )

        self.admin_user = UserAccount.objects.create_user(
            username="hr_admin",
            email="hr_admin@example.com",
            password="Pass@1234",
            role="admin",
            tenant=self.tenant,
        )

        self.teacher_user = UserAccount.objects.create_user(
            username="teacher_a",
            email="teacher_a@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.employee = Employee.objects.create(
            tenant=self.tenant,
            user=self.teacher_user,
            designation="Mathematics Teacher",
            join_date=date(2024, 1, 1),
        )

        self.other_teacher_user = UserAccount.objects.create_user(
            username="teacher_b",
            email="teacher_b@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.other_employee = Employee.objects.create(
            tenant=self.tenant,
            user=self.other_teacher_user,
            designation="Science Teacher",
            join_date=date(2024, 1, 1),
        )

        self.period = PayrollPeriod.objects.create(
            tenant=self.tenant,
            name="March 2026",
            month=3,
            year=2026,
            start_date=date(2026, 3, 1),
            end_date=date(2026, 3, 31),
        )

        self.slip = SalarySlip.objects.create(
            tenant=self.tenant,
            employee=self.employee,
            payroll_period=self.period,
            basic_salary=Decimal("50000"),
            status=SalarySlip.STATUS_FINALIZED,
        )
        self.other_slip = SalarySlip.objects.create(
            tenant=self.tenant,
            employee=self.other_employee,
            payroll_period=self.period,
            basic_salary=Decimal("55000"),
            status=SalarySlip.STATUS_FINALIZED,
        )

    def _login(self, user):
        self.client.force_authenticate(user=user)

    # --- Employee: read own only ---

    def test_employee_lists_only_own_slip(self):
        self._login(self.teacher_user)
        resp = self.client.get("/api/hr/salary-slips/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        slip_ids = {str(row["slip_id"]) for row in resp.data["results"]}
        self.assertEqual(slip_ids, {str(self.slip.slip_id)})

    def test_employee_can_retrieve_own_slip(self):
        self._login(self.teacher_user)
        resp = self.client.get(f"/api/hr/salary-slips/{self.slip.slip_id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_employee_cannot_retrieve_others_slip(self):
        self._login(self.teacher_user)
        resp = self.client.get(f"/api/hr/salary-slips/{self.other_slip.slip_id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_employee_without_profile_sees_nothing(self):
        bare_user = UserAccount.objects.create_user(
            username="no_profile",
            email="no_profile@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self._login(bare_user)
        resp = self.client.get("/api/hr/salary-slips/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["results"], [])

    # --- Employee: no writes ---

    def test_employee_cannot_create_slip(self):
        self._login(self.teacher_user)
        resp = self.client.post(
            "/api/hr/salary-slips/",
            {
                "employee": str(self.employee.employee_id),
                "payroll_period": str(self.period.period_id),
                "basic_salary": "60000",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_cannot_update_own_slip(self):
        self._login(self.teacher_user)
        resp = self.client.patch(
            f"/api/hr/salary-slips/{self.slip.slip_id}/",
            {"basic_salary": "99999"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_cannot_mark_own_slip_paid(self):
        self._login(self.teacher_user)
        resp = self.client.post(
            f"/api/hr/salary-slips/{self.slip.slip_id}/mark-paid/",
            {"payment_date": "2026-04-01"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # --- Employee: payslip PDF ---

    def test_employee_can_download_own_payslip_pdf(self):
        self._login(self.teacher_user)
        resp = self.client.get(f"/api/hr/salary-slips/{self.slip.slip_id}/payslip-pdf/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_employee_cannot_download_others_payslip_pdf(self):
        self._login(self.teacher_user)
        resp = self.client.get(
            f"/api/hr/salary-slips/{self.other_slip.slip_id}/payslip-pdf/"
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # --- HR: full access retained ---

    def test_hr_admin_lists_all_slips(self):
        self._login(self.admin_user)
        resp = self.client.get("/api/hr/salary-slips/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        slip_ids = {str(row["slip_id"]) for row in resp.data["results"]}
        self.assertEqual(slip_ids, {str(self.slip.slip_id), str(self.other_slip.slip_id)})

    def test_hr_admin_can_mark_slip_paid(self):
        self._login(self.admin_user)
        resp = self.client.post(
            f"/api/hr/salary-slips/{self.slip.slip_id}/mark-paid/",
            {"payment_date": "2026-04-01"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
