# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
from typing import Any, Dict, Tuple
from urllib.parse import urlparse, urlunparse

from core.models import GlobalSettings

DEFAULT_BASE_URL = "https://api.openai.com/v1"
DEFAULT_MODEL = "gpt-3.5-turbo"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_FALLBACK_MODEL = "openai/gpt-4o-mini"
OPENAI_FALLBACK_MODEL = "gpt-4o-mini"


def _infer_provider_name(base_url: str) -> str:
    lowered = (base_url or "").lower()
    if "openrouter.ai" in lowered:
        return "OpenRouter"
    if "openai.com" in lowered:
        return "OpenAI"
    return "Custom OpenAI-Compatible"


def _mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return f"{key[:4]}...{key[-4:]}"


def normalize_base_url(raw_url: str) -> str:
    url = (raw_url or "").strip().strip('"').strip("'")
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        url = f"https://{url.lstrip('/')}"
    return url.rstrip("/")


def _normalize_known_provider_path(provider_name: str, base_url: str) -> str:
    url = normalize_base_url(base_url)
    if not url:
        return ""

    parsed = urlparse(url)
    host = (parsed.netloc or "").lower()
    path = parsed.path or ""
    normalized_path = path.rstrip("/") or ""

    if provider_name == "OpenRouter" and "openrouter.ai" in host:
        if normalized_path in ("", "/v1"):
            normalized_path = "/api/v1"
    elif provider_name == "OpenAI" and "openai.com" in host:
        if normalized_path in ("",):
            normalized_path = "/v1"

    return urlunparse(
        parsed._replace(path=normalized_path or parsed.path or "/")
    ).rstrip("/")


def resolve_provider_and_base_url(
    provider_name: str, base_url: str, api_key: str
) -> Tuple[str, str]:
    normalized_provider = (provider_name or "").strip()
    normalized_url = normalize_base_url(base_url)
    key = (api_key or "").strip()

    provider_hint = normalized_provider.lower()
    key_is_openrouter = key.startswith("sk-or-")
    key_is_openai = key.startswith("sk-") and not key_is_openrouter
    url_is_openrouter = "openrouter.ai" in normalized_url.lower()
    url_is_openai = "openai.com" in normalized_url.lower()

    if key_is_openrouter:
        # OpenRouter key prefix is definitive; use canonical OpenRouter endpoint.
        resolved_provider = "OpenRouter"
        normalized_url = OPENROUTER_BASE_URL
    elif key_is_openai:
        # OpenAI key prefix is definitive; use canonical OpenAI endpoint.
        resolved_provider = "OpenAI"
        normalized_url = DEFAULT_BASE_URL
    elif provider_hint == "openrouter" or url_is_openrouter:
        resolved_provider = "OpenRouter"
        if not normalized_url or url_is_openai:
            normalized_url = OPENROUTER_BASE_URL
    elif provider_hint == "openai" or url_is_openai:
        resolved_provider = "OpenAI"
        if not normalized_url or url_is_openrouter:
            normalized_url = DEFAULT_BASE_URL
    else:
        resolved_provider = normalized_provider or _infer_provider_name(
            normalized_url or DEFAULT_BASE_URL
        )
        if not normalized_url:
            normalized_url = DEFAULT_BASE_URL

    normalized_url = _normalize_known_provider_path(resolved_provider, normalized_url)
    return resolved_provider, normalized_url


def build_provider_headers(provider_name: str) -> Dict[str, str]:
    if provider_name != "OpenRouter":
        return {}

    referer = (
        (os.getenv("OPENROUTER_HTTP_REFERER") or "").strip()
        or (os.getenv("FRONTEND_URL") or "").strip()
        or "https://localhost"
    )
    if not referer.startswith(("http://", "https://")):
        referer = f"https://{referer.lstrip('/')}"

    title = (
        (os.getenv("OPENROUTER_APP_TITLE") or "").strip()
        or (os.getenv("APP_NAME") or "").strip()
        or "SikshyaSetu LMS"
    )

    return {
        "HTTP-Referer": referer,
        "X-Title": title,
    }


def get_ai_provider_config() -> Dict[str, Any]:
    env_base_url = normalize_base_url(os.getenv("OPENAI_BASE_URL") or DEFAULT_BASE_URL)
    env_model = (os.getenv("OPENAI_MODEL") or DEFAULT_MODEL).strip()
    env_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    env_provider = (os.getenv("OPENAI_PROVIDER_NAME") or "").strip()

    settings_obj = None
    try:
        settings_obj = GlobalSettings.objects.first()
    except Exception:
        settings_obj = None

    source = "environment"
    enabled = True

    if settings_obj:
        db_provider = (settings_obj.ai_provider_name or "").strip()
        db_base_url = normalize_base_url(settings_obj.ai_base_url or "")
        db_model = (settings_obj.ai_model or "").strip()
        db_key = (settings_obj.ai_api_key or "").strip()

        api_key = db_key or env_key
        provider_name, base_url = resolve_provider_and_base_url(
            db_provider or env_provider,
            db_base_url or env_base_url,
            api_key,
        )
        model = db_model or env_model
        enabled = bool(settings_obj.ai_enabled)
        source = "saas_settings"
    else:
        api_key = env_key
        provider_name, base_url = resolve_provider_and_base_url(
            env_provider,
            env_base_url,
            api_key,
        )
        model = env_model

    configured = bool(api_key and api_key != "demo-key")
    if provider_name == "OpenRouter" and model in {"", DEFAULT_MODEL, "gpt-3.5-turbo"}:
        model = OPENROUTER_FALLBACK_MODEL
    if provider_name == "OpenAI" and model in {"", "openai/gpt-4o-mini"}:
        model = OPENAI_FALLBACK_MODEL

    return {
        "provider_name": provider_name,
        "base_url": base_url,
        "model": model,
        "api_key": api_key,
        "api_key_masked": _mask_key(api_key),
        "request_headers": build_provider_headers(provider_name),
        "configured": configured,
        "enabled": enabled,
        "source": source,
    }
