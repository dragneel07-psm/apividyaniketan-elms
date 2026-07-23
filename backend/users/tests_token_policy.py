# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from datetime import datetime, timezone

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

User = get_user_model()


class RoleBasedTokenPolicyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="role_admin",
            email="role_admin@example.com",
            password="AdminPass@123",
            role="admin",
        )
        self.student = User.objects.create_user(
            username="role_student",
            email="role_student@example.com",
            password="StudentPass@123",
            role="student",
        )

    def _login(self, email: str, password: str):
        response = self.client.post(
            "/api/users/login/",
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=response.data)
        return response.data

    def _remaining_seconds(self, token_cls, token_value: str) -> float:
        token = token_cls(token_value)
        exp = datetime.fromtimestamp(int(token["exp"]), tz=timezone.utc)
        return (exp - datetime.now(timezone.utc)).total_seconds()

    def test_admin_tokens_expire_faster_than_student_tokens(self):
        admin_tokens = self._login("role_admin@example.com", "AdminPass@123")
        student_tokens = self._login("role_student@example.com", "StudentPass@123")

        admin_access_remaining = self._remaining_seconds(
            AccessToken, admin_tokens["access"]
        )
        student_access_remaining = self._remaining_seconds(
            AccessToken, student_tokens["access"]
        )
        admin_refresh_remaining = self._remaining_seconds(
            RefreshToken, admin_tokens["refresh"]
        )
        student_refresh_remaining = self._remaining_seconds(
            RefreshToken, student_tokens["refresh"]
        )

        self.assertLess(admin_access_remaining, student_access_remaining)
        self.assertLess(admin_refresh_remaining, student_refresh_remaining)

    def test_refresh_rotation_blacklists_old_refresh_token(self):
        tokens = self._login("role_student@example.com", "StudentPass@123")
        old_refresh = tokens["refresh"]

        first_refresh_response = self.client.post(
            "/api/users/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(
            first_refresh_response.status_code,
            status.HTTP_200_OK,
            msg=first_refresh_response.data,
        )
        self.assertIn("refresh", first_refresh_response.data)
        self.assertNotEqual(first_refresh_response.data["refresh"], old_refresh)

        reuse_response = self.client.post(
            "/api/users/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(reuse_response.status_code, status.HTTP_401_UNAUTHORIZED)
