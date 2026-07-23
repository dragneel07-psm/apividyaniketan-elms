# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.models import AuditLog

User = get_user_model()


class UserRoleAuditLoggingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username="user_audit_admin",
            email="user_audit_admin@example.com",
            password="Admin@1234",
            role="admin",
        )
        self.target_user = User.objects.create_user(
            username="user_audit_target",
            email="user_audit_target@example.com",
            password="Teacher@1234",
            role="teacher",
        )

    def test_role_change_creates_audit_log(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f"/api/users/accounts/{self.target_user.user_id}/",
            {"role": "parent"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        audit_row = AuditLog.objects.filter(action="users.role_changed").first()
        self.assertIsNotNone(audit_row)
        self.assertEqual(
            str(audit_row.details.get("actor_user_id")), str(self.admin_user.user_id)
        )
        self.assertEqual(
            str(audit_row.details.get("target_user_id")), str(self.target_user.user_id)
        )
        self.assertEqual(audit_row.details.get("previous_role"), "teacher")
        self.assertEqual(audit_row.details.get("new_role"), "parent")
