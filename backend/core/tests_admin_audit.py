# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from types import SimpleNamespace
from unittest.mock import patch

from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from core.models import AuditLog, Tenant
from core.models.tenant import Domain
from core.views import BackupViewSet, GlobalSettingsViewSet, TenantViewSet
from core.views_saas import TenantUserPasswordResetView
from users.models import UserAccount


class SaasAdminMutationAuditTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "SaaS Audit School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.factory = APIRequestFactory()
        with schema_context("public"):
            public_domain = (
                Domain.objects.filter(tenant__schema_name="public")
                .order_by("-is_primary")
                .first()
            )
            public_host = public_domain.domain if public_domain else "localhost"
            self.public_tenant = Tenant.objects.filter(schema_name="public").first()
        self.public_client = APIClient(HTTP_HOST=public_host)
        with schema_context("public"):
            self.saas_admin = UserAccount.objects.create_user(
                username="saas_audit_admin",
                email="saas_audit_admin@example.com",
                password="Saas@1234",
                role="saas_admin",
                is_staff=True,
                is_superuser=True,
                tenant=None,
            )

        with schema_context(self.tenant.schema_name):
            self.tenant_user = UserAccount.objects.create_user(
                username="tenant_reset_target",
                email="tenant_reset_target@example.com",
                password="OldPass@1234",
                role="admin",
                is_staff=True,
                tenant=self.tenant,
            )

    def test_tenant_user_password_reset_writes_audit_log(self):
        request = self.factory.post(
            f"/api/core/tenants/{self.tenant.id}/users/{self.tenant_user.user_id}/reset-password/",
            {"new_password": "NewPass@1234"},
            format="json",
        )
        force_authenticate(request, user=self.saas_admin)
        response = TenantUserPasswordResetView.as_view()(
            request,
            tenant_id=str(self.tenant.id),
            user_id=str(self.tenant_user.user_id),
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            msg=getattr(response, "data", None),
        )

        row = AuditLog.objects.filter(
            action="core.tenant_user_password_reset",
            details__tenant_id=str(self.tenant.id),
            details__target_user_id=str(self.tenant_user.user_id),
        ).first()
        self.assertIsNotNone(row)

    def test_global_settings_update_writes_audit_log(self):
        request = self.factory.post(
            "/api/core/settings/",
            {"site_name": "Audit LMS", "maintenance_mode": True, "ai_enabled": False},
            format="json",
        )
        force_authenticate(request, user=self.saas_admin)
        response = GlobalSettingsViewSet.as_view({"post": "create"})(request)
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            msg=getattr(response, "data", None),
        )

        row = AuditLog.objects.filter(action="core.global_settings_updated").first()
        self.assertIsNotNone(row)
        self.assertIn("before", row.details)
        self.assertIn("after", row.details)
        self.assertEqual(row.details.get("after", {}).get("site_name"), "Audit LMS")
        self.assertEqual(row.details.get("after", {}).get("maintenance_mode"), True)

    def test_backup_create_writes_audit_log(self):
        request = self.factory.post(
            "/api/core/backups/",
            {"all": True},
            format="json",
        )
        force_authenticate(request, user=self.saas_admin)
        request.tenant = self.public_tenant or SimpleNamespace(schema_name="public")
        with patch("core.views.call_command") as mocked_call_command:
            response = BackupViewSet.as_view({"post": "create"})(request)
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            msg=getattr(response, "data", None),
        )
        mocked_call_command.assert_called()

        row = AuditLog.objects.filter(action="core.backup_created").first()
        self.assertIsNotNone(row)
        self.assertEqual(row.details.get("all"), True)

    @patch("core.views.record_audit_event")
    @patch("core.views.connection.set_schema_to_public")
    def test_tenant_delete_uses_public_schema_and_force_drop(
        self, mock_set_public, mock_audit
    ):
        request = self.factory.delete(
            f"/api/core/tenants/{self.tenant.id}/",
            {"password": "Saas@1234"},
            format="json",
        )
        force_authenticate(request, user=self.saas_admin)

        view = TenantViewSet()
        view.request = request

        tenant = SimpleNamespace(
            id=self.tenant.id,
            schema_name=self.tenant.schema_name,
            name=self.tenant.name,
            status=self.tenant.status,
            type=self.tenant.type,
        )
        tenant.delete = lambda *args, **kwargs: None

        with patch.object(tenant, "delete") as mocked_delete:
            view.perform_destroy(tenant)

        mock_set_public.assert_called()
        mocked_delete.assert_called_once_with(force_drop=True)
        mock_audit.assert_called_once()

    def test_public_tenant_cannot_be_deleted(self):
        request = self.factory.delete(
            "/api/core/tenants/1/",
            {"password": "Saas@1234"},
            format="json",
        )
        force_authenticate(request, user=self.saas_admin)

        public_tenant = SimpleNamespace(
            schema_name="public",
            status="suspended",
        )

        view = TenantViewSet()
        view.request = request

        with patch.object(view, "get_object", return_value=public_tenant), patch.object(
            view, "perform_destroy"
        ) as mocked_destroy:
            response = view.destroy(request)

        self.assertEqual(response.status_code, 403)
        mocked_destroy.assert_not_called()
