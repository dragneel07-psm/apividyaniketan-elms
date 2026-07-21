# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Cross-tenant WRITE isolation — mutations must not cross schema boundaries.

``core/tests_tenant_isolation.py`` proves reads are schema-scoped. This suite
proves the write side: a school-A credential cannot UPDATE, DELETE, or
mass-assign its way into school-B's rows. Write-side leaks are strictly worse
than read leaks, so each is treated as S1.

Uses academic.Notice as the representative tenant-scoped resource (simple,
already wired through the academic router). The same matrix should be repeated
for high-value resources per ``core/tests_tenant_isolation_matrix.py``.
"""

from __future__ import annotations

from django_tenants.utils import tenant_context
from rest_framework import status

from core.tenant_isolation_base import TwoTenantAPITestCase


class CrossTenantWriteIsolationTests(TwoTenantAPITestCase):
    NOTICES_URL = "/api/academic/notices/"

    def _make_notice(self, tenant, title):
        from academic.models import Notice

        return self.create_in(tenant, Notice, title=title, content="…")

    # ── UPDATE ───────────────────────────────────────────────────────────

    def test_cross_tenant_update_is_not_found(self):
        notice_b = self._make_notice(self.tenant_b, "B original")
        client = self.authed(self.client_a, self.user_a)

        response = client.patch(
            f"{self.NOTICES_URL}{notice_b.pk}/", {"title": "hijacked by A"}
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # The row in B's schema must be untouched.
        from academic.models import Notice

        with tenant_context(self.tenant_b):
            self.assertEqual(Notice.objects.get(pk=notice_b.pk).title, "B original")

    # ── DELETE ───────────────────────────────────────────────────────────

    def test_cross_tenant_delete_is_not_found(self):
        notice_b = self._make_notice(self.tenant_b, "B keep me")
        client = self.authed(self.client_a, self.user_a)

        response = client.delete(f"{self.NOTICES_URL}{notice_b.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        from academic.models import Notice

        with tenant_context(self.tenant_b):
            self.assertTrue(Notice.objects.filter(pk=notice_b.pk).exists())

    # ── CREATE / mass-assignment ─────────────────────────────────────────

    def test_create_ignores_client_supplied_tenant(self):
        # A malicious client posting tenant=B must not land the row in B.
        client = self.authed(self.client_a, self.user_a)
        response = client.post(
            self.NOTICES_URL,
            {
                "title": "A-created",
                "content": "body",
                "tenant": self.tenant_b.pk,  # attempted override
            },
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_201_CREATED, status.HTTP_200_OK),
            getattr(response, "data", None),
        )

        from academic.models import Notice

        # Must exist in A's schema…
        with tenant_context(self.tenant):
            self.assertTrue(Notice.objects.filter(title="A-created").exists())
        # …and NOT in B's schema.
        with tenant_context(self.tenant_b):
            self.assertFalse(Notice.objects.filter(title="A-created").exists())
