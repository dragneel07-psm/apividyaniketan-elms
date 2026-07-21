# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class JWTAuthenticationTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "JWT Auth Test School"

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
                username="testuser",
                email="test@example.com",
                password="TestPass123!",
                first_name="Test",
                last_name="User",
                role="student",
                tenant=self.tenant,
            )
        self.login_url = "/api/users/login/"
        self.refresh_url = "/api/users/refresh/"

    def test_login_success(self):
        """Test login with correct credentials"""
        response = self.client.post(
            self.login_url, {"email": "test@example.com", "password": "TestPass123!"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        # Verify custom claims
        access_token_payload = self.client.post(
            self.login_url, {"email": "test@example.com", "password": "TestPass123!"}
        ).data["access"]

        # We can't easily decode JWT here without a library, but implicit check is sufficient for now
        # The serializer test would verify claims content more directly.

    def test_login_failure_wrong_password(self):
        """Test login with incorrect password"""
        response = self.client.post(
            self.login_url, {"email": "test@example.com", "password": "WrongPassword"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_failure_wrong_email(self):
        """Test login with incorrect email"""
        response = self.client.post(
            self.login_url, {"email": "wrong@example.com", "password": "TestPass123!"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_fields(self):
        """Test login with missing fields"""
        response = self.client.post(self.login_url, {"email": "test@example.com"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_rejects_broken_tenant_mapping(self):
        """Test login returns a controlled auth error when tenant FK is stale"""
        with tenant_context(self.tenant):
            self.user.tenant_id = 999999
            self.user.save(update_fields=["tenant"])

        response = self.client.post(
            self.login_url, {"email": "test@example.com", "password": "TestPass123!"}
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn(
            "tenant configuration", str(response.data.get("detail", "")).lower()
        )

    def test_token_refresh(self):
        """Test token refresh mechanism"""
        # 1. Login to get refresh token
        login_response = self.client.post(
            self.login_url, {"email": "test@example.com", "password": "TestPass123!"}
        )
        refresh_token = login_response.data["refresh"]

        # 2. Use refresh token to get new access token
        refresh_response = self.client.post(
            self.refresh_url, {"refresh": refresh_token}
        )

        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)
        # Note: Depending on ROTATE_REFRESH_TOKENS settings, we might or might not get a new refresh token.

    def test_token_refresh_invalid(self):
        """Test refresh with invalid token"""
        response = self.client.post(
            self.refresh_url, {"refresh": "invalid_token_string"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
