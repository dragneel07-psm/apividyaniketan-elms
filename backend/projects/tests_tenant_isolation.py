# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Cross-tenant isolation for projects (feature-gated module).

Projects carry a tenant FK and the module is gated by
tenant.features['projects'] (IsProjectsEnabled). This suite proves two things:
  - when enabled for both schools, a school-A user cannot see school-B's
    projects (isolation holds independent of the gate);
  - the gate itself blocks access when the feature is off for the tenant.
"""

from __future__ import annotations

from django_tenants.utils import schema_context, tenant_context

from core.tenant_isolation_base import TwoTenantAPITestCase


def _set_projects_feature(tenant, enabled):
    # Tenant rows live in the public schema; django-tenants forbids updating a
    # tenant from inside another tenant's schema (the test connection sits on
    # tenant A). Persist the feature flag from public.
    tenant.features = {**(tenant.features or {}), "projects": enabled}
    with schema_context("public"):
        tenant.save(update_fields=["features"])


def _enable_projects(tenant):
    _set_projects_feature(tenant, True)


def _disable_projects(tenant):
    _set_projects_feature(tenant, False)


class ProjectsTenantIsolationTests(TwoTenantAPITestCase):
    PROJECTS_URL = "/api/projects/projects/"

    def _make_project(self, tenant, title):
        from projects.models import Project

        mentor = self.create_user_in(tenant, "teacher", f"mentor_{tenant.schema_name}")
        with tenant_context(tenant):
            return Project.objects.create(tenant=tenant, title=title, mentor=mentor)

    def test_projects_list_scoped_when_enabled(self):
        _enable_projects(self.tenant)
        _enable_projects(self.tenant_b)
        project_b = self._make_project(self.tenant_b, "B Science Fair")

        client_a = self.authed(self.client_a, self.user_a)
        resp = client_a.get(self.PROJECTS_URL)
        self.assertEqual(resp.status_code, 200, getattr(resp, "data", None))
        ids = [
            str(item.get("project_id") or item.get("id"))
            for item in resp.data.get("results", resp.data)
        ]
        self.assertNotIn(str(project_b.pk), ids)

        client_b = self.authed(self.client_b, self.user_b)
        resp_b = client_b.get(self.PROJECTS_URL)
        ids_b = [
            str(item.get("project_id") or item.get("id"))
            for item in resp_b.data.get("results", resp_b.data)
        ]
        self.assertIn(str(project_b.pk), ids_b)

    def test_list_blocked_when_feature_disabled(self):
        _disable_projects(self.tenant)
        client_a = self.authed(self.client_a, self.user_a)
        resp = client_a.get(self.PROJECTS_URL)
        self.assertEqual(resp.status_code, 403, getattr(resp, "data", None))
