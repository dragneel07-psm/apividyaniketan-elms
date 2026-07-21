# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Cross-tenant isolation for the library catalog.

Library models are schema-scoped (Book has no tenant FK — isolation is the
database router's job per schema). A school-A user must never see school-B's
catalog.
"""

from __future__ import annotations

from django_tenants.utils import tenant_context

from core.tenant_isolation_base import TwoTenantAPITestCase


class LibraryTenantIsolationTests(TwoTenantAPITestCase):
    BOOKS_URL = "/api/library/books/"

    def _make_book(self, tenant, title):
        from library.models import Book

        with tenant_context(tenant):
            return Book.objects.create(
                title=title, author="Author X", category="science"
            )

    def test_book_catalog_scoped(self):
        book_b = self._make_book(self.tenant_b, "B-only Encyclopedia")

        client_a = self.authed(self.client_a, self.user_a)
        resp = client_a.get(self.BOOKS_URL)
        self.assertEqual(resp.status_code, 200, getattr(resp, "data", None))
        titles = [item.get("title") for item in resp.data.get("results", resp.data)]
        self.assertNotIn("B-only Encyclopedia", titles)

        client_b = self.authed(self.client_b, self.user_b)
        resp_b = client_b.get(self.BOOKS_URL)
        titles_b = [item.get("title") for item in resp_b.data.get("results", resp_b.data)]
        self.assertIn("B-only Encyclopedia", titles_b)

    def test_cross_tenant_book_detail_404(self):
        book_b = self._make_book(self.tenant_b, "B Reference")
        client_a = self.authed(self.client_a, self.user_a)
        resp = client_a.get(f"{self.BOOKS_URL}{book_b.pk}/")
        self.assertEqual(resp.status_code, 404)
