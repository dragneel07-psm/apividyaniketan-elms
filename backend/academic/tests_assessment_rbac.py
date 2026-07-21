# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import (
    AcademicClass,
    AcademicYear,
    Assessment,
    Parent,
    Result,
    Student,
    Subject,
    Teacher,
)
from academic.models.submission import Submission
from users.models import UserAccount


class AssessmentAccessControlTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Assessment Security School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    @staticmethod
    def _items(response):
        if isinstance(response.data, dict):
            return response.data.get("results", [])
        return response.data

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )

        self.admin_user = UserAccount.objects.create_user(
            username="assessment_admin",
            email="assessment_admin@example.com",
            password="Admin@1234",
            role="admin",
            tenant=self.tenant,
        )
        self.teacher_user = UserAccount.objects.create_user(
            username="assessment_teacher",
            email="assessment_teacher@example.com",
            password="Teacher@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.student_user = UserAccount.objects.create_user(
            username="assessment_student",
            email="assessment_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        self.other_student_user = UserAccount.objects.create_user(
            username="assessment_other_student",
            email="assessment_other_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        self.parent_user = UserAccount.objects.create_user(
            username="assessment_parent",
            email="assessment_parent@example.com",
            password="Parent@1234",
            role="parent",
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

        class_8 = AcademicClass.objects.create(name="Grade 8", order=8)
        class_9 = AcademicClass.objects.create(name="Grade 9", order=9)

        self.teacher = Teacher.objects.create(user=self.teacher_user)
        self.teacher.assigned_classes.add(class_8)

        self.student = Student.objects.create(
            user=self.student_user, academic_class=class_8
        )
        self.other_student = Student.objects.create(
            user=self.other_student_user, academic_class=class_9
        )

        parent = Parent.objects.create(user=self.parent_user)
        parent.students.add(self.student)

        self.subject_8 = Subject.objects.create(
            name="Math 8",
            code="MATH-8",
            academic_class=class_8,
            academic_year=self.year,
            teacher=self.teacher,
            is_active=True,
        )
        self.subject_9 = Subject.objects.create(
            name="Science 9",
            code="SCI-9",
            academic_class=class_9,
            academic_year=self.year,
            is_active=True,
        )

        self.assessment_8 = Assessment.objects.create(
            academic_year=self.year,
            subject=self.subject_8,
            title="Class 8 Quiz",
            type="quiz",
            total_marks=20,
            passing_marks=8,
        )
        self.assessment_9 = Assessment.objects.create(
            academic_year=self.year,
            subject=self.subject_9,
            title="Class 9 Quiz",
            type="quiz",
            total_marks=20,
            passing_marks=8,
        )

    def test_student_cannot_create_assessment(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.post(
            "/api/academic/assessments/",
            {
                "subject": self.subject_8.id,
                "title": "Unauthorized Quiz",
                "type": "quiz",
                "total_marks": 10,
                "passing_marks": 4,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_cannot_publish_outside_assigned_scope(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.post(
            f"/api/academic/assessments/{self.assessment_9.assessment_id}/publish_results/",
            {"publish": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_parent_only_sees_child_results(self):
        Result.objects.create(
            assessment=self.assessment_8, student=self.student, score=16
        )
        Result.objects.create(
            assessment=self.assessment_9, student=self.other_student, score=12
        )

        self.client.force_authenticate(user=self.parent_user)
        response = self.client.get("/api/academic/results/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = self._items(response)
        self.assertEqual(len(rows), 1)
        self.assertEqual(str(rows[0]["student"]), str(self.student.student_id))

    def test_student_cannot_submit_assessment_outside_class_scope(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.post(
            "/api/academic/submissions/submit_exam/",
            {
                "assessment": str(self.assessment_9.assessment_id),
                "answers": {},
                "time_taken": 1,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_cannot_grade_submission_outside_scope(self):
        submission = Submission.objects.create(
            assessment=self.assessment_9,
            student=self.other_student,
            status="submitted",
        )
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.post(
            f"/api/academic/submissions/{submission.submission_id}/grade/",
            {"score": 10, "status": "graded"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
