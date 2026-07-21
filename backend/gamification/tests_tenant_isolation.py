# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Cross-tenant isolation for gamification.

Gamification models carry a tenant FK and live in per-tenant schemas. A
school-A user must never see school-B's badges, points, or leaderboard.
Badge (available-badges) is the representative resource.
"""

from __future__ import annotations

from core.tenant_isolation_base import TwoTenantAPITestCase


class GamificationTenantIsolationTests(TwoTenantAPITestCase):
    BADGES_URL = "/api/gamification/available-badges/"

    def _make_badge(self, tenant, name):
        from gamification.models import Badge

        return self.create_in(
            tenant,
            Badge,
            name=name,
            description="Awarded for completing lessons.",
            criteria_type="lessons_completed",
        )

    def test_available_badges_scoped(self):
        self._make_badge(self.tenant_b, "B Star Reader")

        client_a = self.authed(self.client_a, self.user_a)
        resp = client_a.get(self.BADGES_URL)
        self.assertEqual(resp.status_code, 200, getattr(resp, "data", None))
        names = [item.get("name") for item in resp.data.get("results", resp.data)]
        self.assertNotIn("B Star Reader", names)

        client_b = self.authed(self.client_b, self.user_b)
        resp_b = client_b.get(self.BADGES_URL)
        names_b = [item.get("name") for item in resp_b.data.get("results", resp_b.data)]
        self.assertIn("B Star Reader", names_b)
