# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import override_settings
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import schema_context, tenant_context
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from core.models.tenant import Domain, Tenant

User = get_user_model()


@override_settings(ALLOWED_HOSTS=["localhost", "127.0.0.1", ".localhost", ".local"])
class TenantJwtIsolationTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "JWT Isolation School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        connection.set_schema_to_public()
        self.tenant.status = "active"
        self.tenant.save(update_fields=["status"])

        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        with tenant_context(self.tenant):
            self.user = User.objects.create_user(
                username="tenant_student",
                email="tenant_student@example.com",
                password="TestPass123!",
                first_name="Tenant",
                last_name="Student",
                role="student",
                tenant=self.tenant,
            )

        login_response = self.client.post(
            "/api/users/login/",
            {"email": "tenant_student@example.com", "password": "TestPass123!"},
            format="json",
        )
        self.assertEqual(
            login_response.status_code,
            status.HTTP_200_OK,
            msg=f"login failed status={login_response.status_code} body={getattr(login_response, 'data', getattr(login_response, 'content', b''))}",
        )
        self.access_token = login_response.data["access"]

        with schema_context("public"):
            suffix = uuid4().hex[:8]
            self.other_tenant = Tenant.objects.create(
                name=f"Other JWT School {suffix}",
                schema_name=f"other_{suffix}",
                subdomain=f"other-{suffix}",
            )
            self.other_domain = Domain.objects.create(
                domain=f"other-{suffix}.localhost",
                tenant=self.other_tenant,
                is_primary=True,
            )
        connection.set_schema_to_public()

    def test_valid_tenant_claim_can_access_profile(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.get("/api/users/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user.email)

    def test_mismatched_tenant_claim_is_rejected(self):
        forged_token = AccessToken.for_user(self.user)
        forged_token["tenant_schema"] = "another_school"
        forged_token["tenant_id"] = "00000000-0000-0000-0000-000000000000"

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(forged_token)}")
        response = self.client.get("/api/users/accounts/me/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get("code"), "token_tenant_user_mismatch")

    def test_missing_tenant_claim_is_rejected(self):
        token_without_tenant_claim = AccessToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {str(token_without_tenant_claim)}"
        )
        response = self.client.get("/api/users/accounts/me/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get("code"), "token_tenant_missing")

    def test_token_from_tenant_a_is_rejected_on_tenant_b_domain(self):
        cross_tenant_client = APIClient(HTTP_HOST=self.other_domain.domain)
        cross_tenant_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )
        response = cross_tenant_client.get("/api/users/accounts/me/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn(
            response.data.get("code"),
            {"token_tenant_mismatch", "token_tenant_user_mismatch", "validation_error"},
        )

    def test_tenant_status_blocks_authenticated_requests(self):
        self.tenant.status = "expired"
        self.tenant.save(update_fields=["status"])

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.get("/api/users/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json().get("code"), "tenant_inactive")

    def test_saas_admin_role_must_not_be_tenant_scoped(self):
        with tenant_context(self.tenant):
            self.user.role = "saas_admin"
            self.user.save(update_fields=["role"])

        forged_token = AccessToken.for_user(self.user)
        forged_token["tenant_schema"] = self.tenant.schema_name
        forged_token["tenant_id"] = str(self.tenant.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(forged_token)}")
        response = self.client.get("/api/users/accounts/me/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get("code"), "saas_admin_scope_invalid")

    def test_tenant_role_without_tenant_assignment_is_rejected(self):
        with tenant_context(self.tenant):
            self.user.tenant = None
            self.user.save(update_fields=["tenant"])

        forged_token = AccessToken.for_user(self.user)
        forged_token["tenant_schema"] = "public"
        forged_token["tenant_id"] = None
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(forged_token)}")
        response = self.client.get("/api/users/accounts/me/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn(
            response.data.get("code"),
            {"token_tenant_user_mismatch", "tenant_user_missing_tenant"},
        )
