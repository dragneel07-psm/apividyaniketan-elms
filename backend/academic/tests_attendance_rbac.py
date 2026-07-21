# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Attendance, Parent, Student, Subject, Teacher
from users.models import UserAccount


class AttendanceAccessControlTests(FastTenantTestCase):
    @staticmethod
    def _items(response):
        if isinstance(response.data, dict):
            return response.data.get("results", [])
        return response.data

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Attendance Security School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )

        self.teacher_user = UserAccount.objects.create_user(
            username="att_teacher",
            email="att_teacher@example.com",
            password="Teacher@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.student_user = UserAccount.objects.create_user(
            username="att_student",
            email="att_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        self.other_student_user = UserAccount.objects.create_user(
            username="att_other_student",
            email="att_other_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        self.parent_user = UserAccount.objects.create_user(
            username="att_parent",
            email="att_parent@example.com",
            password="Parent@1234",
            role="parent",
            tenant=self.tenant,
        )

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
            name="Mathematics",
            code="MATH-8",
            academic_class=class_8,
            teacher=self.teacher,
            is_active=True,
        )
        self.subject_9 = Subject.objects.create(
            name="Science",
            code="SCI-9",
            academic_class=class_9,
            is_active=True,
        )

        self.attendance_self = Attendance.objects.create(
            student=self.student,
            subject=self.subject_8,
            date="2026-03-01",
            status="present",
        )
        self.attendance_other = Attendance.objects.create(
            student=self.other_student,
            subject=self.subject_9,
            date="2026-03-01",
            status="absent",
        )

    def test_student_cannot_create_attendance(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.post(
            "/api/academic/attendance/",
            {
                "student": str(self.student.student_id),
                "subject": self.subject_8.id,
                "date": "2026-03-02",
                "status": "present",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_parent_sees_only_child_attendance(self):
        self.client.force_authenticate(user=self.parent_user)
        response = self.client.get("/api/academic/attendance/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = self._items(response)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["attendance_id"], self.attendance_self.attendance_id)

    def test_teacher_cannot_mark_unassigned_class_attendance(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.post(
            "/api/academic/attendance/",
            {
                "student": str(self.other_student.student_id),
                "subject": self.subject_9.id,
                "date": "2026-03-02",
                "status": "present",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
