# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Canonical error-response helpers.

`core.exceptions.api_exception_handler` already normalises every exception
raised out of a DRF view into the envelope

    {
        "code": "<snake_case_code>",
        "message": "<human-readable message>",
        "field_errors": {...},
        "trace_id": "<request id or None>",
    }

New view code that wants to return an explicit error *without raising* should
use :func:`error_response` so the wire format stays identical to the handler's
output. This avoids the historical drift between ``{"error": ...}``,
``{"detail": ...}`` and ``{"message": ...}`` shapes.
"""

from __future__ import annotations

from typing import Any, Mapping

from rest_framework import status as http_status
from rest_framework.response import Response


def error_response(
    message: str,
    *,
    code: str = "request_error",
    status: int = http_status.HTTP_400_BAD_REQUEST,
    field_errors: Mapping[str, Any] | None = None,
    trace_id: str | None = None,
) -> Response:
    """Return a DRF ``Response`` using the canonical error envelope."""
    return Response(
        {
            "code": code,
            "message": str(message or "Request failed."),
            "field_errors": dict(field_errors) if field_errors else {},
            "trace_id": trace_id,
        },
        status=status,
    )
