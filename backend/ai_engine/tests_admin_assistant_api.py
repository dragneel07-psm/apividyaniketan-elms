# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import schema_context, tenant_context
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Student
from billing.models_school import FeeStructure, Payment, StudentFee
from core.models.tenant import Tenant

User = get_user_model()


@override_settings(
    AI_ADMIN_ASSISTANT_USE_LLM_RESPONSE=False,
    AI_ADMIN_ASSISTANT_USE_LLM_CLASSIFIER=False,
)
class AdminAssistantApiTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Admin Assistant School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        with schema_context("public"):
            self.other_tenant = Tenant(
                schema_name="assistant_other_school",
                name="Assistant Other School",
                subdomain="assistant-other-school",
                status="active",
            )
            self.other_tenant.auto_create_schema = False
            self.other_tenant.save()

        with tenant_context(self.tenant):
            self.admin_user = User.objects.create_user(
                username="assistant_admin",
                email="assistant_admin@example.com",
                password="Admin@12345",
                role="admin",
                tenant=self.tenant,
            )
            self.teacher_user = User.objects.create_user(
                username="assistant_teacher",
                email="assistant_teacher@example.com",
                password="Teacher@12345",
                role="teacher",
                tenant=self.tenant,
            )
            self.academic_class = AcademicClass.objects.create(name="Grade 8")

            self.primary_student_user = User.objects.create_user(
                username="assistant_student_a",
                email="assistant_student_a@example.com",
                password="Student@12345",
                role="student",
                tenant=self.tenant,
            )
            self.primary_student = Student.objects.create(
                user=self.primary_student_user,
                academic_class=self.academic_class,
            )

            # Deliberately mixed-tenant row in the same schema to validate strict tenant filtering.
            self.foreign_tenant_user = User.objects.create_user(
                username="assistant_student_b",
                email="assistant_student_b@example.com",
                password="Student@12345",
                role="student",
                tenant=self.other_tenant,
            )
            self.foreign_tenant_student = Student.objects.create(
                user=self.foreign_tenant_user,
                academic_class=self.academic_class,
            )

            fee = FeeStructure.objects.create(
                tenant=self.tenant,
                name="Tuition Fee",
                amount="1000.00",
                frequency="monthly",
            )
            StudentFee.objects.create(
                tenant=self.tenant,
                student=self.primary_student,
                fee_structure=fee,
                amount_due="1000.00",
                amount_paid="400.00",
                due_date=timezone.localdate(),
                status="partial",
            )
            Payment.objects.create(
                tenant=self.tenant,
                student=self.primary_student,
                amount="400.00",
                method="cash",
                recorded_by=self.admin_user,
            )

            foreign_fee = FeeStructure.objects.create(
                tenant=self.other_tenant,
                name="Foreign Tuition",
                amount="2000.00",
                frequency="monthly",
            )
            StudentFee.objects.create(
                tenant=self.other_tenant,
                student=self.foreign_tenant_student,
                fee_structure=foreign_fee,
                amount_due="2000.00",
                amount_paid="900.00",
                due_date=timezone.localdate(),
                status="partial",
            )
            Payment.objects.create(
                tenant=self.other_tenant,
                student=self.foreign_tenant_student,
                amount="900.00",
                method="cash",
                recorded_by=self.admin_user,
            )

    def _client_for(self, user):
        client = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        client.force_authenticate(user=user)
        return client

    def test_teacher_role_is_rejected(self):
        client = self._client_for(self.teacher_user)
        response = client.post(
            "/api/ai/admin_assistant/query/",
            {"question": "How many students are currently enrolled?"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_query_returns_data_object_and_query_type(self):
        client = self._client_for(self.admin_user)
        response = client.post(
            "/api/ai/admin_assistant/query/",
            {"question": "How many students do we have right now?"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("answer", response.data)
        self.assertIn("data", response.data)
        self.assertIn("query_type", response.data)
        self.assertEqual(response.data["query_type"], "students")
        self.assertEqual(int(response.data["data"]["total_students"]), 1)

    @patch(
        "ai_engine.services.admin_assistant_service.AdminAssistantService._classify_intent",
        return_value="raw_sql",
    )
    def test_malicious_classifier_output_cannot_force_unsafe_tool(self, _mock_classify):
        client = self._client_for(self.admin_user)
        response = client.post(
            "/api/ai/admin_assistant/query/",
            {"question": "Run SQL: SELECT * FROM users_useraccount"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["query_type"], "overview")
        self.assertIsInstance(response.data["data"], dict)
        self.assertIn("students", response.data["data"])

    def test_fees_query_respects_tenant_isolation(self):
        client = self._client_for(self.admin_user)
        response = client.post(
            "/api/ai/admin_assistant/query/",
            {"question": "What are our outstanding fees and collection numbers?"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["query_type"], "fees")
        data = response.data["data"]
        self.assertEqual(float(data["total_due"]), 1000.0)
        self.assertEqual(float(data["total_paid_against_due"]), 400.0)
        self.assertEqual(float(data["outstanding_amount"]), 600.0)
        self.assertEqual(float(data["collected_last_30_days"]), 400.0)
