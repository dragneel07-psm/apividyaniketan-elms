# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
ai_client — Model Fallback Chain (Phase 14).

Wraps OpenAI chat completion calls with automatic retry on a secondary
(cheaper/lighter) model when the primary model is unavailable due to
quota limits or transient errors.

Fallback order:
  1. Primary model  (from get_ai_provider_config() / OPENAI_MODEL env var)
  2. Fallback model (AI_FALLBACK_MODEL env var, default: gpt-4o-mini)

Usage:
  from ai_engine.services.ai_client import chat_with_fallback

  response = chat_with_fallback(
      messages=[{"role": "user", "content": "Hello"}],
      temperature=0.7,
  )
  answer = response.choices[0].message.content
"""

from __future__ import annotations

import json
import logging
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

# Errors that trigger a fallback (rate limits, quota, overload)
_RETRYABLE_STATUS_CODES = {429, 503, 529}


def provider_ready() -> bool:
    """True when an AI provider is configured and enabled in SaaS settings."""
    from ai_engine.services.provider_config import get_ai_provider_config

    config = get_ai_provider_config()
    return bool(config.get("enabled") and config.get("configured"))


def parse_json_content(response: Any) -> Any:
    """
    Extract and parse the JSON payload from a chat completion, tolerating
    markdown code fences some models wrap around JSON output.
    """
    raw = (response.choices[0].message.content or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return json.loads(raw)


def structured_chat(
    messages: list[dict[str, Any]],
    *,
    schema: dict[str, Any],
    schema_name: str = "response",
    temperature: float = 0.2,
    max_tokens: int | None = None,
    model: str | None = None,
    timeout: float | None = None,
) -> Any:
    """
    Chat completion constrained to a JSON schema.

    Tries OpenAI strict structured outputs first; OpenAI-compatible
    providers that reject json_schema (HTTP 400) are retried with the
    widely supported json_object mode. Either way the model is told the
    expected shape via the prompt, and callers parse with
    parse_json_content().
    """
    from openai import APIStatusError, BadRequestError

    json_schema_format = {
        "type": "json_schema",
        "json_schema": {"name": schema_name, "strict": True, "schema": schema},
    }
    try:
        return chat_with_fallback(
            messages,
            temperature=temperature,
            response_format=json_schema_format,
            max_tokens=max_tokens,
            model=model,
            timeout=timeout,
        )
    except (BadRequestError, APIStatusError) as exc:
        status_code = getattr(exc, "status_code", None)
        if status_code != 400:
            raise
        logger.info(
            "structured_chat: provider rejected json_schema, retrying with json_object"
        )
        return chat_with_fallback(
            messages,
            temperature=temperature,
            response_format={"type": "json_object"},
            max_tokens=max_tokens,
            model=model,
            timeout=timeout,
        )


def _maybe_redact(messages: list[dict[str, Any]], redact: bool | None) -> list[dict[str, Any]]:
    """Mask PII in outbound messages unless explicitly disabled.

    Default follows settings.AI_PII_REDACTION (default True). The platform
    serves minors, so identifiers must not leave our infra inside prompts.
    """
    enabled = getattr(settings, "AI_PII_REDACTION", True) if redact is None else redact
    if not enabled:
        return messages
    from ai_engine.services.pii_redaction import redact_messages

    return redact_messages(messages)


def chat_with_fallback(
    messages: list[dict[str, Any]],
    *,
    temperature: float = 0.7,
    response_format: dict | None = None,
    max_tokens: int | None = None,
    model: str | None = None,
    timeout: float | None = None,
    redact: bool | None = None,
) -> Any:
    """
    Call the configured AI provider for a chat completion.

    Automatically retries with the fallback model if the primary model
    returns a rate-limit or service-unavailable error. Outbound message
    content is PII-redacted unless redact=False (see settings.AI_PII_REDACTION).

    Returns an OpenAI ChatCompletion response object.
    Raises the last exception if all models fail.
    """
    from openai import APIStatusError, OpenAI, RateLimitError

    from ai_engine.services.provider_config import get_ai_provider_config

    messages = _maybe_redact(messages, redact)
    config = get_ai_provider_config()
    primary_model = str(
        model or config.get("model") or getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
    )
    fallback_model = str(getattr(settings, "AI_FALLBACK_MODEL", "gpt-4o-mini"))

    client = OpenAI(
        api_key=config.get("api_key"),
        base_url=config.get("base_url"),
        default_headers=config.get("request_headers") or None,
        timeout=timeout or float(getattr(settings, "OPENAI_TIMEOUT_SECONDS", 30)),
    )

    call_kwargs: dict[str, Any] = {"messages": messages, "temperature": temperature}
    if response_format:
        call_kwargs["response_format"] = response_format
    if max_tokens:
        call_kwargs["max_tokens"] = max_tokens

    models_to_try = _build_model_chain(primary_model, fallback_model)
    last_exc: Exception | None = None

    for model in models_to_try:
        try:
            response = client.chat.completions.create(model=model, **call_kwargs)
            if model != primary_model:
                logger.info("ai_client: used fallback model '%s'", model)
            return response
        except RateLimitError as exc:
            logger.warning(
                "ai_client: rate-limit on '%s', trying next model: %s", model, exc
            )
            last_exc = exc
        except APIStatusError as exc:
            if exc.status_code in _RETRYABLE_STATUS_CODES:
                logger.warning(
                    "ai_client: status %s on '%s', trying next model: %s",
                    exc.status_code,
                    model,
                    exc,
                )
                last_exc = exc
            else:
                raise
        except Exception:
            raise

    raise last_exc  # type: ignore[misc]


def stream_with_fallback(
    messages: list[dict[str, Any]],
    *,
    temperature: float = 0.2,
    max_tokens: int | None = None,
    model: str | None = None,
    timeout: float | None = None,
) -> Any:
    """
    Like chat_with_fallback but with stream=True.

    Returns a streaming response object. Fallback fires only if the
    primary model raises an error *before* any tokens are received
    (e.g. at connection/quota check time), which is the common case
    for rate-limit errors.
    """
    from openai import APIStatusError, OpenAI, RateLimitError

    from ai_engine.services.provider_config import get_ai_provider_config

    config = get_ai_provider_config()
    primary_model = str(
        model or config.get("model") or getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
    )
    fallback_model = str(getattr(settings, "AI_FALLBACK_MODEL", "gpt-4o-mini"))

    client = OpenAI(
        api_key=config.get("api_key"),
        base_url=config.get("base_url"),
        default_headers=config.get("request_headers") or None,
        timeout=timeout or float(getattr(settings, "OPENAI_TIMEOUT_SECONDS", 30)),
    )

    call_kwargs: dict[str, Any] = {
        "messages": messages,
        "temperature": temperature,
        "stream": True,
    }
    if max_tokens:
        call_kwargs["max_tokens"] = max_tokens

    models_to_try = _build_model_chain(primary_model, fallback_model)
    last_exc: Exception | None = None

    for model in models_to_try:
        try:
            stream = client.chat.completions.create(model=model, **call_kwargs)
            if model != primary_model:
                logger.info("ai_client: used fallback model '%s' for streaming", model)
            return stream
        except RateLimitError as exc:
            logger.warning(
                "ai_client: rate-limit on '%s' (stream), trying next model: %s",
                model,
                exc,
            )
            last_exc = exc
        except APIStatusError as exc:
            if exc.status_code in _RETRYABLE_STATUS_CODES:
                logger.warning(
                    "ai_client: status %s on '%s' (stream), trying next model: %s",
                    exc.status_code,
                    model,
                    exc,
                )
                last_exc = exc
            else:
                raise
        except Exception:
            raise

    raise last_exc  # type: ignore[misc]


def _build_model_chain(primary: str, fallback: str) -> list[str]:
    """Return deduplicated list of models to try in order."""
    chain = [primary]
    if fallback and fallback != primary:
        chain.append(fallback)
    return chain
