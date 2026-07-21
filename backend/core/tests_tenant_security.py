# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.test import override_settings
from django_tenants.test.cases import FastTenantTestCase
from rest_framework.test import APIClient


@override_settings(ALLOWED_HOSTS=["localhost", "127.0.0.1", ".localhost", ".local"])
class TenantResolutionSecurityTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Security School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient()
        self.tenant_check_url = "/api/core/tenant-check/"

    @override_settings(DEBUG=False, TENANT_HEADER_TRUST_MODE="dev_only")
    def test_header_tenant_resolution_is_disabled_in_production_mode(self):
        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST="localhost",
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json().get("code"), "tenant_domain_required")

    @override_settings(DEBUG=True, TENANT_HEADER_TRUST_MODE="dev_only")
    def test_header_tenant_resolution_is_enabled_in_debug_mode(self):
        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST="localhost",
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("exists"))
        self.assertEqual(response.data.get("schema_name"), self.tenant.schema_name)

    @override_settings(
        DEBUG=True,
        TENANT_HEADER_TRUST_MODE="dev_only",
        ALLOWED_HOSTS=["localhost", "127.0.0.1", ".local"],
    )
    def test_header_tenant_resolution_is_enabled_on_dot_local_hosts_in_debug(self):
        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST="school.local",
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("exists"))
        self.assertEqual(response.data.get("schema_name"), self.tenant.schema_name)

    @override_settings(DEBUG=True, TENANT_HEADER_TRUST_MODE="dev_only")
    def test_header_tenant_resolution_is_ignored_on_non_local_debug_hosts(self):
        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST="unknown.localhost",
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.assertEqual(response.status_code, 404)

    def test_suspended_tenant_is_blocked_by_status_gate(self):
        self.tenant.status = "suspended"
        self.tenant.save(update_fields=["status"])

        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json().get("code"), "tenant_inactive")

    @override_settings(DEBUG=False, TENANT_HEADER_TRUST_MODE="dev_only")
    def test_spoofed_tenant_header_is_ignored_in_production(self):
        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID="spoofed-school",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("exists"))
        self.assertEqual(response.data.get("schema_name"), self.tenant.schema_name)

    @override_settings(DEBUG=False, TENANT_HEADER_TRUST_MODE="dev_only")
    def test_healthz_probe_is_not_blocked_by_tenant_domain_guard(self):
        response = self.client.get(
            "/healthz",
            HTTP_HOST="healthcheck.railway.app",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("status"), "ok")

    @override_settings(
        DEBUG=False,
        TENANT_HEADER_TRUST_MODE="never",
        BASE_DOMAIN="manyaltech.com",
        ALLOWED_HOSTS=[
            "localhost",
            "127.0.0.1",
            ".localhost",
            ".local",
            "manyaltech.com",
            ".manyaltech.com",
        ],
    )
    def test_base_domain_subdomain_fallback_resolves_tenant_without_domain_row(self):
        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST=f"{self.tenant.schema_name}.manyaltech.com",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("exists"))
        self.assertEqual(response.data.get("schema_name"), self.tenant.schema_name)

    @override_settings(
        DEBUG=False,
        TENANT_HEADER_TRUST_MODE="never",
        BASE_DOMAIN="manyaltech.com",
        ALLOWED_HOSTS=[
            "localhost",
            "127.0.0.1",
            ".localhost",
            ".local",
            "manyaltech.com",
            ".manyaltech.com",
        ],
    )
    def test_base_domain_fallback_keeps_unknown_subdomain_blocked(self):
        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST="unknown-school.manyaltech.com",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json().get("code"), "tenant_domain_required")

    @override_settings(
        DEBUG=False,
        TENANT_HEADER_TRUST_MODE="never",
        BASE_DOMAIN="manyaltech.com",
        ALLOWED_HOSTS=[
            "localhost",
            "127.0.0.1",
            ".localhost",
            ".local",
            "manyaltech.com",
            ".manyaltech.com",
            ".railway.app",
        ],
    )
    def test_x_tenant_host_header_resolves_tenant(self):
        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST="backend.up.railway.app",
            HTTP_X_TENANT_HOST=f"{self.tenant.schema_name}.manyaltech.com",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("exists"))
        self.assertEqual(response.data.get("schema_name"), self.tenant.schema_name)
