# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django_tenants.test.cases import FastTenantTestCase
from rest_framework.test import APIClient


class PrometheusMetricsEndpointTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Metrics Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )

    def test_metrics_endpoint_exposes_prometheus_counters(self):
        # Generate a few requests first so counters are present.
        self.client.get("/healthz")
        self.client.get("/api/core/tenant-check/")

        response = self.client.get("/metrics")

        self.assertEqual(response.status_code, 200)
        payload = response.content.decode("utf-8")
        self.assertIn("http_requests_total", payload)
        self.assertIn("http_request_duration_seconds", payload)
        self.assertIn("http_requests_in_progress", payload)

    def test_core_metrics_endpoint_alias_exposes_prometheus_counters(self):
        self.client.get("/api/core/tenant-check/")
        response = self.client.get("/api/core/metrics/")
        self.assertEqual(response.status_code, 200)
        payload = response.content.decode("utf-8")
        self.assertIn("http_requests_total", payload)
