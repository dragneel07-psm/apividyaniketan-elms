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

    def test_register_user_success(self):
        """Test successful user registration"""
        response = self.client.post(
            self.register_url, self.valid_payload, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get("verification_required"))
        self.assertEqual(response.data["user"]["email"], "test@example.com")
        self.assertEqual(response.data["user"]["role"], "saas_admin")
        self.assertNotIn("tokens", response.data)

        # Verify user was created in database
        self.assertTrue(User.objects.filter(email="test@example.com").exists())
        user = User.objects.get(email="test@example.com")
        self.assertFalse(user.is_active)

    def test_register_duplicate_email(self):
        """Test registration with duplicate email"""
        # Create first user
        self.client.post(self.register_url, self.valid_payload, format="json")

        # Try to create second user with same email
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

    def test_password_is_hashed(self):
        """Test that password is hashed in database"""
        self.client.post(self.register_url, self.valid_payload, format="json")

        user = User.objects.get(email="test@example.com")
        self.assertNotEqual(user.password, "TestPass123!")
        # Django uses pbkdf2 by default
        self.assertTrue(
            user.password.startswith("pbkdf2_sha256")
            or user.password.startswith("bcrypt")
        )

    def test_register_without_username(self):
        """Test registration without username (should use email as username)"""
        payload = self.valid_payload.copy()
        # Don't include username

        response = self.client.post(self.register_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="test@example.com")
        self.assertEqual(user.username, "test@example.com")

    def test_register_default_role(self):
        """Test that public registration always creates SaaS admin users"""
        payload = self.valid_payload.copy()
        del payload["role"]

        response = self.client.post(self.register_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["role"], "saas_admin")
