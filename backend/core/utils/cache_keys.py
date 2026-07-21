# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations


def _safe_part(value) -> str:
    text = str(value or "").strip()
    return text if text else "-"


def _tenant_schema(*, request=None, tenant=None) -> str:
    if tenant is not None:
        schema = getattr(tenant, "schema_name", None)
        if schema:
            return str(schema).strip().lower()

    if request is not None:
        request_tenant = getattr(request, "tenant", None)
        schema = getattr(request_tenant, "schema_name", None)
        if schema:
            return str(schema).strip().lower()

        user = getattr(request, "user", None)
        user_tenant = getattr(user, "tenant", None)
        schema = getattr(user_tenant, "schema_name", None)
        if schema:
            return str(schema).strip().lower()

    return "public"


def tenant_cache_key(namespace: str, *parts, request=None, tenant=None) -> str:
    """
    Build a tenant-safe cache key:
      tenant:<schema>:<namespace>:<part1>:<part2>...
    """
    schema = _tenant_schema(request=request, tenant=tenant)
    suffix = ":".join(_safe_part(part) for part in parts if part is not None)
    prefix = f"tenant:{schema}:{_safe_part(namespace)}"
    return f"{prefix}:{suffix}" if suffix else prefix
