# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Section, Student

User = get_user_model()


class StudentCreationTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Student Creation Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.admin_user = User.objects.create_user(
            username="student_creation_admin",
            email="student_creation_admin@example.com",
            password="Admin@1234",
            role="admin",
            first_name="Admin",
            last_name="User",
            tenant=self.tenant,
        )
        self.client.force_authenticate(user=self.admin_user)

        self.academic_class = AcademicClass.objects.create(name="Grade 8", order=8)
        self.section = Section.objects.create(
            name="A", academic_class=self.academic_class
        )

    def _payload(self, email: str):
        return {
            "first_name": "Rina",
            "last_name": "Shrestha",
            "email": email,
            "password": "Student@1234",
            "academic_class": self.academic_class.id,
            "section": self.section.id,
            "learning_style": "visual",
            "daily_study_goal": 30,
        }

    def test_create_student_reuses_existing_student_user_without_profile(self):
        existing_user = User.objects.create_user(
            username="rina_existing",
            email="rina_existing@example.com",
            password="OldPassword@123",
            role="student",
            first_name="Old",
            last_name="Name",
            tenant=self.tenant,
        )

        users_before = User.objects.count()
        response = self.client.post(
            "/api/academic/students/", self._payload(existing_user.email), format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), users_before)
        self.assertTrue(Student.objects.filter(user=existing_user).exists())

    def test_create_student_rejects_existing_teacher_email_with_clear_message(self):
        User.objects.create_user(
            username="teacher_dup",
            email="teacher_dup@example.com",
            password="Teacher@1234",
            role="teacher",
            first_name="Tea",
            last_name="Cher",
            tenant=self.tenant,
        )

        response = self.client.post(
            "/api/academic/students/",
            self._payload("teacher_dup@example.com"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertIn("teacher account", str(response.data["email"][0]).lower())

    def test_create_student_rejects_existing_student_profile_with_location_hint(self):
        existing_user = User.objects.create_user(
            username="student_dup",
            email="student_dup@example.com",
            password="Student@1234",
            role="student",
            first_name="Stu",
            last_name="Dent",
            tenant=self.tenant,
        )
        Student.objects.create(
            user=existing_user,
            academic_class=self.academic_class,
            section=self.section,
            learning_style="visual",
            daily_study_goal=30,
        )

        response = self.client.post(
            "/api/academic/students/",
            self._payload("student_dup@example.com"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        msg = str(response.data["email"][0])
        self.assertIn("already exists in this school", msg.lower())
        self.assertIn("Grade 8", msg)
        self.assertIn("A", msg)

    def test_student_list_and_detail_include_linked_user_fields(self):
        linked_user = User.objects.create_user(
            username="linked_student",
            email="linked_student@example.com",
            password="Student@1234",
            role="student",
            first_name="Linked",
            last_name="Learner",
            tenant=self.tenant,
        )
        student = Student.objects.create(
            user=linked_user,
            academic_class=self.academic_class,
            section=self.section,
            learning_style="practice",
            daily_study_goal=45,
        )

        list_response = self.client.get("/api/academic/students/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        list_rows = (
            list_response.data["results"]
            if isinstance(list_response.data, dict)
            else list_response.data
        )
        list_row = next(
            item for item in list_rows if str(item["id"]) == str(student.student_id)
        )
        self.assertEqual(str(list_row["user_id"]), str(linked_user.user_id))
        self.assertEqual(list_row["username"], linked_user.username)
        self.assertEqual(list_row["email"], linked_user.email)
        self.assertEqual(list_row["first_name"], linked_user.first_name)
        self.assertEqual(list_row["last_name"], linked_user.last_name)
        self.assertEqual(list_row["learning_style"], "practice")
        self.assertEqual(list_row["daily_study_goal"], 45)

        detail_response = self.client.get(
            f"/api/academic/students/{student.student_id}/"
        )
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(detail_response.data["user_id"]), str(linked_user.user_id))
        self.assertEqual(detail_response.data["username"], linked_user.username)
        self.assertEqual(detail_response.data["email"], linked_user.email)
        self.assertEqual(detail_response.data["first_name"], linked_user.first_name)
        self.assertEqual(detail_response.data["last_name"], linked_user.last_name)
