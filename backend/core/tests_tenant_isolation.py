# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Cross-tenant isolation tests — the core security contract of the platform.

A credential issued for school A must never read or write school B's data,
no matter which tenant header the client sends. These tests exercise the
full stack: TenantFromHeaderMiddleware (schema routing),
TenantAwareJWTAuthentication (token/tenant binding), and
TenantScopedQuerysetMixin (row-level scoping).
"""

from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import get_tenant_domain_model, schema_context, tenant_context
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()

PASSWORD = "IsolationPass123!"


class TenantIsolationTests(FastTenantTestCase):
    """Two real tenant schemas (A from FastTenantTestCase, B created here)."""

    DOMAIN_B = "iso-school-b.test.com"
    DOMAIN_PUBLIC = "iso-public.test.com"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Isolation School A"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # django-tenants whitelists only its own test domain; ours must be
        # allowed too or requests die as DisallowedHost before middleware.
        from django.conf import settings as django_settings

        for domain in (cls.DOMAIN_B, cls.DOMAIN_PUBLIC):
            if domain not in django_settings.ALLOWED_HOSTS:
                django_settings.ALLOWED_HOSTS.append(domain)

        tenant_model = type(cls.tenant)
        # FastTenantTestCase leaves the connection on tenant A's schema;
        # tenants can only be created from the public schema.
        with schema_context("public"):
            domain_model = get_tenant_domain_model()

            cls.tenant_b = tenant_model.objects.filter(
                schema_name="iso_school_b"
            ).first()
            if cls.tenant_b is None:
                cls.tenant_b = tenant_model(
                    schema_name="iso_school_b", name="Isolation School B"
                )
                cls.tenant_b.save()  # creates the schema and runs tenant migrations
            domain_model.objects.get_or_create(
                domain=cls.DOMAIN_B,
                tenant=cls.tenant_b,
                defaults={"is_primary": True},
            )

            # Tests run with DEBUG=False, where tenants resolve by hostname
            # only — register a public-tenant domain for SaaS-scope tests.
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
        from django.conf import settings as django_settings

        for domain in (cls.DOMAIN_B, cls.DOMAIN_PUBLIC):
            if domain in django_settings.ALLOWED_HOSTS:
                django_settings.ALLOWED_HOSTS.remove(domain)
        super().tearDownClass()

    def setUp(self):
        # Tenants resolve by hostname (Domain rows) — DEBUG=False in tests
        # disables the x-tenant-id header fallback, same as production.
        self.client_a = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        self.client_b = APIClient(HTTP_HOST=self.DOMAIN_B)

        with tenant_context(self.tenant):
            self.user_a = User.objects.create_user(
                username="admin_a",
                email="admin_a@school-a.test",
                password=PASSWORD,
                role="admin",
                tenant=self.tenant,
            )
        with tenant_context(self.tenant_b):
            self.user_b = User.objects.create_user(
                username="admin_b",
                email="admin_b@school-b.test",
                password=PASSWORD,
                role="admin",
                tenant=self.tenant_b,
            )

    def _login(self, client, email) -> str:
        response = client.post(
            "/api/users/login/", {"email": email, "password": PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data["access"]

    def _auth(self, client, token):
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return client

    # ── Token / tenant binding ───────────────────────────────────────────

    def test_token_works_in_its_own_tenant(self):
        token = self._login(self.client_a, self.user_a.email)
        response = self._auth(self.client_a, token).get("/api/users/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user_a.email)

    def test_token_from_tenant_a_rejected_in_tenant_b(self):
        token = self._login(self.client_a, self.user_a.email)
        response = self._auth(self.client_b, token).get("/api/users/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_from_tenant_a_rejected_against_public_schema(self):
        token = self._login(self.client_a, self.user_a.email)
        public_client = APIClient(HTTP_HOST=self.DOMAIN_PUBLIC)
        response = self._auth(public_client, token).get("/api/users/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_request_rejected(self):
        response = self.client_a.get("/api/users/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_forged_tenant_claim_rejected(self):
        # Token minted for user A but claiming tenant B must fail the
        # user-tenant consistency check.
        forged = AccessToken.for_user(self.user_a)
        forged["tenant_schema"] = self.tenant_b.schema_name
        response = self._auth(self.client_b, str(forged)).get("/api/users/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_saas_admin_token_rejected_on_tenant_schema(self):
        with schema_context("public"):
            saas_admin = User.objects.create_user(
                username="saas_root",
                email="saas_root@platform.test",
                password=PASSWORD,
                role="saas_admin",
            )
        token = AccessToken.for_user(saas_admin)
        token["tenant_schema"] = "public"
        response = self._auth(self.client_a, str(token)).get("/api/users/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Row-level data isolation ─────────────────────────────────────────

    def _create_notice(self, tenant, title):
        from academic.models import Notice

        with tenant_context(tenant):
            return Notice.objects.create(title=title, content="…", tenant=tenant)

    def test_notice_listing_is_schema_scoped(self):
        self._create_notice(self.tenant, "Secret of School A")
        self._create_notice(self.tenant_b, "Secret of School B")

        token_a = self._login(self.client_a, self.user_a.email)
        response = self._auth(self.client_a, token_a).get("/api/academic/notices/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [item["title"] for item in response.data.get("results", response.data)]
        self.assertIn("Secret of School A", titles)
        self.assertNotIn("Secret of School B", titles)

        token_b = self._login(self.client_b, self.user_b.email)
        response = self._auth(self.client_b, token_b).get("/api/academic/notices/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [item["title"] for item in response.data.get("results", response.data)]
        self.assertIn("Secret of School B", titles)
        self.assertNotIn("Secret of School A", titles)

    def test_cross_tenant_object_fetch_is_not_found(self):
        notice_b = self._create_notice(self.tenant_b, "B-only document")
        token_a = self._login(self.client_a, self.user_a.email)
        response = self._auth(self.client_a, token_a).get(
            f"/api/academic/notices/{notice_b.pk}/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
