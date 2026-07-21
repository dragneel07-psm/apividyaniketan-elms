# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Parent, Student
from library.models import Book, BookIssue
from users.models import UserAccount


class LibraryAccessControlTests(FastTenantTestCase):
    @staticmethod
    def _items(response):
        if isinstance(response.data, dict):
            return response.data.get("results", [])
        return response.data

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Library Security School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )

        self.admin_user = UserAccount.objects.create_user(
            username="lib_admin",
            email="lib_admin@example.com",
            password="Admin@1234",
            role="admin",
            tenant=self.tenant,
        )
        self.student_user = UserAccount.objects.create_user(
            username="lib_student",
            email="lib_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        self.other_student_user = UserAccount.objects.create_user(
            username="lib_other_student",
            email="lib_other_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        self.parent_user = UserAccount.objects.create_user(
            username="lib_parent",
            email="lib_parent@example.com",
            password="Parent@1234",
            role="parent",
            tenant=self.tenant,
        )

        academic_class = AcademicClass.objects.create(name="Grade 6", order=6)
        self.student = Student.objects.create(
            user=self.student_user, academic_class=academic_class
        )
        self.other_student = Student.objects.create(
            user=self.other_student_user, academic_class=academic_class
        )
        self.parent = Parent.objects.create(user=self.parent_user)
        self.parent.students.add(self.student)

        self.book = Book.objects.create(
            title="Clean Code",
            author="Robert C. Martin",
            isbn="9780132350884",
            category="technology",
            total_copies=3,
            available_copies=3,
        )
        self.issue_self = BookIssue.objects.create(
            book=self.book,
            student=self.student,
            due_date=timezone.now().date(),
        )
        self.issue_other = BookIssue.objects.create(
            book=self.book,
            student=self.other_student,
            due_date=timezone.now().date(),
        )

    def test_student_cannot_issue_books(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.post(
            "/api/library/issues/",
            {
                "book": str(self.book.book_id),
                "student": str(self.student.student_id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_parent_and_student_only_see_allowed_issues(self):
        self.client.force_authenticate(user=self.student_user)
        student_resp = self.client.get("/api/library/issues/")
        self.assertEqual(student_resp.status_code, status.HTTP_200_OK)
        student_items = self._items(student_resp)
        self.assertEqual(len(student_items), 1)
        self.assertEqual(student_items[0]["issue_id"], str(self.issue_self.issue_id))

        self.client.force_authenticate(user=self.parent_user)
        parent_resp = self.client.get("/api/library/issues/")
        self.assertEqual(parent_resp.status_code, status.HTTP_200_OK)
        parent_items = self._items(parent_resp)
        self.assertEqual(len(parent_items), 1)
        self.assertEqual(parent_items[0]["issue_id"], str(self.issue_self.issue_id))

        self.client.force_authenticate(user=self.admin_user)
        admin_resp = self.client.get("/api/library/issues/")
        self.assertEqual(admin_resp.status_code, status.HTTP_200_OK)
        admin_items = self._items(admin_resp)
        self.assertEqual(len(admin_items), 2)
