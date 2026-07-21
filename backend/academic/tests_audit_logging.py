# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import (
    AcademicClass,
    AcademicYear,
    Assessment,
    Result,
    Student,
    Subject,
)
from core.models import AuditLog

User = get_user_model()


class AcademicAuditLoggingTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Academic Audit School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.admin_user = User.objects.create_user(
            username="academic_audit_admin",
            email="academic_audit_admin@example.com",
            password="Admin@1234",
            role="admin",
            tenant=self.tenant,
        )
        self.student_user = User.objects.create_user(
            username="academic_audit_student",
            email="academic_audit_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        self.year, _ = AcademicYear.objects.get_or_create(
            name="2025-2026",
            defaults={
                "start_date": "2025-04-01",
                "end_date": "2026-03-31",
                "is_current": True,
            },
        )
        if not self.year.is_current:
            self.year.is_current = True
            self.year.save(update_fields=["is_current"])

        grade_8 = AcademicClass.objects.create(name="Grade 8", order=8)
        self.student = Student.objects.create(
            user=self.student_user, academic_class=grade_8
        )
        self.subject = Subject.objects.create(
            name="Mathematics",
            code="MATH-8",
            academic_class=grade_8,
            academic_year=self.year,
            is_active=True,
        )
        self.assessment = Assessment.objects.create(
            academic_year=self.year,
            subject=self.subject,
            title="Final Mathematics",
            type="exam",
            total_marks=100,
            passing_marks=40,
            is_final_assessment=True,
        )
        self.result = Result.objects.create(
            assessment=self.assessment,
            student=self.student,
            score=72,
        )

    def test_result_update_creates_audit_log(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f"/api/academic/results/{self.result.result_id}/",
            {"score": 85, "teacher_feedback": "Improved after recheck"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        row = AuditLog.objects.filter(action="academic.result_updated").first()
        self.assertIsNotNone(row)
        self.assertEqual(str(row.details.get("result_id")), str(self.result.result_id))
        self.assertEqual(row.details.get("before", {}).get("score"), 72)
        self.assertEqual(row.details.get("after", {}).get("score"), 85)

    def test_publish_results_creates_audit_log(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            f"/api/academic/assessments/{self.assessment.assessment_id}/publish_results/",
            {"publish": True, "reason": "Final moderation completed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        row = AuditLog.objects.filter(
            action="academic.results_publish_state_changed",
            details__assessment_id=str(self.assessment.assessment_id),
        ).first()
        self.assertIsNotNone(row)
        self.assertEqual(row.details.get("action"), "publish")
        self.assertTrue(row.details.get("is_published"))
