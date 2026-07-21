# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from unittest.mock import MagicMock, patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from users.models import UserAccount

from .models import Tenant


class TenantCreationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.saas_admin = UserAccount.objects.create_superuser(
            username="saasadmin", email="saas@admin.com", password="password123"
        )
        self.client.force_authenticate(user=self.saas_admin)
        self.url = "/api/core/tenants/"

    @patch("core.views.provision_tenant_db")
    @patch("core.views.create_tenant_admin")
    def test_create_tenant_success(self, mock_create_admin, mock_provision):
        """Test tenant creation with mocked DB provisioning"""
        data = {
            "name": "Test School",
            "subdomain": "testschool1",
            "admin_email": "admin@testschool1.com",
            "admin_first_name": "Admin",
            "admin_last_name": "User",
            "password": "AdminPassword123!",
        }
        response = self.client.post(self.url, data)

        if response.status_code != 201:
            print(f"Response: {response.data}")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify Tenant Created in DB
        tenant = Tenant.objects.get(subdomain="testschool1")
        self.assertEqual(tenant.name, "Test School")
        self.assertEqual(tenant.db_name, "school_testschool1.sqlite3")

        # Verify Provisioning was triggered
        mock_provision.assert_called_once()

        # Verify Admin Creation was triggered
        mock_create_admin.assert_called_once()
        args, _ = mock_create_admin.call_args
        self.assertEqual(args[0], tenant)
        self.assertEqual(args[1], "admin@testschool1.com")

    @patch("core.views.provision_tenant_db")
    def test_create_tenant_duplicate_subdomain(self, mock_provision):
        """Test duplicate subdomain rejected"""
        Tenant.objects.create(name="Old", subdomain="duplicate")

        data = {
            "name": "New School",
            "subdomain": "duplicate",  # Duplicate
            "admin_email": "new@school.com",
            "password": "pass",
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("subdomain", response.data)

        mock_provision.assert_not_called()
