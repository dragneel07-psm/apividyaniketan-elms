# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.models import AuditLog

User = get_user_model()


class AdminPasswordResetAuditTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Password Reset Audit School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.admin_user = User.objects.create_user(
            username="audit_admin",
            email="audit_admin@example.com",
            password="Admin@1234",
            role="admin",
            tenant=self.tenant,
        )
        self.target_user = User.objects.create_user(
            username="audit_teacher",
            email="audit_teacher@example.com",
            password="Teacher@1234",
            role="teacher",
            tenant=self.tenant,
        )

    def test_admin_password_reset_creates_audit_log(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            "/api/users/admin/reset-password/",
            {
                "user_id": str(self.target_user.user_id),
                "new_password": "NewTeacher@1234",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        row = AuditLog.objects.filter(
            action="users.admin_password_reset",
            details__target_user_id=str(self.target_user.user_id),
        ).first()
        self.assertIsNotNone(row)
        self.assertEqual(row.details.get("target_email"), self.target_user.email)
