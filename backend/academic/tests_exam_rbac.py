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
    Exam,
    Parent,
    Student,
    Subject,
    Teacher,
)
from users.models import UserAccount


class ExamAccessControlTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Exam Security School"

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

        self.teacher_user = UserAccount.objects.create_user(
            username="exam_teacher",
            email="exam_teacher@example.com",
            password="Teacher@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.student_user = UserAccount.objects.create_user(
            username="exam_student",
            email="exam_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        self.parent_user = UserAccount.objects.create_user(
            username="exam_parent",
            email="exam_parent@example.com",
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

        teacher = Teacher.objects.create(user=self.teacher_user)
        teacher.assigned_classes.add(class_8)

        self.student = Student.objects.create(
            user=self.student_user, academic_class=class_8
        )
        parent = Parent.objects.create(user=self.parent_user)
        parent.students.add(self.student)

        subject_8 = Subject.objects.create(
            name="Math 8",
            code="MATH-8",
            academic_class=class_8,
            academic_year=self.year,
            teacher=teacher,
            is_active=True,
        )
        subject_9 = Subject.objects.create(
            name="Science 9",
            code="SCI-9",
            academic_class=class_9,
            academic_year=self.year,
            is_active=True,
        )

        assessment_8 = Assessment.objects.create(
            academic_year=self.year,
            subject=subject_8,
            title="Midterm 8",
            type="exam",
            total_marks=100,
            passing_marks=40,
        )
        assessment_9 = Assessment.objects.create(
            academic_year=self.year,
            subject=subject_9,
            title="Midterm 9",
            type="exam",
            total_marks=100,
            passing_marks=40,
        )

        self.exam_8 = Exam.objects.create(assessment=assessment_8, is_published=True)
        self.exam_9 = Exam.objects.create(assessment=assessment_9, is_published=True)

    def test_student_cannot_allocate_seating(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.post(
            f"/api/academic/exams/{self.exam_8.exam_id}/allocate_seating/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_cannot_publish_exam_outside_scope(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.post(
            f"/api/academic/exams/{self.exam_9.exam_id}/publish/", {}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_parent_only_sees_child_exam_scope(self):
        self.client.force_authenticate(user=self.parent_user)
        response = self.client.get("/api/academic/exams/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = self._items(response)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["exam_id"], str(self.exam_8.exam_id))
