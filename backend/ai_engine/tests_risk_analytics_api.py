# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Subject, Teacher

User = get_user_model()


class RiskAnalyticsApiTests(TestCase):
    def setUp(self):
        self.teacher_user = User.objects.create_user(
            username="risk_api_teacher",
            email="risk_api_teacher@example.com",
            password="Teacher@123",
            role="teacher",
        )
        self.other_teacher_user = User.objects.create_user(
            username="risk_api_other_teacher",
            email="risk_api_other_teacher@example.com",
            password="Teacher@123",
            role="teacher",
        )
        self.admin_user = User.objects.create_user(
            username="risk_api_admin",
            email="risk_api_admin@example.com",
            password="Admin@123",
            role="admin",
        )
        self.student_user = User.objects.create_user(
            username="risk_api_student",
            email="risk_api_student@example.com",
            password="Student@123",
            role="student",
        )

        self.class_one = AcademicClass.objects.create(name="Grade 9")
        self.class_two = AcademicClass.objects.create(name="Grade 10")

        teacher_profile = Teacher.objects.create(
            user=self.teacher_user, designation="class_teacher"
        )
        teacher_profile.assigned_classes.add(self.class_one)

        other_teacher_profile = Teacher.objects.create(
            user=self.other_teacher_user, designation="class_teacher"
        )
        other_teacher_profile.assigned_classes.add(self.class_two)

    def _client_for(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    @patch("ai_engine.views.RiskAnalyticsService.get_at_risk_students")
    def test_teacher_can_access_assigned_class(self, mock_get_at_risk_students):
        mock_get_at_risk_students.return_value = [
            {
                "student_id": "11111111-1111-1111-1111-111111111111",
                "student_name": "Risky Student",
                "risk_score": 82,
                "reasons": ["Attendance is low."],
                "suggested_actions": ["Meet parent and set daily attendance goal."],
            }
        ]
        client = self._client_for(self.teacher_user)

        response = client.get(
            f"/api/ai/analytics/at_risk_students/?class_id={self.class_one.id}&notify=0"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(int(response.data[0]["risk_score"]), 82)
        mock_get_at_risk_students.assert_called_once_with(
            class_id=self.class_one.id, send_notifications=False
        )

    def test_unassigned_class_returns_no_risk_data(self):
        client = self._client_for(self.teacher_user)

        response = client.get(
            f"/api/ai/analytics/at_risk_students/?class_id={self.class_two.id}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    @patch("ai_engine.views.RiskAnalyticsService.get_at_risk_students")
    def test_subject_teacher_can_access_subject_class(self, mock_get_at_risk_students):
        mock_get_at_risk_students.return_value = []
        teacher = Teacher.objects.get(user=self.teacher_user)
        Subject.objects.create(
            name="Optional Mathematics",
            code="OPT-MATH",
            academic_class=self.class_two,
            teacher=teacher,
            is_active=True,
        )
        client = self._client_for(self.teacher_user)

        response = client.get(
            f"/api/ai/analytics/at_risk_students/?class_id={self.class_two.id}&notify=0"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_get_at_risk_students.assert_called_once_with(
            class_id=self.class_two.id, send_notifications=False
        )

    def test_student_cannot_access_endpoint(self):
        client = self._client_for(self.student_user)

        response = client.get(
            f"/api/ai/analytics/at_risk_students/?class_id={self.class_one.id}"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_class_id_returns_400(self):
        client = self._client_for(self.admin_user)

        response = client.get("/api/ai/analytics/at_risk_students/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("class_id", str(response.data))

    @patch("ai_engine.views.RiskAnalyticsService.get_at_risk_students")
    def test_admin_can_access_any_class(self, mock_get_at_risk_students):
        mock_get_at_risk_students.return_value = []
        client = self._client_for(self.admin_user)

        response = client.get(
            f"/api/ai/analytics/at_risk_students/?class_id={self.class_two.id}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_get_at_risk_students.assert_called_once_with(
            class_id=self.class_two.id, send_notifications=True
        )
