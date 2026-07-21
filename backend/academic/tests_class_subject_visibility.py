# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, AcademicYear, Subject, Teacher
from users.models import UserAccount


class ClassAndSubjectVisibilityTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Class Visibility School"

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
            username="visibility_teacher",
            email="visibility_teacher@example.com",
            password="Teacher@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.other_teacher_user = UserAccount.objects.create_user(
            username="other_visibility_teacher",
            email="other_visibility_teacher@example.com",
            password="Teacher@1234",
            role="teacher",
            tenant=self.tenant,
        )

        self.teacher_profile = Teacher.objects.create(user=self.teacher_user)
        self.other_teacher_profile = Teacher.objects.create(
            user=self.other_teacher_user
        )

        self.class_8 = AcademicClass.objects.create(name="Grade 8", order=8)
        self.class_9 = AcademicClass.objects.create(name="Grade 9", order=9)
        self.class_10 = AcademicClass.objects.create(name="Grade 10", order=10)
        self.teacher_profile.assigned_classes.add(self.class_8)

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

        self.subject_assigned = Subject.objects.create(
            name="Math 8",
            code="MTH-8",
            academic_class=self.class_8,
            academic_year=self.year,
            teacher=self.teacher_profile,
            is_active=True,
        )
        self.subject_additional = Subject.objects.create(
            name="Science 9",
            code="SCI-9",
            academic_class=self.class_9,
            academic_year=self.year,
            teacher=self.other_teacher_profile,
            is_active=True,
        )
        self.subject_additional.additional_teachers.add(self.teacher_profile)
        self.subject_hidden = Subject.objects.create(
            name="English 10",
            code="ENG-10",
            academic_class=self.class_10,
            academic_year=self.year,
            teacher=self.other_teacher_profile,
            is_active=True,
        )

    def test_teacher_classes_api_only_returns_assigned_classes(self):
        self.client.force_authenticate(user=self.teacher_user)

        list_response = self.client.get("/api/academic/classes/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        rows = self._items(list_response)
        returned_ids = {row["id"] for row in rows}
        self.assertEqual(returned_ids, {self.class_8.id})

        assigned_detail = self.client.get(f"/api/academic/classes/{self.class_8.id}/")
        self.assertEqual(assigned_detail.status_code, status.HTTP_200_OK)

        hidden_detail = self.client.get(f"/api/academic/classes/{self.class_10.id}/")
        self.assertEqual(hidden_detail.status_code, status.HTTP_404_NOT_FOUND)

    def test_teacher_subject_api_returns_assigned_or_taught_subjects(self):
        self.client.force_authenticate(user=self.teacher_user)

        list_response = self.client.get("/api/academic/subjects/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        rows = self._items(list_response)
        returned_ids = {row["id"] for row in rows}
        self.assertIn(self.subject_assigned.id, returned_ids)
        self.assertIn(self.subject_additional.id, returned_ids)
        self.assertNotIn(self.subject_hidden.id, returned_ids)

        hidden_detail = self.client.get(
            f"/api/academic/subjects/{self.subject_hidden.id}/"
        )
        self.assertEqual(hidden_detail.status_code, status.HTTP_404_NOT_FOUND)
