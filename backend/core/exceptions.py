# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def _stringify_message(data: Any) -> str:
    if isinstance(data, dict):
        detail = data.get("detail")
        if detail is not None:
            return str(detail)
        first_value = next(iter(data.values()), None)
        if first_value is None:
            return "Request failed."
        if isinstance(first_value, list) and first_value:
            return str(first_value[0])
        return str(first_value)
    if isinstance(data, list):
        return str(data[0]) if data else "Request failed."
    return str(data or "Request failed.")


def _field_errors(data: Any) -> dict:
    if isinstance(data, dict):
        if "detail" in data and len(data) == 1:
            return {}
        return data
    if isinstance(data, list):
        return {"non_field_errors": data}
    return {}


def _error_code(exc: Exception, response_status: int, data: Any) -> str:
    if hasattr(exc, "get_codes"):
        try:
            codes = exc.get_codes()
            if isinstance(codes, str) and codes:
                return codes
            if isinstance(codes, list) and codes:
                first_code = codes[0]
                if isinstance(first_code, str) and first_code:
                    return first_code
            if isinstance(codes, dict):
                return "validation_error"
        except Exception:
            pass

    default_code = getattr(exc, "default_code", None)
    if isinstance(default_code, str) and default_code:
        return default_code
    if response_status == status.HTTP_429_TOO_MANY_REQUESTS:
        return "rate_limited"
    if response_status == status.HTTP_401_UNAUTHORIZED:
        return "authentication_failed"
    if response_status == status.HTTP_403_FORBIDDEN:
        return "permission_denied"
    if response_status == status.HTTP_404_NOT_FOUND:
        return "not_found"
    if response_status == status.HTTP_400_BAD_REQUEST:
        return "validation_error"
    if response_status >= 500:
        return "internal_error"
    if isinstance(data, dict) and isinstance(data.get("code"), str):
        return data["code"]
    return "request_error"


def api_exception_handler(exc: Exception, context: dict) -> Response:
    response = exception_handler(exc, context)
    request = context.get("request")
    trace_id = getattr(request, "request_id", None)

    if response is None:
        return Response(
            {
                "code": "internal_error",
                "message": "An unexpected error occurred.",
                "field_errors": {},
                "trace_id": trace_id,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    data = response.data
    formatted = {
        "code": _error_code(exc, response.status_code, data),
        "message": _stringify_message(data),
        "field_errors": _field_errors(data),
        "trace_id": trace_id,
    }
    response.data = formatted
    return response
