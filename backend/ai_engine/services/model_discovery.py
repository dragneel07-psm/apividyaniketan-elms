# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from typing import Dict, List

from openai import OpenAI

from .provider_config import build_provider_headers, resolve_provider_and_base_url

OPENAI_BASE_URL = "https://api.openai.com/v1"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def _infer_provider(api_key: str, base_url: str) -> Dict[str, str]:
    key = (api_key or "").strip()
    provider_name, resolved_url = resolve_provider_and_base_url(
        provider_name="",
        base_url=base_url,
        api_key=key,
    )

    if provider_name == "OpenRouter":
        return {
            "provider_name": "OpenRouter",
            "base_url": resolved_url or OPENROUTER_BASE_URL,
            "fallback_model": "openai/gpt-4o-mini",
        }

    if provider_name == "OpenAI":
        return {
            "provider_name": "OpenAI",
            "base_url": resolved_url or OPENAI_BASE_URL,
            "fallback_model": "gpt-4o-mini",
        }

    return {
        "provider_name": "Custom OpenAI-Compatible",
        "base_url": resolved_url or OPENAI_BASE_URL,
        "fallback_model": "gpt-4o-mini",
    }


def _choose_best_model(model_ids: List[str], fallback_model: str) -> str:
    if not model_ids:
        return fallback_model

    preferred_patterns = [
        "gpt-4.1",
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4.1-mini",
        "gpt-4-turbo",
        "claude-3.7-sonnet",
        "claude-3.5-sonnet",
        "gemini-2.0-flash",
        "deepseek-chat",
        "llama-3.3-70b",
    ]

    lowered_map = {model_id: model_id.lower() for model_id in model_ids}

    for pattern in preferred_patterns:
        for model_id, lowered in lowered_map.items():
            if pattern in lowered:
                return model_id

    if fallback_model in model_ids:
        return fallback_model

    return sorted(model_ids)[0]


def detect_provider_and_model(
    api_key: str, base_url: str = "", max_models: int = 100
) -> Dict[str, object]:
    inferred = _infer_provider(api_key=api_key, base_url=base_url)
    provider_name = inferred["provider_name"]
    normalized_base_url = inferred["base_url"]
    fallback_model = inferred["fallback_model"]

    key = (api_key or "").strip()
    if not key:
        return {
            "provider_name": provider_name,
            "base_url": normalized_base_url,
            "model": fallback_model,
            "available_models": [],
            "detected": False,
            "error": "Missing API key",
        }

    model_ids: List[str] = []
    detection_error = None

    try:
        client = OpenAI(
            api_key=key,
            base_url=normalized_base_url,
            default_headers=build_provider_headers(provider_name) or None,
        )
        listed = client.models.list()
        for item in getattr(listed, "data", []):
            model_id = (getattr(item, "id", "") or "").strip()
            if model_id:
                model_ids.append(model_id)
    except Exception as exc:
        detection_error = str(exc)

    unique_models = sorted(set(model_ids))
    chosen_model = _choose_best_model(unique_models, fallback_model)

    return {
        "provider_name": provider_name,
        "base_url": normalized_base_url,
        "model": chosen_model,
        "available_models": unique_models[:max_models],
        "detected": bool(unique_models),
        "error": detection_error,
    }
