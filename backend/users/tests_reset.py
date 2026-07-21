# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class PasswordResetTests(FastTenantTestCase):
    # Tenant resolution is strict under DEBUG=False (test settings): requests
    # must carry a tenant host or they 400 with tenant_domain_required before
    # reaching the view. Run on a real tenant domain.

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Password Reset School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        with tenant_context(self.tenant):
            self.user = User.objects.create_user(
                username="resetuser",
                email="reset@test.com",
                password="OldPassword123!",
                tenant=self.tenant,
            )
        self.reset_url = "/api/users/password-reset/"
        self.confirm_url = "/api/users/password-reset-confirm/"

    def test_request_reset_email(self):
        """Test that requesting a password reset returns success"""
        response = self.client.post(self.reset_url, {"email": "reset@test.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_request_reset_unknown_email_does_not_enumerate(self):
        """An unknown email returns the same 200 + generic message as a known
        one, so an anonymous caller cannot enumerate registered accounts."""
        known = self.client.post(self.reset_url, {"email": "reset@test.com"})
        unknown = self.client.post(self.reset_url, {"email": "wrong@test.com"})
        self.assertEqual(known.status_code, status.HTTP_200_OK)
        self.assertEqual(unknown.status_code, status.HTTP_200_OK)
        self.assertEqual(known.data, unknown.data)

    def test_confirm_reset_success(self):
        """Test successful password reset confirmation"""
        # Generate token manually to simulate email link
        token = default_token_generator.make_token(self.user)
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        response = self.client.post(
            self.confirm_url,
            {
                "uid": uid,
                "token": token,
                "new_password": "NewPassword123!",
                "confirm_password": "NewPassword123!",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response must include role so the frontend can pick the correct
        # post-reset landing page (saas_admin → /saas-login, others → /login).
        self.assertIn("role", response.data)
        self.assertEqual(response.data["role"], self.user.role)

        # Verify login with new password
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPassword123!"))

    def test_confirm_reset_success_with_frontend_payload_shape(self):
        """Frontend sends uidb64 + password (without confirm_password)."""
        token = default_token_generator.make_token(self.user)
        uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))

        response = self.client.post(
            self.confirm_url,
            {
                "uidb64": uidb64,
                "token": token,
                "password": "NewPassword123!",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPassword123!"))

    def test_confirm_reset_mismatch(self):
        """Test that password mismatch fails"""
        token = default_token_generator.make_token(self.user)
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        response = self.client.post(
            self.confirm_url,
            {
                "uid": uid,
                "token": token,
                "new_password": "NewPassword123!",
                "confirm_password": "DifferentPassword!",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_reset_invalid_token(self):
        """Test that invalid token fails"""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        response = self.client.post(
            self.confirm_url,
            {
                "uid": uid,
                "token": "invalid-token",
                "new_password": "NewPassword123!",
                "confirm_password": "NewPassword123!",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
