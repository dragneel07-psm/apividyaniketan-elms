# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Minimal fallback for DRF OpenAPI generation when `inflection` is unavailable.
"""


def pluralize(word: str) -> str:
    value = str(word or "")
    if value.endswith(("s", "x", "z", "ch", "sh")):
        return f"{value}es"
    if len(value) > 1 and value.endswith("y") and value[-2].lower() not in "aeiou":
        return f"{value[:-1]}ies"
    return f"{value}s"


def singularize(word: str) -> str:
    value = str(word or "")
    if value.endswith("ies") and len(value) > 3:
        return f"{value[:-3]}y"
    if value.endswith("es") and len(value) > 2:
        return value[:-2]
    if value.endswith("s") and len(value) > 1:
        return value[:-1]
    return value
