# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
RBAC + visibility tests for the RubricTemplate API.

Run with: python manage.py test projects.tests_rubric_templates
"""

from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from projects.models import RubricTemplate
from users.models import UserAccount


def _enable_projects(tenant):
    tenant.features = {**(tenant.features or {}), "projects": True}
    tenant.save(update_fields=["features"])


class RubricTemplateApiTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Rubric Template School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        _enable_projects(self.tenant)
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.teacher_a = UserAccount.objects.create_user(
            username="rt_teacher_a",
            email="rt_teacher_a@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.teacher_b = UserAccount.objects.create_user(
            username="rt_teacher_b",
            email="rt_teacher_b@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.admin = UserAccount.objects.create_user(
            username="rt_admin",
            email="rt_admin@example.com",
            password="Pass@1234",
            role="admin",
            tenant=self.tenant,
        )
        self.student = UserAccount.objects.create_user(
            username="rt_student",
            email="rt_student@example.com",
            password="Pass@1234",
            role="student",
            tenant=self.tenant,
        )

    def _login(self, user):
        self.client.force_authenticate(user=user)

    def _make_template(self, *, owner, name="T", criteria=None) -> RubricTemplate:
        return RubricTemplate.objects.create(
            tenant=self.tenant,
            owner=owner,
            name=name,
            criteria_json=criteria or [{"criterion": "Test", "max": 10}],
        )

    # --- Create ---

    def test_teacher_can_create_template(self):
        self._login(self.teacher_a)
        resp = self.client.post(
            "/api/projects/rubric-templates/",
            {
                "name": "Standard 10pt",
                "description": "",
                "criteria_json": [
                    {"criterion": "Research", "max": 10},
                    {"criterion": "Presentation", "max": 10},
                ],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(str(resp.data["owner"]), str(self.teacher_a.pk))
        self.assertFalse(resp.data["is_shared"])

    def test_create_rejects_invalid_criteria(self):
        self._login(self.teacher_a)
        resp = self.client.post(
            "/api/projects/rubric-templates/",
            {"name": "Bad", "criteria_json": [{"max": 10}]},  # missing criterion
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_cannot_use_endpoint(self):
        self._login(self.student)
        resp = self.client.get("/api/projects/rubric-templates/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # --- Visibility ---

    def test_teacher_sees_own_and_shared_only(self):
        own = self._make_template(owner=self.teacher_a, name="Own")
        shared = self._make_template(owner=None, name="Shared")
        other = self._make_template(owner=self.teacher_b, name="Other")

        self._login(self.teacher_a)
        resp = self.client.get("/api/projects/rubric-templates/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {t["template_id"] for t in (resp.data.get("results") or resp.data)}
        self.assertIn(str(own.template_id), ids)
        self.assertIn(str(shared.template_id), ids)
        self.assertNotIn(str(other.template_id), ids)

    def test_admin_sees_all_templates(self):
        own = self._make_template(owner=self.teacher_a, name="A")
        other = self._make_template(owner=self.teacher_b, name="B")

        self._login(self.admin)
        resp = self.client.get("/api/projects/rubric-templates/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {t["template_id"] for t in (resp.data.get("results") or resp.data)}
        self.assertIn(str(own.template_id), ids)
        self.assertIn(str(other.template_id), ids)

    # --- Mutation gating ---

    def test_teacher_cannot_edit_other_teachers_template(self):
        other = self._make_template(owner=self.teacher_b, name="B")
        self._login(self.teacher_a)
        resp = self.client.patch(
            f"/api/projects/rubric-templates/{other.template_id}/",
            {"name": "Hijacked"},
            format="json",
        )
        # Either 403 (object permission) or 404 (filtered out of queryset).
        self.assertIn(
            resp.status_code, {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND}
        )

    def test_admin_can_edit_any_template(self):
        target = self._make_template(owner=self.teacher_b, name="Renamable")
        self._login(self.admin)
        resp = self.client.patch(
            f"/api/projects/rubric-templates/{target.template_id}/",
            {"name": "Renamed by admin"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data["name"], "Renamed by admin")

    def test_teacher_can_delete_own_template(self):
        own = self._make_template(owner=self.teacher_a, name="Deletable")
        self._login(self.teacher_a)
        resp = self.client.delete(f"/api/projects/rubric-templates/{own.template_id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
