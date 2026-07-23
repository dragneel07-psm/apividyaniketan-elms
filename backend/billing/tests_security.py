# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory

from academic.models import AcademicClass, Student
from billing.models import Expense, FeeStructure, Payment, StudentFee
from core.models import AuditLog

User = get_user_model()


class BillingBoundaryAndValidationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.tenant_client = APIClient()

        self.tenant_admin = User.objects.create_user(
            username="tenant_admin",
            email="tenant_admin@example.com",
            password="Admin@1234",
            first_name="Tenant",
            last_name="Admin",
            role="admin",
        )
        self.student_user_1 = User.objects.create_user(
            username="student_one",
            email="student_one@example.com",
            password="Student@1234",
            role="student",
        )
        self.student_user_2 = User.objects.create_user(
            username="student_two",
            email="student_two@example.com",
            password="Student@1234",
            role="student",
        )
        self.grade_8 = AcademicClass.objects.create(name="Grade 8", order=8)
        self.student_1 = Student.objects.create(
            user=self.student_user_1, academic_class=self.grade_8
        )
        self.student_2 = Student.objects.create(
            user=self.student_user_2, academic_class=self.grade_8
        )

    def test_legacy_billing_routes_include_deprecation_headers(self):
        self.tenant_client.force_authenticate(user=self.tenant_admin)
        response = self.tenant_client.get("/api/billing/fee-structures/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers.get("Deprecation"), "true")
        self.assertIn("Sunset", response.headers)
        self.assertIn("/api/billing/school/", response.headers.get("Link", ""))

    def test_payment_rejects_student_fee_belonging_to_another_student(self):
        fee = FeeStructure.objects.create(
            name="Exam Fee",
            amount="600.00",
            frequency="one_time",
        )
        student_fee_1 = StudentFee.objects.create(
            student=self.student_1,
            fee_structure=fee,
            amount_due="600.00",
            due_date=timezone.now().date(),
        )
        student_fee_2 = StudentFee.objects.create(
            student=self.student_2,
            fee_structure=fee,
            amount_due="600.00",
            due_date=timezone.now().date(),
        )
        self.assertNotEqual(student_fee_1.student_id, student_fee_2.student_id)

        self.tenant_client.force_authenticate(user=self.tenant_admin)
        response = self.tenant_client.post(
            "/api/billing/payments/",
            {
                "student": str(self.student_1.student_id),
                "student_fee": str(student_fee_2.student_fee_id),
                "amount": "300.00",
                "method": "cash",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("student_fee", str(response.data.get("field_errors", {})))

    def test_payment_create_writes_audit_log(self):
        fee = FeeStructure.objects.create(
            name="Annual Fee",
            amount="1200.00",
            frequency="annual",
        )
        student_fee = StudentFee.objects.create(
            student=self.student_1,
            fee_structure=fee,
            amount_due="1200.00",
            due_date=timezone.now().date(),
        )

        self.tenant_client.force_authenticate(user=self.tenant_admin)
        response = self.tenant_client.post(
            "/api/billing/payments/",
            {
                "student": str(self.student_1.student_id),
                "student_fee": str(student_fee.student_fee_id),
                "amount": "500.00",
                "method": "cash",
                "transaction_id": "TXN-500",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        audit_row = AuditLog.objects.filter(action="billing.payment_created").first()
        self.assertIsNotNone(audit_row)
        self.assertEqual(
            str(audit_row.details.get("student_id")), str(self.student_1.student_id)
        )
        self.assertEqual(
            str(audit_row.details.get("payment_id")), response.data.get("payment_id")
        )

    def test_payment_create_idempotency_replays_and_prevents_duplicate_charge(self):
        fee = FeeStructure.objects.create(
            name="Monthly Fee",
            amount="700.00",
            frequency="monthly",
        )
        student_fee = StudentFee.objects.create(
            student=self.student_1,
            fee_structure=fee,
            amount_due="700.00",
            due_date=timezone.now().date(),
        )

        payload = {
            "student": str(self.student_1.student_id),
            "student_fee": str(student_fee.student_fee_id),
            "amount": "250.00",
            "method": "cash",
            "transaction_id": "TXN-IDEMP-1",
        }
        self.tenant_client.force_authenticate(user=self.tenant_admin)
        first = self.tenant_client.post(
            "/api/billing/payments/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-pay-001",
        )
        second = self.tenant_client.post(
            "/api/billing/payments/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-pay-001",
        )

        self.assertEqual(
            first.status_code,
            status.HTTP_201_CREATED,
            msg=getattr(first, "data", first.content),
        )
        self.assertEqual(
            second.status_code,
            status.HTTP_201_CREATED,
            msg=getattr(second, "data", second.content),
        )
        self.assertEqual(first.data.get("payment_id"), second.data.get("payment_id"))
        self.assertEqual(second.headers.get("X-Idempotent-Replay"), "true")

        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(
            AuditLog.objects.filter(action="billing.payment_created").count(), 1
        )

    def test_payment_create_idempotency_conflict_on_payload_change(self):
        fee = FeeStructure.objects.create(
            name="Transport Fee",
            amount="300.00",
            frequency="monthly",
        )
        student_fee = StudentFee.objects.create(
            student=self.student_1,
            fee_structure=fee,
            amount_due="300.00",
            due_date=timezone.now().date(),
        )

        self.tenant_client.force_authenticate(user=self.tenant_admin)
        first = self.tenant_client.post(
            "/api/billing/payments/",
            {
                "student": str(self.student_1.student_id),
                "student_fee": str(student_fee.student_fee_id),
                "amount": "100.00",
                "method": "cash",
            },
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-pay-002",
        )
        second = self.tenant_client.post(
            "/api/billing/payments/",
            {
                "student": str(self.student_1.student_id),
                "student_fee": str(student_fee.student_fee_id),
                "amount": "120.00",
                "method": "cash",
            },
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-pay-002",
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(second.data.get("code"), "idempotency_key_conflict")
        self.assertEqual(Payment.objects.count(), 1)

    def test_student_fee_create_idempotency_replays_without_duplicates(self):
        fee = FeeStructure.objects.create(
            name="Lab Fee",
            amount="350.00",
            frequency="one_time",
        )

        payload = {
            "student": str(self.student_1.student_id),
            "fee_structure": str(fee.fee_id),
            "amount_due": "350.00",
            "due_date": "2026-04-10",
        }
        self.tenant_client.force_authenticate(user=self.tenant_admin)
        first = self.tenant_client.post(
            "/api/billing/student-fees/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-student-fee-001",
        )
        second = self.tenant_client.post(
            "/api/billing/student-fees/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-student-fee-001",
        )

        self.assertEqual(
            first.status_code,
            status.HTTP_201_CREATED,
            msg=getattr(first, "data", first.content),
        )
        self.assertEqual(
            second.status_code,
            status.HTTP_201_CREATED,
            msg=getattr(second, "data", second.content),
        )
        self.assertEqual(
            first.data.get("student_fee_id"), second.data.get("student_fee_id")
        )
        self.assertEqual(second.headers.get("X-Idempotent-Replay"), "true")
        self.assertEqual(
            StudentFee.objects.filter(
                fee_structure=fee, student=self.student_1
            ).count(),
            1,
        )

    def test_student_fee_bulk_assign_idempotency_replays_and_conflict_protects(self):
        fee = FeeStructure.objects.create(
            name="Annual Activity Fee",
            amount="450.00",
            frequency="annual",
        )

        self.tenant_client.force_authenticate(user=self.tenant_admin)
        first_payload = {
            "fee_structure_id": str(fee.fee_id),
            "academic_class_id": str(self.grade_8.id),
            "due_date": "2026-05-01",
        }
        first = self.tenant_client.post(
            "/api/billing/student-fees/assign_bulk/",
            first_payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-student-fee-bulk-001",
        )
        replay = self.tenant_client.post(
            "/api/billing/student-fees/assign_bulk/",
            first_payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-student-fee-bulk-001",
        )
        conflict = self.tenant_client.post(
            "/api/billing/student-fees/assign_bulk/",
            {
                "fee_structure_id": str(fee.fee_id),
                "academic_class_id": str(self.grade_8.id),
                "due_date": "2026-05-15",
            },
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-student-fee-bulk-001",
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(replay.status_code, status.HTTP_201_CREATED)
        self.assertEqual(replay.headers.get("X-Idempotent-Replay"), "true")
        self.assertEqual(conflict.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(conflict.data.get("code"), "idempotency_key_conflict")
        self.assertEqual(StudentFee.objects.filter(fee_structure=fee).count(), 2)

    def test_expense_create_idempotency_replays_without_duplicates(self):
        payload = {
            "title": "School Generator Diesel",
            "amount": "520.00",
            "category": "utilities",
            "date": "2026-05-11",
            "description": "Monthly generator fuel",
        }
        self.tenant_client.force_authenticate(user=self.tenant_admin)
        first = self.tenant_client.post(
            "/api/billing/expenses/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-expense-001",
        )
        second = self.tenant_client.post(
            "/api/billing/expenses/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-expense-001",
        )

        self.assertEqual(
            first.status_code,
            status.HTTP_201_CREATED,
            msg=getattr(first, "data", first.content),
        )
        self.assertEqual(
            second.status_code,
            status.HTTP_201_CREATED,
            msg=getattr(second, "data", second.content),
        )
        self.assertEqual(first.data.get("expense_id"), second.data.get("expense_id"))
        self.assertEqual(second.headers.get("X-Idempotent-Replay"), "true")
        self.assertEqual(Expense.objects.count(), 1)
        self.assertEqual(
            AuditLog.objects.filter(action="billing.expense_created").count(), 1
        )

    def test_expense_create_idempotency_conflict_on_payload_change(self):
        self.tenant_client.force_authenticate(user=self.tenant_admin)
        first = self.tenant_client.post(
            "/api/billing/expenses/",
            {
                "title": "Printer Repair",
                "amount": "200.00",
                "category": "maintenance",
                "date": "2026-06-01",
            },
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-expense-002",
        )
        conflict = self.tenant_client.post(
            "/api/billing/expenses/",
            {
                "title": "Printer Repair",
                "amount": "250.00",
                "category": "maintenance",
                "date": "2026-06-01",
            },
            format="json",
            HTTP_IDEMPOTENCY_KEY="idem-expense-002",
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(conflict.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(conflict.data.get("code"), "idempotency_key_conflict")
        self.assertEqual(Expense.objects.count(), 1)

    def test_fee_collection_export_writes_audit_log(self):
        Payment.objects.create(
            student=self.student_1,
            amount="200.00",
            method="cash",
            recorded_by=self.tenant_admin,
        )
        self.tenant_client.force_authenticate(user=self.tenant_admin)
        response = self.tenant_client.get("/api/billing/reports/fee-collection-excel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        audit_row = AuditLog.objects.filter(
            action="billing.report_exported",
            details__report_type="fee_collection",
            details__format="xlsx",
        ).first()
        self.assertIsNotNone(audit_row)

