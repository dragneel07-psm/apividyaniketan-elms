# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


class WebSocketTicketTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="wsuser",
            email="ws@test.com",
            password="Password123!",
            role="student",
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

