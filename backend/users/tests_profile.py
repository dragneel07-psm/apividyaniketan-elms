# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class UserProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="profiletest",
            email="profile@test.com",
            password="Password123!",
            first_name="OldFirst",
            last_name="OldLast",
        )
        self.client.force_authenticate(user=self.user)
        self.me_url = "/api/users/accounts/me/"

    def test_get_profile(self):
        """Test retrieving own profile"""
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "profile@test.com")
        self.assertEqual(response.data["first_name"], "OldFirst")

    def test_update_profile(self):
        """Test updating own profile via PATCH"""
        data = {"first_name": "NewFirst", "last_name": "NewLast"}
        response = self.client.patch(self.me_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "NewFirst")
        self.assertEqual(response.data["last_name"], "NewLast")

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "NewFirst")
        self.assertEqual(self.user.last_name, "NewLast")

    def test_change_password(self):
        """Test changing password"""
        url = "/api/users/accounts/change-password/"
        data = {"old_password": "Password123!", "new_password": "NewPassword123!"}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPassword123!"))

    def test_change_password_wrong_old(self):
        """Test changing password with wrong current password"""
        url = "/api/users/accounts/change-password/"
        data = {"old_password": "WrongPassword!", "new_password": "NewPassword123!"}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
