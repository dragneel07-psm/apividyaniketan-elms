# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
core/middleware/__init__.py
───────────────────────────
Custom middleware for request context and security headers.
"""

import re
import uuid

from django.conf import settings

from core.logging_context import reset_request_context, set_request_context

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9\-_.]{8,128}$")


class RequestContextMiddleware:
    """
    Adds a stable request_id to request/response for tracing.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming_id = (request.headers.get("X-Request-ID", "") or "").strip()
        request_id = (
            incoming_id if REQUEST_ID_PATTERN.match(incoming_id) else str(uuid.uuid4())
        )
        request.request_id = request_id
        set_request_context(request_id=request_id)
        try:
            response = self.get_response(request)
        finally:
            reset_request_context()
        response["X-Request-ID"] = request_id
        return response


def _build_csp_header(policy: dict) -> str:
    if not isinstance(policy, dict):
        return ""

    directives = []
    for directive, values in policy.items():
        if not directive:
            continue
        clean_directive = str(directive).strip().lower()
        if not clean_directive:
            continue

        if isinstance(values, str):
            clean_values = values.strip()
        else:
            clean_values = " ".join(
                str(item).strip() for item in (values or []) if str(item).strip()
            ).strip()

        if clean_values:
            directives.append(f"{clean_directive} {clean_values}")
        else:
            directives.append(clean_directive)
    return "; ".join(directives)


class SecurityHeadersMiddleware:
    """
    Applies a configurable CSP and permissions policy baseline.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        csp_header_value = _build_csp_header(
            getattr(settings, "SECURITY_CSP_POLICY", {})
        )
        if csp_header_value:
            csp_header_name = (
                "Content-Security-Policy-Report-Only"
                if bool(getattr(settings, "SECURITY_CSP_REPORT_ONLY", False))
                else "Content-Security-Policy"
            )
            if csp_header_name not in response:
                response[csp_header_name] = csp_header_value

        permissions_policy = str(
            getattr(settings, "SECURITY_PERMISSIONS_POLICY", "") or ""
        ).strip()
        if permissions_policy and "Permissions-Policy" not in response:
            response["Permissions-Policy"] = permissions_policy

        return response
