# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Parent, Section, Student, Subject, Teacher
from academic.models.assessment import Assessment, Result
from core.models import AuditLog

User = get_user_model()


class ResultCardReportTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Result Report Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.admin_user = User.objects.create_user(
            username="report_admin",
            email="report_admin@example.com",
            password="Admin@1234",
            role="admin",
            first_name="Report",
            last_name="Admin",
            tenant=self.tenant,
        )
        self.student_user = User.objects.create_user(
            username="report_student",
            email="report_student@example.com",
            password="Student@1234",
            role="student",
            first_name="Report",
            last_name="Student",
            tenant=self.tenant,
        )
        self.other_student_user = User.objects.create_user(
            username="report_student_other",
            email="report_student_other@example.com",
            password="Student@1234",
            role="student",
            first_name="Other",
            last_name="Student",
            tenant=self.tenant,
        )
        self.parent_user = User.objects.create_user(
            username="report_parent",
            email="report_parent@example.com",
            password="Parent@1234",
            role="parent",
            first_name="Report",
            last_name="Parent",
            tenant=self.tenant,
        )
        self.teacher_user = User.objects.create_user(
            username="report_teacher",
            email="report_teacher@example.com",
            password="Teacher@1234",
            role="teacher",
            first_name="Report",
            last_name="Teacher",
            tenant=self.tenant,
        )

        self.academic_class = AcademicClass.objects.create(name="Grade 10", order=10)
        self.section = Section.objects.create(
            name="A", academic_class=self.academic_class
        )
        self.student = Student.objects.create(
            user=self.student_user,
            academic_class=self.academic_class,
            section=self.section,
        )
        self.teacher = Teacher.objects.create(user=self.teacher_user)
        self.teacher.assigned_classes.add(self.academic_class)

        self.parent = Parent.objects.create(user=self.parent_user)
        self.parent.students.add(self.student)

        self.subject = Subject.objects.create(
            name="Mathematics",
            code="MTH-10",
            academic_class=self.academic_class,
            teacher=self.teacher,
            is_active=True,
        )
        self.assessment = Assessment.objects.create(
            subject=self.subject,
            section=self.section,
            title="Mid Term Quiz",
            type="quiz",
            total_marks=20,
            passing_marks=8,
            blooms_level="apply",
        )
        self.result = Result.objects.create(
            assessment=self.assessment,
            student=self.student,
            score=16,
            time_taken_minutes=20,
        )

        self.other_class = AcademicClass.objects.create(name="Grade 11", order=11)
        self.other_section = Section.objects.create(
            name="B", academic_class=self.other_class
        )
        self.other_student = Student.objects.create(
            user=self.other_student_user,
            academic_class=self.other_class,
            section=self.other_section,
        )
        self.other_subject = Subject.objects.create(
            name="Physics",
            code="PHY-11",
            academic_class=self.other_class,
            is_active=True,
        )
        self.other_assessment = Assessment.objects.create(
            subject=self.other_subject,
            section=self.other_section,
            title="Physics Unit Test",
            type="quiz",
            total_marks=25,
            passing_marks=10,
            blooms_level="understand",
        )
        self.other_result = Result.objects.create(
            assessment=self.other_assessment,
            student=self.other_student,
            score=18,
            time_taken_minutes=22,
        )

    def test_result_card_uses_custom_primary_keys(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(
            f"/api/academic/reports/result-card/{self.student.student_id}/{self.result.result_id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(
            response["Content-Type"].split(";")[0], ["application/pdf", "text/html"]
        )
        audit_row = AuditLog.objects.filter(
            action="academic.report_exported",
            details__report_type="result_card",
            details__result_id=str(self.result.result_id),
        ).first()
        self.assertIsNotNone(audit_row)

    def test_student_can_access_own_result_card_but_not_other_student(self):
        self.client.force_authenticate(user=self.student_user)
        own = self.client.get(
            f"/api/academic/reports/result-card/{self.student.student_id}/{self.result.result_id}/"
        )
        other = self.client.get(
            f"/api/academic/reports/result-card/{self.other_student.student_id}/{self.other_result.result_id}/"
        )
        self.assertEqual(own.status_code, status.HTTP_200_OK)
        self.assertEqual(other.status_code, status.HTTP_403_FORBIDDEN)

    def test_parent_can_access_child_result_card_only(self):
        self.client.force_authenticate(user=self.parent_user)
        child = self.client.get(
            f"/api/academic/reports/result-card/{self.student.student_id}/{self.result.result_id}/"
        )
        other = self.client.get(
            f"/api/academic/reports/result-card/{self.other_student.student_id}/{self.other_result.result_id}/"
        )
        self.assertEqual(child.status_code, status.HTTP_200_OK)
        self.assertEqual(other.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_scope_restricts_result_card_and_attendance_summary(self):
        self.client.force_authenticate(user=self.teacher_user)

        allowed_result = self.client.get(
            f"/api/academic/reports/result-card/{self.student.student_id}/{self.result.result_id}/"
        )
        blocked_result = self.client.get(
            f"/api/academic/reports/result-card/{self.other_student.student_id}/{self.other_result.result_id}/"
        )
        allowed_attendance_summary = self.client.get(
            f"/api/academic/reports/attendance-summary/{self.section.id}/"
        )
        blocked_attendance_summary = self.client.get(
            f"/api/academic/reports/attendance-summary/{self.other_section.id}/"
        )

        self.assertEqual(allowed_result.status_code, status.HTTP_200_OK)
        self.assertEqual(blocked_result.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(allowed_attendance_summary.status_code, status.HTTP_200_OK)
        self.assertEqual(
            blocked_attendance_summary.status_code, status.HTTP_403_FORBIDDEN
        )
