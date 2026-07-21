# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Tests for per-tenant feature_overrides — the writable surface that lets
SaaS admins flip a feature on/off for one school without changing its
plan.

Run with: python manage.py test core.tests_feature_overrides
"""

from unittest.mock import MagicMock

from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from core.models import Tenant
from core.utils.plan_enforcement import (
    build_plan_entitled_features,
    compute_effective_features,
    sync_tenant_with_plan,
)
from users.models import UserAccount


class ComputeEffectiveFeaturesTests(TestCase):
    """Pure function — overrides win on a per-key basis."""

    def test_no_overrides_returns_plan_baseline(self):
        plan = MagicMock(
            has_ai_tutor=False,
            has_ai_eval=False,
            has_parent_portal=False,
            has_analytics=False,
            has_career_guidance=False,
        )
        baseline = build_plan_entitled_features(plan)
        self.assertEqual(compute_effective_features(plan, None), baseline)
        self.assertEqual(compute_effective_features(plan, {}), baseline)

    def test_override_can_disable_a_default_on_feature(self):
        plan = MagicMock(
            has_ai_tutor=False,
            has_ai_eval=False,
            has_parent_portal=False,
            has_analytics=False,
            has_career_guidance=False,
        )
        baseline = build_plan_entitled_features(plan)
        self.assertTrue(baseline["projects"])  # baseline-on
        effective = compute_effective_features(plan, {"projects": False})
        self.assertFalse(effective["projects"])

    def test_override_can_enable_a_plan_off_feature(self):
        plan = MagicMock(
            has_ai_tutor=False,
            has_ai_eval=False,
            has_parent_portal=False,
            has_analytics=False,
            has_career_guidance=False,
        )
        baseline = build_plan_entitled_features(plan)
        self.assertFalse(baseline["student_ai_chatbot"])
        effective = compute_effective_features(plan, {"student_ai_chatbot": True})
        self.assertTrue(effective["student_ai_chatbot"])

    def test_override_truthy_coerced_to_bool(self):
        plan = MagicMock(
            has_ai_tutor=False,
            has_ai_eval=False,
            has_parent_portal=False,
            has_analytics=False,
            has_career_guidance=False,
        )
        effective = compute_effective_features(
            plan, {"projects": 0, "student_ai_chatbot": 1}
        )
        self.assertFalse(effective["projects"])
        self.assertTrue(effective["student_ai_chatbot"])

    def test_other_keys_untouched_by_override(self):
        plan = MagicMock(
            has_ai_tutor=False,
            has_ai_eval=False,
            has_parent_portal=False,
            has_analytics=False,
            has_career_guidance=False,
        )
        baseline = build_plan_entitled_features(plan)
        effective = compute_effective_features(plan, {"projects": False})
        for key in baseline:
            if key == "projects":
                continue
            self.assertEqual(
                effective[key], baseline[key], f"key {key} should be untouched"
            )


class SyncWithOverridesTests(TestCase):
    """sync_tenant_with_plan honors stored feature_overrides."""

    def test_sync_applies_override(self):
        tenant = Tenant(
            schema_name="ovr1",
            name="Override 1",
            feature_overrides={"projects": False},
        )
        tenant.auto_create_schema = False
        tenant.save()
        sync_tenant_with_plan(tenant, plan=None, save=False)
        self.assertFalse(tenant.features.get("projects"))

    def test_sync_with_no_overrides_uses_plan_baseline(self):
        tenant = Tenant(
            schema_name="ovr2",
            name="Override 2",
            feature_overrides={},
        )
        tenant.auto_create_schema = False
        tenant.save()
        sync_tenant_with_plan(tenant, plan=None, save=False)
        self.assertTrue(tenant.features.get("projects"))

    def test_removing_override_returns_to_plan_default(self):
        tenant = Tenant(
            schema_name="ovr3",
            name="Override 3",
            feature_overrides={"projects": False},
        )
        tenant.auto_create_schema = False
        tenant.save()
        sync_tenant_with_plan(tenant, plan=None, save=False)
        self.assertFalse(tenant.features.get("projects"))

        # Remove the override.
        tenant.feature_overrides = {}
        sync_tenant_with_plan(tenant, plan=None, save=False)
        self.assertTrue(tenant.features.get("projects"))


class TenantSerializerTests(TestCase):
    """Serializer-level test of the override merge + read-only `features` rule.

    Avoids the django-tenants HTTP middleware which makes plain TestCase
    requests against the public viewset infeasible without elaborate domain
    setup. The HTTP-level RBAC is already covered by the IsSaaSAdmin
    permission class on TenantViewSet.
    """

    def _make_tenant(self, **kwargs):
        defaults = dict(
            schema_name="ser1", name="Serializer Tenant", feature_overrides={}
        )
        defaults.update(kwargs)
        tenant = Tenant(**defaults)
        tenant.auto_create_schema = False
        tenant.save()
        return tenant

    def test_validate_merges_overrides_into_features(self):
        from core.serializers import TenantSerializer

        tenant = self._make_tenant(feature_overrides={"projects": False})
        serializer = TenantSerializer(
            instance=tenant,
            data={"feature_overrides": {"projects": False}},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertFalse(serializer.validated_data["features"]["projects"])

    def test_validate_with_no_override_keeps_plan_baseline(self):
        from core.serializers import TenantSerializer

        tenant = self._make_tenant(feature_overrides={})
        serializer = TenantSerializer(
            instance=tenant,
            data={"name": "Renamed"},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        # No override → effective `projects` stays at the plan baseline (True).
        self.assertTrue(serializer.validated_data["features"]["projects"])

    def test_to_representation_reflects_overrides(self):
        from core.serializers import TenantSerializer

        tenant = self._make_tenant(feature_overrides={"projects": False})
        data = TenantSerializer(instance=tenant).data
        self.assertFalse(data["features"]["projects"])
        # The override surface itself is exposed.
        self.assertEqual(data["feature_overrides"], {"projects": False})

    def test_features_field_is_read_only_via_serializer(self):
        from core.serializers import TenantSerializer

        tenant = self._make_tenant(feature_overrides={})
        # Hand-crafted attempt to write to `features` directly.
        serializer = TenantSerializer(
            instance=tenant,
            data={"features": {"projects": False}},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        # The Meta.read_only_fields = ['features'] kicks the value out;
        # the validate() override then recomputes it from plan + overrides.
        self.assertTrue(serializer.validated_data["features"]["projects"])

    def test_plan_features_exposed_separately_from_effective(self):
        """SaaS UI needs the plan baseline to detect override divergence."""
        from core.serializers import TenantSerializer
        from core.utils.plan_enforcement import (
            build_plan_entitled_features,
            get_tenant_plan,
        )

        tenant = self._make_tenant(feature_overrides={"projects": False})
        data = TenantSerializer(instance=tenant).data
        # `plan_features` reflects the plan with no overrides.
        expected_baseline = build_plan_entitled_features(get_tenant_plan(tenant))
        self.assertEqual(data["plan_features"], expected_baseline)
        # `features` reflects the merged effective dict — projects=False here.
        self.assertFalse(data["features"]["projects"])
        # And plan_features still says projects=True (baseline) for divergence detection.
        self.assertTrue(data["plan_features"]["projects"])
