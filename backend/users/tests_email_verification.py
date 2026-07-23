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
    """
    EmailVerificationView is generic — it activates whichever user the
    uid/token pair resolves to, regardless of how the account was created.
    Public self-registration is disabled (see UserRegistrationSerializer),
    so these tests provision the pending user directly, the same way an
    admin-created account would land in the DB before its owner verifies.
    """

    def setUp(self):
        self.client = APIClient()
        self.verify_url = "/api/users/verify-email/"
        self.login_url = "/api/users/login/"
        self.user = User.objects.create_user(
            username="verify-me@example.com",
            email="verify-me@example.com",
            password="StrongPass123!",
            first_name="Verify",
            last_name="Me",
            role="teacher",
        )
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

    def test_verify_email_activates_user_and_unblocks_login(self):
        login_before_verify = self.client.post(
            self.login_url,
            {"email": "verify-me@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(login_before_verify.status_code, status.HTTP_401_UNAUTHORIZED)

        uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        verify_response = self.client.post(
            self.verify_url,
            {"uidb64": uidb64, "token": token},
            format="json",
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

        login_after_verify = self.client.post(
            self.login_url,
            {"email": "verify-me@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(login_after_verify.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_after_verify.data)

    def test_verify_email_rejects_invalid_token(self):
        uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))

        response = self.client.post(
            self.verify_url,
            {"uidb64": uidb64, "token": "invalid-token"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
