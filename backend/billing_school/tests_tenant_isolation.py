# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Cross-tenant isolation for school finance records.

School-billing models (FeeStructure, FeeHead, StudentFee, Payment…) are
schema-scoped (SchemaScopedBillingModel, SCHEMA_SCOPE="tenant") and served
under /api/billing/school/. A school-A finance user must never list or fetch
school-B's financial records — a leak here exposes another school's fees and
payments (S1). FeeStructure is used as the representative resource; the same
matrix should extend to StudentFee and Payment.

Finance endpoints require IsSchoolFinanceManager (role admin/staff) and a
tenant schema (BillingSchemaGuardMixin.require_tenant_schema). The base
harness' admin users satisfy both.
"""

from __future__ import annotations

from decimal import Decimal

from django_tenants.utils import tenant_context

from core.tenant_isolation_base import TwoTenantAPITestCase


class BillingTenantIsolationTests(TwoTenantAPITestCase):
    FEE_STRUCTURES_URL = "/api/billing/school/fee-structures/"

    def _make_fee_structure(self, tenant, name):
        from billing.models_school import FeeStructure

        with tenant_context(tenant):
            return FeeStructure.objects.create(
                tenant=tenant, name=name, amount=Decimal("1000.00")
            )

    # ── list scoping ─────────────────────────────────────────────────────

    def test_fee_structures_list_scoped(self):
        fee_b = self._make_fee_structure(self.tenant_b, "B Tuition Q1")

        client_a = self.authed(self.client_a, self.user_a)
        resp = client_a.get(self.FEE_STRUCTURES_URL)
        self.assertEqual(resp.status_code, 200, getattr(resp, "data", None))
        names = [item.get("name") for item in resp.data.get("results", resp.data)]
        self.assertNotIn("B Tuition Q1", names)

        client_b = self.authed(self.client_b, self.user_b)
        resp_b = client_b.get(self.FEE_STRUCTURES_URL)
        self.assertEqual(resp_b.status_code, 200)
        names_b = [item.get("name") for item in resp_b.data.get("results", resp_b.data)]
        self.assertIn("B Tuition Q1", names_b)
        # Cross-check the foreign pk is in B's listing but not reachable from A.
        self.assertTrue(
            any(
                str(item.get("fee_id") or item.get("id")) == str(fee_b.pk)
                for item in resp_b.data.get("results", resp_b.data)
            )
        )

    # ── detail / object fetch ────────────────────────────────────────────

    def test_cross_tenant_fee_structure_detail_404(self):
        fee_b = self._make_fee_structure(self.tenant_b, "B Lab Fee")

        client_a = self.authed(self.client_a, self.user_a)
        resp = client_a.get(f"{self.FEE_STRUCTURES_URL}{fee_b.pk}/")
        self.assertEqual(resp.status_code, 404)

        # The record still exists in B's schema (A's miss is isolation, not loss).
        from billing.models_school import FeeStructure

        with tenant_context(self.tenant_b):
            self.assertTrue(FeeStructure.objects.filter(pk=fee_b.pk).exists())
