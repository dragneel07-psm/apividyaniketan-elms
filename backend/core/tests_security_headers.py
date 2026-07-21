# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.test import override_settings
from django_tenants.test.cases import FastTenantTestCase
from rest_framework.test import APIClient


class SecurityHeadersAndCorsTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Security Header School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.url = "/api/core/tenant-check/"

    @override_settings(
        CORS_ALLOW_ALL_ORIGINS=False,
        CORS_ALLOWED_ORIGINS=["https://school.example"],
        CORS_ALLOWED_ORIGIN_REGEXES=[],
    )
    def test_cors_allows_only_explicit_origin(self):
        allowed_response = self.client.get(
            self.url, HTTP_ORIGIN="https://school.example"
        )
        self.assertEqual(
            allowed_response.get("Access-Control-Allow-Origin"),
            "https://school.example",
        )

        blocked_response = self.client.get(self.url, HTTP_ORIGIN="https://evil.example")
        self.assertIsNone(blocked_response.get("Access-Control-Allow-Origin"))

    @override_settings(
        SECURITY_CSP_REPORT_ONLY=False,
        SECURITY_CSP_POLICY={
            "default-src": ("'self'",),
            "object-src": ("'none'",),
        },
    )
    def test_csp_header_is_set(self):
        response = self.client.get(self.url)
        csp_header = response.get("Content-Security-Policy")
        self.assertIsNotNone(csp_header)
        self.assertIn("default-src 'self'", csp_header)
        self.assertIn("object-src 'none'", csp_header)

    @override_settings(
        SECURITY_CSP_REPORT_ONLY=True,
        SECURITY_CSP_POLICY={
            "default-src": ("'self'",),
        },
    )
    def test_csp_report_only_mode(self):
        response = self.client.get(self.url)
        self.assertIsNotNone(response.get("Content-Security-Policy-Report-Only"))
        self.assertIsNone(response.get("Content-Security-Policy"))
