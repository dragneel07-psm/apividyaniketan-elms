# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Teacher, Timetable

User = get_user_model()


class TimetablePermissionTests(FastTenantTestCase):
    """Regression coverage for timetable permission rules in tenant schema.

    This class also serves as a deploy-trigger touchpoint for backend-only Railway watches.
    Keep this test maintained alongside timetable policy changes.
    Update this docstring only with no-op text when deploy retriggers are needed (latest refresh: 2026-03-04).
    """

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )

        self.admin_user = User.objects.create_user(
            username="admin_user",
            email="admin_user@example.com",
            password="Admin@1234",
            role="admin",
            first_name="Admin",
            last_name="User",
        )
        self.teacher_user = User.objects.create_user(
            username="teacher_user",
            email="teacher_user@example.com",
            password="Teacher@1234",
            role="teacher",
            first_name="Teacher",
            last_name="User",
        )

        self.academic_class = AcademicClass.objects.create(
            name="E2E Grade 10", order=10
        )
        self.teacher_profile = Teacher.objects.create(
            user=self.teacher_user, designation="subject_teacher"
        )
        self.teacher_profile.assigned_classes.add(self.academic_class)

    def test_teacher_cannot_patch_admin_main_slot(self):
        main_slot = Timetable.objects.create(
            academic_class=self.academic_class,
            day_of_week="Monday",
            start_time="09:00",
            end_time="10:00",
            subject_name="Mathematics",
            teacher=self.teacher_profile,
            room_number="101",
            entry_type="main",
            status="approved",
            created_by=self.admin_user,
            approved_by=self.admin_user,
            approved_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.patch(
            f"/api/academic/timetable/{main_slot.timetable_id}/",
            {"subject_name": "Edited by teacher"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        main_slot.refresh_from_db()
        self.assertEqual(main_slot.subject_name, "Mathematics")

    def test_teacher_creates_extra_as_pending_for_assigned_class(self):
        self.client.force_authenticate(user=self.teacher_user)
        payload = {
            "academic_class": self.academic_class.id,
            "day_of_week": "Tuesday",
            "start_time": "11:00",
            "end_time": "11:45",
            "subject_name": "Remedial Mathematics",
            "room_number": "LAB-2",
            "teacher": str(self.teacher_profile.teacher_id),
            "entry_type": "extra",
        }
        response = self.client.post("/api/academic/timetable/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get("entry_type"), "extra")
        self.assertEqual(response.data.get("status"), "pending")
        self.assertEqual(
            str(response.data.get("created_by")), str(self.teacher_user.user_id)
        )
