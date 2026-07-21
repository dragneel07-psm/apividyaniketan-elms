# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from types import SimpleNamespace

from django.test import SimpleTestCase

from core.utils.cache_keys import tenant_cache_key


class TenantCacheKeyTests(SimpleTestCase):
    def test_uses_request_tenant_schema_and_not_spoofable_header(self):
        request = SimpleNamespace(
            tenant=SimpleNamespace(schema_name="demo_school"),
            user=SimpleNamespace(tenant=None),
            headers={"x-tenant-id": "spoofed-school"},
        )

        key = tenant_cache_key("academic_stats", "default", request=request)

        self.assertTrue(key.startswith("tenant:demo_school:academic_stats:"))
        self.assertNotIn("spoofed-school", key)

    def test_falls_back_to_authenticated_user_tenant(self):
        request = SimpleNamespace(
            tenant=None,
            user=SimpleNamespace(tenant=SimpleNamespace(schema_name="beta_school")),
            headers={},
        )

        key = tenant_cache_key(
            "attendance_summary_data", "1", "2026-01-01", request=request
        )

        self.assertTrue(key.startswith("tenant:beta_school:attendance_summary_data:"))

    def test_explicit_tenant_takes_precedence(self):
        request = SimpleNamespace(
            tenant=SimpleNamespace(schema_name="request_school"),
            user=SimpleNamespace(tenant=SimpleNamespace(schema_name="user_school")),
            headers={},
        )
        explicit_tenant = SimpleNamespace(schema_name="explicit_school")

        key = tenant_cache_key(
            "attendance_summary_data", "1", request=request, tenant=explicit_tenant
        )

        self.assertTrue(
            key.startswith("tenant:explicit_school:attendance_summary_data:")
        )

    def test_falls_back_to_public_schema_when_no_tenant_context(self):
        request = SimpleNamespace(
            tenant=None, user=SimpleNamespace(tenant=None), headers={}
        )

        key = tenant_cache_key("academic_stats", request=request)

        self.assertEqual(key, "tenant:public:academic_stats")
