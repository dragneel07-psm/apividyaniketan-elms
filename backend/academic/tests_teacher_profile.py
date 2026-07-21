# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Chapter, Lesson, Section, Subject, Teacher

User = get_user_model()


class TeacherProfileOverviewTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Teacher Profile Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )

        self.admin_user = User.objects.create_user(
            username="school_admin",
            email="school_admin@example.com",
            password="Admin@1234",
            role="admin",
            first_name="School",
            last_name="Admin",
            tenant=self.tenant,
        )
        self.teacher_user = User.objects.create_user(
            username="teacher_profile",
            email="teacher_profile@example.com",
            password="Teacher@1234",
            role="teacher",
            first_name="Asha",
            last_name="Sharma",
            tenant=self.tenant,
        )

        self.teacher_profile = Teacher.objects.create(
            user=self.teacher_user, designation="class_teacher"
        )

        self.class_grade_7 = AcademicClass.objects.create(name="Grade 7", order=7)
        self.class_grade_8 = AcademicClass.objects.create(name="Grade 8", order=8)
        Section.objects.create(name="A", academic_class=self.class_grade_7)
        Section.objects.create(name="B", academic_class=self.class_grade_7)
        Section.objects.create(name="A", academic_class=self.class_grade_8)

        self.teacher_profile.assigned_classes.add(
            self.class_grade_7, self.class_grade_8
        )

        lead_subject = Subject.objects.create(
            name="Mathematics",
            code="MTH-7",
            academic_class=self.class_grade_7,
            teacher=self.teacher_profile,
            is_active=True,
        )
        support_subject = Subject.objects.create(
            name="Science",
            code="SCI-7",
            academic_class=self.class_grade_7,
            is_active=True,
        )
        support_subject.additional_teachers.add(self.teacher_profile)

        other_teacher_user = User.objects.create_user(
            username="other_teacher",
            email="other_teacher@example.com",
            password="Teacher@1234",
            role="teacher",
            first_name="Other",
            last_name="Teacher",
            tenant=self.tenant,
        )
        other_teacher = Teacher.objects.create(
            user=other_teacher_user, designation="subject_teacher"
        )
        Subject.objects.create(
            name="English",
            code="ENG-8",
            academic_class=self.class_grade_8,
            teacher=other_teacher,
            is_active=True,
        )

        self._create_subject_lessons(lead_subject, total=3, published=2)
        self._create_subject_lessons(support_subject, total=2, published=1)

    def _create_subject_lessons(self, subject, total, published):
        chapter = Chapter.objects.create(
            subject=subject, title=f"{subject.name} Unit", order=1, is_published=True
        )
        for index in range(total):
            Lesson.objects.create(
                chapter=chapter,
                title=f"{subject.name} Lesson {index + 1}",
                order=index + 1,
                is_published=index < published,
            )

    def test_teacher_profile_overview_contains_subject_roles_and_progress(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            f"/api/academic/teachers/{self.teacher_profile.teacher_id}/profile-overview/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["teacher_name"], "Asha Sharma")
        self.assertEqual(response.data["summary"]["total_subjects"], 2)
        self.assertEqual(response.data["summary"]["total_classes"], 2)
        self.assertEqual(response.data["summary"]["total_lessons"], 5)
        self.assertEqual(response.data["summary"]["taught_lessons"], 3)
        self.assertEqual(response.data["summary"]["remaining_lessons"], 2)

        subjects = response.data["subjects"]
        math = next(item for item in subjects if item["subject_name"] == "Mathematics")
        science = next(item for item in subjects if item["subject_name"] == "Science")

        self.assertEqual(math["role"], "lead_teacher")
        self.assertEqual(math["total_lessons"], 3)
        self.assertEqual(math["taught_lessons"], 2)
        self.assertEqual(science["role"], "additional_teacher")
        self.assertEqual(science["total_lessons"], 2)
        self.assertEqual(science["taught_lessons"], 1)

        class_rows = response.data["class_sections_progress"]
        grade_7 = next(item for item in class_rows if item["class_name"] == "Grade 7")
        grade_8 = next(item for item in class_rows if item["class_name"] == "Grade 8")

        self.assertIn("class_teacher", grade_7["roles"])
        self.assertIn("subject_teacher", grade_7["roles"])
        self.assertEqual(grade_7["total_subjects"], 2)
        self.assertEqual(grade_7["total_lessons"], 5)
        self.assertEqual(grade_7["taught_lessons"], 3)
        self.assertEqual(grade_7["remaining_lessons"], 2)
        self.assertEqual(grade_7["section_names"], ["A", "B"])

        self.assertIn("class_teacher", grade_8["roles"])
        self.assertNotIn("subject_teacher", grade_8["roles"])
        self.assertEqual(grade_8["total_subjects"], 0)
        self.assertEqual(grade_8["total_lessons"], 0)
