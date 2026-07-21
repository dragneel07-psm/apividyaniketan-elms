# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from unittest.mock import patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient


class RegistrationEmailDispatchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = "/api/users/register/"
        self.payload = {
            "email": "saas-admin@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
            "first_name": "SaaS",
            "last_name": "Admin",
        }

    @patch("users.views.send_saas_admin_registration_email")
    def test_register_sends_saas_admin_email(self, mocked_email):
        response = self.client.post(self.register_url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mocked_email.assert_called_once()
