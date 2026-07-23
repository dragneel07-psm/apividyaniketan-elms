# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class OpenApiSchemaEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Under DEBUG=False (test/prod) the schema requires staff; tests
        # authenticate as one. In DEBUG it is AllowAny for local type-gen.
        self.staff_user = User.objects.create_user(
            username="schema_staff",
            email="schema_staff@test.com",
            password="StaffPass123!",
            role="admin",
            is_staff=True,
        )

    def test_schema_endpoint_returns_openapi_document(self):
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get("/api/schema/?format=openapi-json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("openapi", response.data)
        self.assertIn("info", response.data)

    def test_v1_schema_endpoint_alias_returns_openapi_document(self):
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get("/api/v1/schema/?format=openapi-json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("openapi", response.data)
        self.assertIn("info", response.data)

    def test_schema_endpoint_denied_to_anonymous(self):
        # The schema enumerates every endpoint; anonymous recon is blocked
        # when DEBUG=False (the case under test settings).
        response = self.client.get("/api/schema/?format=openapi-json")
        self.assertIn(response.status_code, (401, 403))
