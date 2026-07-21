# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from django.conf import settings


@dataclass(frozen=True)
class TokenLifetimes:
    access: timedelta
    refresh: timedelta


def _as_timedelta(value: Any, fallback: timedelta) -> timedelta:
    if isinstance(value, timedelta):
        return value
    return fallback


def role_token_lifetimes(role: str | None) -> TokenLifetimes:
    jwt_settings = getattr(settings, "SIMPLE_JWT", {})
    default_access = _as_timedelta(
        jwt_settings.get("ACCESS_TOKEN_LIFETIME"),
        timedelta(minutes=60),
    )
    default_refresh = _as_timedelta(
        jwt_settings.get("REFRESH_TOKEN_LIFETIME"),
        timedelta(days=7),
    )

    role_name = str(role or "").strip().lower()
    role_map = getattr(settings, "JWT_ROLE_TOKEN_LIFETIMES", {})
    policy = role_map.get(role_name, {}) if isinstance(role_map, dict) else {}

    return TokenLifetimes(
        access=_as_timedelta(policy.get("access"), default_access),
        refresh=_as_timedelta(policy.get("refresh"), default_refresh),
    )
