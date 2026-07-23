# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

_METRICS_TOKEN = "test-metrics-token"


@override_settings(METRICS_TOKEN=_METRICS_TOKEN)
class PrometheusMetricsEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_metrics_endpoint_exposes_prometheus_counters(self):
        # Generate a few requests first so counters are present.
        self.client.get("/healthz")

        response = self.client.get(
            "/metrics", HTTP_AUTHORIZATION=f"Bearer {_METRICS_TOKEN}"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.content.decode("utf-8")
        self.assertIn("http_requests_total", payload)
        self.assertIn("http_request_duration_seconds", payload)
        self.assertIn("http_requests_in_progress", payload)

    def test_core_metrics_endpoint_alias_exposes_prometheus_counters(self):
        response = self.client.get(
            "/api/core/metrics/", HTTP_AUTHORIZATION=f"Bearer {_METRICS_TOKEN}"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.content.decode("utf-8")
        self.assertIn("http_requests_total", payload)
