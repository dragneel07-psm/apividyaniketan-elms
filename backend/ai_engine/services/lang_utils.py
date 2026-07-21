# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Language utilities for AI prompt localisation.

All AI services should call `get_lang_instruction(lang)` and append the result
to their system prompts so the LLM responds in the student's preferred language.
"""

SUPPORTED_LANGS = {
    "en": "English",
    "ne": "Nepali (नेपाली)",
    "hi": "Hindi (हिन्दी)",
}

DEFAULT_LANG = "en"


def normalise_lang(lang: str | None) -> str:
    """Return a canonical 2-char language code, falling back to 'en'."""
    if not lang:
        return DEFAULT_LANG
    code = str(lang).strip().lower()[:2]
    return code if code in SUPPORTED_LANGS else DEFAULT_LANG


def get_lang_instruction(lang: str | None) -> str:
    """
    Return a system prompt instruction that tells the LLM which language to use.
    Returns an empty string for English (no extra instruction needed).
    """
    code = normalise_lang(lang)
    if code == "en":
        return ""
    lang_name = SUPPORTED_LANGS[code]
    return (
        f"IMPORTANT: You MUST respond entirely in {lang_name}. "
        f"All explanations, examples, and feedback should be in {lang_name}. "
        f"Do not mix languages."
    )


def lang_from_student(student) -> str:
    """Extract language preference from a Student model instance."""
    if student is None:
        return DEFAULT_LANG
    return normalise_lang(getattr(student, "language_preference", None))
