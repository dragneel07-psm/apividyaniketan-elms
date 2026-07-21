# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


class WebSocketTicketTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "WS Ticket Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        with tenant_context(self.tenant):
            self.user = User.objects.create_user(
                username="wsuser",
                email="ws@test.com",
                password="Password123!",
                role="student",
                tenant=self.tenant,
            )
        self.url = "/api/users/ws-ticket/"

    def _login_access_token(self) -> str:
        response = self.client.post(
            "/api/users/login/",
            {
                "email": "ws@test.com",
                "password": "Password123!",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data["access"]

    def test_requires_authentication(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_issues_short_lived_token(self):
        access = self._login_access_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertLessEqual(response.data["expires_in"], 60)

        # Ticket must be a valid simplejwt access token bound to the user,
        # since core.ws_middleware.JWTAuthMiddleware validates it as one.
        ticket = AccessToken(response.data["token"])
        self.assertEqual(str(ticket["user_id"]), str(self.user.user_id))

        # Ticket must expire sooner than the session access token it came from.
        self.assertLess(ticket["exp"], AccessToken(access)["exp"])

    def test_copies_tenant_claims_from_current_token(self):
        access = self._login_access_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # JWTAuthMiddleware routes WS connections by tenant_schema, so the
        # ticket must carry the same tenant claims as the login token.
        ticket = AccessToken(response.data["token"])
        source = AccessToken(access)
        self.assertEqual(ticket["tenant_schema"], source["tenant_schema"])
        self.assertEqual(ticket["role"], "student")
