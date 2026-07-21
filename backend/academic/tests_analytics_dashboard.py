# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

from datetime import date

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Assessment, Attendance, Result, Student, Subject

User = get_user_model()


class SchoolAnalyticsDashboardTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Analytics Dashboard Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.admin = User.objects.create_user(
            username="analytics_admin",
            email="analytics_admin@example.com",
            password="Admin@1234",
            role="admin",
            tenant=self.tenant,
        )
        student_user = User.objects.create_user(
            username="analytics_student",
            email="analytics_student@example.com",
            password="Student@1234",
            role="student",
            first_name="Analytics",
            last_name="Student",
            tenant=self.tenant,
        )
        academic_class = AcademicClass.objects.create(name="Analytics Grade", order=1)
        student = Student.objects.create(
            user=student_user,
            academic_class=academic_class,
        )
        subject = Subject.objects.create(
            name="Analytics Mathematics",
            code="ANA-MATH",
            academic_class=academic_class,
            is_active=True,
        )
        Attendance.objects.create(
            student=student,
            subject=subject,
            date=date.today(),
            status="present",
        )
        assessment = Assessment.objects.create(
            subject=subject,
            title="Published Analytics Exam",
            type="exam",
            total_marks=100,
            passing_marks=40,
            scheduled_at=timezone.now(),
            results_published=True,
        )
        Result.objects.create(assessment=assessment, student=student, score=85)

    def test_dashboard_uses_actual_model_fields_and_returns_aggregates(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get("/api/academic/analytics/dashboard/?days=30")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["snapshot"]["students"], 1)
        self.assertEqual(response.data["snapshot"]["total_results"], 1)
        self.assertEqual(response.data["snapshot"]["pass_rate"], 100.0)
        self.assertEqual(response.data["attendance_trend"][0]["present"], 1)
        self.assertEqual(response.data["grade_distribution"][1]["count"], 1)
        self.assertEqual(response.data["subject_performance"][0]["avg_pct"], 85.0)
        self.assertEqual(response.data["class_performance"][0]["avg_pct"], 85.0)
        self.assertEqual(response.data["assessment_activity"][0]["count"], 1)

