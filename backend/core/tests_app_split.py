# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.conf import settings
from django.test import SimpleTestCase


class AppSplitSafetyTests(SimpleTestCase):
    def test_gamification_is_tenant_only(self):
        self.assertIn("gamification", settings.TENANT_APPS)
        self.assertNotIn("gamification", settings.SHARED_APPS)

    def test_only_allowed_hybrid_apps_overlap(self):
        overlaps = set(getattr(settings, "PROJECT_OVERLAPPING_APPS", set()))
        allowed = set(getattr(settings, "ALLOWED_HYBRID_APPS", set()))
        self.assertEqual(overlaps.difference(allowed), set())

    def test_billing_and_users_are_currently_the_only_hybrid_apps(self):
        overlaps = set(getattr(settings, "PROJECT_OVERLAPPING_APPS", set()))
        self.assertEqual(overlaps, {"users", "billing"})
