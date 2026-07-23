# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Student
from billing.models_school import FeeStructure, Payment, StudentFee

User = get_user_model()


@override_settings(
    AI_ADMIN_ASSISTANT_USE_LLM_RESPONSE=False,
    AI_ADMIN_ASSISTANT_USE_LLM_CLASSIFIER=False,
)
class AdminAssistantApiTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="assistant_admin",
            email="assistant_admin@example.com",
            password="Admin@12345",
            role="admin",
        )
        self.teacher_user = User.objects.create_user(
            username="assistant_teacher",
            email="assistant_teacher@example.com",
            password="Teacher@12345",
            role="teacher",
        )
        self.academic_class = AcademicClass.objects.create(name="Grade 8")

        self.primary_student_user = User.objects.create_user(
            username="assistant_student_a",
            email="assistant_student_a@example.com",
            password="Student@12345",
            role="student",
        )
        self.primary_student = Student.objects.create(
            user=self.primary_student_user,
            academic_class=self.academic_class,
        )

        fee = FeeStructure.objects.create(
            name="Tuition Fee",
            amount="1000.00",
            frequency="monthly",
        )
        StudentFee.objects.create(
            student=self.primary_student,
            fee_structure=fee,
            amount_due="1000.00",
            amount_paid="400.00",
            due_date=timezone.localdate(),
            status="partial",
        )
        Payment.objects.create(
            student=self.primary_student,
            amount="400.00",
            method="cash",
            recorded_by=self.admin_user,
        )

    def _client_for(self, user):
        client = APIClient()
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

    def test_fees_query_returns_aggregated_totals(self):
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
