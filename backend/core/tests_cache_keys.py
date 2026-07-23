# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.test import SimpleTestCase

from core.utils.cache_keys import tenant_cache_key


class TenantCacheKeyTests(SimpleTestCase):
    def test_builds_namespaced_key_from_parts(self):
        key = tenant_cache_key("academic_stats", "default", "2026-01-01")
        self.assertEqual(key, "academic_stats:default:2026-01-01")

    def test_namespace_only_when_no_parts(self):
        key = tenant_cache_key("academic_stats")
        self.assertEqual(key, "academic_stats")

    def test_request_and_tenant_kwargs_are_ignored(self):
        key = tenant_cache_key("academic_stats", "1", request=object(), tenant=object())
        self.assertEqual(key, "academic_stats:1")
