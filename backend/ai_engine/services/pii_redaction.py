# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
PII redaction for text sent to third-party LLM providers.

The platform serves minors, so direct identifiers must not leave our
infrastructure inside prompts. This module masks unambiguous contact and
identity tokens (email, phone, long ID numbers) before any text reaches the
AI provider. It is intentionally conservative: it does NOT attempt free-form
name detection (which over-redacts and breaks tutoring), but callers that
already know a student's name can pass it via ``extra_terms`` to mask it too.

Applied centrally in ai_client.chat_with_fallback / stream_with_fallback, so
every AI service inherits it. Toggle with settings.AI_PII_REDACTION
(default True).
"""
from __future__ import annotations

import re
from typing import Any, Iterable

# Order matters: emails before phone (an email can contain digit runs).
_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
# Phone: optional +country, then 7-15 digits possibly separated by space/-/().
_PHONE_RE = re.compile(r"(?<!\w)\+?\d[\d\s().-]{6,}\d(?!\w)")
# Standalone long digit runs (national IDs, card-like, account numbers).
_LONG_ID_RE = re.compile(r"(?<!\w)\d{7,}(?!\w)")


def redact_pii(text: str, *, extra_terms: Iterable[str] | None = None) -> str:
    """Mask emails, phone numbers, long ID numbers, and any extra_terms."""
    if not text or not isinstance(text, str):
        return text

    redacted = _EMAIL_RE.sub("[REDACTED_EMAIL]", text)
    redacted = _PHONE_RE.sub("[REDACTED_PHONE]", redacted)
    redacted = _LONG_ID_RE.sub("[REDACTED_ID]", redacted)

    for term in extra_terms or ():
        term = (term or "").strip()
        if len(term) < 3:  # avoid masking initials / tiny tokens
            continue
        redacted = re.sub(rf"\b{re.escape(term)}\b", "[REDACTED_NAME]", redacted, flags=re.IGNORECASE)

    return redacted


def redact_messages(
    messages: list[dict[str, Any]], *, extra_terms: Iterable[str] | None = None
) -> list[dict[str, Any]]:
    """Return a copy of chat messages with PII masked in string content."""
    cleaned: list[dict[str, Any]] = []
    for msg in messages:
        if isinstance(msg, dict) and isinstance(msg.get("content"), str):
            cleaned.append({**msg, "content": redact_pii(msg["content"], extra_terms=extra_terms)})
        else:
            cleaned.append(msg)
    return cleaned
