# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class EmailVerificationFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = "/api/users/register/"
        self.verify_url = "/api/users/verify-email/"
        self.login_url = "/api/users/login/"
        self.payload = {
            "email": "verify-me@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
            "first_name": "Verify",
            "last_name": "Me",
        }

    def test_saas_signup_requires_email_verification_before_login(self):
        register_response = self.client.post(
            self.register_url, self.payload, format="json"
        )
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(register_response.data.get("verification_required"))

        user = User.objects.get(email="verify-me@example.com")
        self.assertFalse(user.is_active)

        login_response = self.client.post(
            self.login_url,
            {"email": "verify-me@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_401_UNAUTHORIZED)

        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_response = self.client.post(
            self.verify_url,
            {"uidb64": uidb64, "token": token},
            format="json",
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertTrue(user.is_active)

        login_after_verify = self.client.post(
            self.login_url,
            {"email": "verify-me@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(login_after_verify.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_after_verify.data)

    def test_verify_email_rejects_invalid_token(self):
        self.client.post(self.register_url, self.payload, format="json")
        user = User.objects.get(email="verify-me@example.com")
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))

        response = self.client.post(
            self.verify_url,
            {"uidb64": uidb64, "token": "invalid-token"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertFalse(user.is_active)
