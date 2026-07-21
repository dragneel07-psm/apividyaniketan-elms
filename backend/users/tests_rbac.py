# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from users.permissions import (
    IsAdmin,
    IsAdminOrSaaSAdmin,
    IsSaaSAdmin,
    IsStudent,
    IsTeacher,
    IsTeacherOrAdmin,
)

User = get_user_model()


class RBACPermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        # Create users with different roles
        self.student = User.objects.create_user(
            username="student",
            email="student@test.com",
            password="pass",
            role="student",
        )
        self.teacher = User.objects.create_user(
            username="teacher",
            email="teacher@test.com",
            password="pass",
            role="teacher",
        )
        self.admin = User.objects.create_user(
            username="admin", email="admin@test.com", password="pass", role="admin"
        )
        self.saas_admin = User.objects.create_user(
            username="saas", email="saas@test.com", password="pass", role="saas_admin"
        )
        self.view = APIView()  # Dummy view

    def check_permission(self, permission_class, user, expected_result):
        permission = permission_class()
        request = self.factory.get("/")
        request.user = user
        self.assertEqual(
            permission.has_permission(request, self.view),
            expected_result,
            f"Failed for {permission_class.__name__} with user role {user.role}",
        )

    def test_is_student(self):
        self.check_permission(IsStudent, self.student, True)
        self.check_permission(IsStudent, self.teacher, False)
        self.check_permission(IsStudent, self.admin, False)

    def test_is_teacher(self):
        self.check_permission(IsTeacher, self.teacher, True)
        self.check_permission(IsTeacher, self.student, False)
        self.check_permission(IsTeacher, self.admin, False)

    def test_is_admin(self):
        self.check_permission(IsAdmin, self.admin, True)
        self.check_permission(IsAdmin, self.teacher, False)
        self.check_permission(IsAdmin, self.saas_admin, False)  # Strict check

    def test_is_teacher_or_admin_composite(self):
        self.check_permission(IsTeacherOrAdmin, self.teacher, True)
        self.check_permission(IsTeacherOrAdmin, self.admin, True)
        self.check_permission(IsTeacherOrAdmin, self.saas_admin, True)
        self.check_permission(IsTeacherOrAdmin, self.student, False)

    def test_is_admin_or_saas_admin_composite(self):
        self.check_permission(IsAdminOrSaaSAdmin, self.admin, True)
        self.check_permission(IsAdminOrSaaSAdmin, self.saas_admin, True)
        self.check_permission(IsAdminOrSaaSAdmin, self.teacher, False)
        self.check_permission(IsAdminOrSaaSAdmin, self.student, False)
