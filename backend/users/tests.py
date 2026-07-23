# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
# users/tests.py
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class UserRegistrationTests(TestCase):
    """Test suite for user registration"""

    def setUp(self):
        self.client = APIClient()
        self.register_url = "/api/users/register/"
        self.valid_payload = {
            "email": "test@example.com",
            "password": "TestPass123!",
            "password_confirm": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "role": "student",
        }

    def test_register_is_disabled_for_public_users(self):
        """Public self-registration is blocked; accounts must be provisioned
        by a school administrator (see UserRegistrationSerializer.create)."""
        response = self.client.post(
            self.register_url, self.valid_payload, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("disabled", response.data["message"].lower())
        self.assertFalse(User.objects.filter(email="test@example.com").exists())

    def test_register_duplicate_email(self):
        """Email-uniqueness validation still runs (and blocks) even though
        registration itself can never create a user."""
        User.objects.create_user(
            username="test@example.com",
            email="test@example.com",
            password="ExistingPass123!",
            role="student",
        )

        response = self.client.post(
            self.register_url, self.valid_payload, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_invalid_email(self):
        """Test registration with invalid email format"""
        payload = self.valid_payload.copy()
        payload["email"] = "invalid-email"

        response = self.client.post(self.register_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_password_mismatch(self):
        """Test registration with mismatched passwords"""
        payload = self.valid_payload.copy()
        payload["password_confirm"] = "DifferentPass123!"

        response = self.client.post(self.register_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_register_weak_password(self):
        """Test registration with weak password"""
        payload = self.valid_payload.copy()
        payload["password"] = "123"
        payload["password_confirm"] = "123"

        response = self.client.post(self.register_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_register_missing_fields(self):
        """Test registration with missing required fields"""
        response = self.client.post(self.register_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertIn("password", response.data)

