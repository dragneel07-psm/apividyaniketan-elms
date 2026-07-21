# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import time

from prometheus_client import Counter, Gauge, Histogram, generate_latest

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests processed by the API.",
    ["method", "route", "status_code"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds.",
    ["method", "route"],
)

HTTP_REQUESTS_IN_PROGRESS = Gauge(
    "http_requests_in_progress",
    "In-flight HTTP requests.",
    ["method", "route"],
)


def _normalized_route(request) -> str:
    resolver_match = getattr(request, "resolver_match", None)
    route = getattr(resolver_match, "route", None) if resolver_match else None
    if route:
        if not str(route).startswith("/"):
            return f"/{route}"
        return str(route)
    return str(getattr(request, "path_info", "/") or "/")


class PrometheusMetricsMiddleware:
    """
    Collects baseline request throughput and latency metrics.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.perf_counter()
        method = str(getattr(request, "method", "GET")).upper()
        route = _normalized_route(request)

        HTTP_REQUESTS_IN_PROGRESS.labels(method=method, route=route).inc()
        status_code = 500
        try:
            response = self.get_response(request)
            status_code = int(getattr(response, "status_code", 500))
            return response
        finally:
            duration = time.perf_counter() - start
            HTTP_REQUESTS_TOTAL.labels(
                method=method,
                route=route,
                status_code=str(status_code),
            ).inc()
            HTTP_REQUEST_DURATION_SECONDS.labels(method=method, route=route).observe(
                duration
            )
            HTTP_REQUESTS_IN_PROGRESS.labels(method=method, route=route).dec()


def prometheus_metrics_payload() -> bytes:
    return generate_latest()
