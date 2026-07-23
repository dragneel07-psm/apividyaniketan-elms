# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations


def _safe_part(value) -> str:
    text = str(value or "").strip()
    return text if text else "-"


def tenant_cache_key(namespace: str, *parts, request=None, tenant=None) -> str:
    """
    Build a cache key: <namespace>:<part1>:<part2>...

    Single-school app now — no tenant scoping is needed. `request`/`tenant`
    are accepted (and ignored) for backward compatibility with existing
    call sites.
    """
    suffix = ":".join(_safe_part(part) for part in parts if part is not None)
    prefix = _safe_part(namespace)
    return f"{prefix}:{suffix}" if suffix else prefix
