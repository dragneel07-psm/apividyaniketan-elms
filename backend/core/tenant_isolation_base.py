# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Reusable two-tenant test harness for cross-tenant isolation suites.

The original isolation tests in ``core/tests_tenant_isolation.py`` proved the
token/tenant binding and read-scoping contract inline. This module extracts
that setup so every app can assert its own endpoints are schema-scoped without
re-deriving the (fiddly) django-tenants + DEBUG=False + hostname-routing setup.

Subclass ``TwoTenantAPITestCase`` and use:
    self.tenant / self.tenant_b / self.tenant_public   # schemas
    self.client_a / self.client_b                       # APIClients bound by host
    self.user_a / self.user_b                           # admin user per tenant
    self.authed(self.client_a, role="student")          # ad-hoc user + auth
    self.create_in(tenant, Model, **fields)             # create row in a schema

Why hostname routing (not the x-tenant-id header): tests run with DEBUG=False,
where the header fallback is disabled — identical to production. Tenants resolve
only via Domain rows, so each client carries the right HTTP_HOST.
"""

from __future__ import annotations

from typing import Any

from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import (
    get_tenant_domain_model,
    schema_context,
    tenant_context,
)
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

PASSWORD = "IsolationPass123!"


class TwoTenantAPITestCase(FastTenantTestCase):
    """Spins up two real tenant schemas (A + B) plus the public schema.

    Tenant A is provided by FastTenantTestCase; B and public are created here.
    """

    DOMAIN_B = "iso-base-school-b.test.com"
    DOMAIN_PUBLIC = "iso-base-public.test.com"
    SCHEMA_B = "iso_base_school_b"

    # ── tenant / domain bring-up ─────────────────────────────────────────

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Isolation School A"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # django-tenants only whitelists its own test domain; ours must be
        # allowed too or requests die as DisallowedHost before middleware.
        for domain in (cls.DOMAIN_B, cls.DOMAIN_PUBLIC):
            if domain not in django_settings.ALLOWED_HOSTS:
                django_settings.ALLOWED_HOSTS.append(domain)

        tenant_model = type(cls.tenant)
        # FastTenantTestCase leaves the connection on tenant A's schema;
        # tenants can only be created from the public schema.
        with schema_context("public"):
            domain_model = get_tenant_domain_model()

            cls.tenant_b = tenant_model.objects.filter(
                schema_name=cls.SCHEMA_B
            ).first()
            if cls.tenant_b is None:
                cls.tenant_b = tenant_model(
                    schema_name=cls.SCHEMA_B, name="Isolation School B"
                )
                cls.tenant_b.save()  # creates schema + runs tenant migrations
            domain_model.objects.get_or_create(
                domain=cls.DOMAIN_B,
                tenant=cls.tenant_b,
                defaults={"is_primary": True},
            )

            cls.tenant_public = tenant_model.objects.filter(
                schema_name="public"
            ).first()
            if cls.tenant_public is None:
                cls.tenant_public = tenant_model(
                    schema_name="public", name="Platform Public"
                )
                cls.tenant_public.save()
            domain_model.objects.get_or_create(
                domain=cls.DOMAIN_PUBLIC,
                tenant=cls.tenant_public,
                defaults={"is_primary": True},
            )

    @classmethod
    def tearDownClass(cls):
        for domain in (cls.DOMAIN_B, cls.DOMAIN_PUBLIC):
            if domain in django_settings.ALLOWED_HOSTS:
                django_settings.ALLOWED_HOSTS.remove(domain)
        super().tearDownClass()

    # ── per-test fixtures ────────────────────────────────────────────────

    def setUp(self):
        super().setUp()
        self.client_a = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        self.client_b = APIClient(HTTP_HOST=self.DOMAIN_B)

        self.user_a = self.create_user_in(self.tenant, "admin", "admin_a")
        self.user_b = self.create_user_in(self.tenant_b, "admin", "admin_b")

    # ── helpers ──────────────────────────────────────────────────────────

    def create_user_in(self, tenant, role: str, username: str) -> Any:
        """Create a user inside ``tenant``'s schema with the given role."""
        with tenant_context(tenant):
            kwargs = dict(
                username=username,
                email=f"{username}@{tenant.schema_name}.test",
                password=PASSWORD,
                role=role,
            )
            # saas_admin lives in the public schema and has no tenant FK.
            if role != "saas_admin":
                kwargs["tenant"] = tenant
            return User.objects.create_user(**kwargs)

    def create_in(self, tenant, model, **fields):
        """Create a model row inside ``tenant``'s schema (sets tenant FK)."""
        fields.setdefault("tenant", tenant)
        with tenant_context(tenant):
            return model.objects.create(**fields)

    def login(self, client, email: str) -> str:
        response = client.post(
            "/api/users/login/", {"email": email, "password": PASSWORD}
        )
        self.assertEqual(
            response.status_code, status.HTTP_200_OK, getattr(response, "data", None)
        )
        return response.data["access"]

    def auth(self, client, token: str):
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return client

    def authed(self, client, user):
        """Log ``user`` in on ``client`` and return the authenticated client."""
        return self.auth(client, self.login(client, user.email))
