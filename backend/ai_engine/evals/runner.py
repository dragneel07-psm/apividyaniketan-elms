# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Golden-set evaluation runner for AI services.

A golden case pins down the *band* of acceptable behavior rather than an
exact string, so model upgrades can be validated mechanically:

    {
      "id": "photosynthesis-perfect",
      "question": "...",
      "student_answer": "...",
      "correct_answer": "...",
      "total_points": 10,
      "expected": {
        "min_score": 8,
        "max_score": 10,
        "feedback_must_mention": ["photosynthesis"]   # optional, case-insensitive
      }
    }

Run with:  python manage.py run_ai_evals
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

GOLDEN_GRADING_PATH = Path(__file__).parent / "golden_grading.json"


def load_cases(path: Path = GOLDEN_GRADING_PATH) -> list[dict[str, Any]]:
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    return data["cases"]


def evaluate_case(case: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    """Score one grading result against its golden expectations."""
    expected = case.get("expected", {})
    reasons: list[str] = []

    try:
        score = float(result.get("score"))
    except (TypeError, ValueError):
        score = None
    feedback = str(result.get("feedback") or "")

    if score is None:
        reasons.append("score missing or not numeric")
    else:
        min_score = expected.get("min_score")
        max_score = expected.get("max_score")
        if min_score is not None and score < float(min_score):
            reasons.append(f"score {score} below expected minimum {min_score}")
        if max_score is not None and score > float(max_score):
            reasons.append(f"score {score} above expected maximum {max_score}")

    if not feedback.strip():
        reasons.append("feedback is empty")

    for term in expected.get("feedback_must_mention", []):
        if term.lower() not in feedback.lower():
            reasons.append(f"feedback does not mention '{term}'")

    return {
        "id": case.get("id", "?"),
        "passed": not reasons,
        "score": score,
        "reasons": reasons,
    }


def run_eval(
    cases: list[dict[str, Any]],
    grade_fn: Callable[..., dict[str, Any]],
) -> dict[str, Any]:
    """
    Run every golden case through grade_fn(question_text, student_answer,
    correct_answer, total_points) and aggregate the outcomes.
    """
    results = []
    for case in cases:
        try:
            graded = grade_fn(
                case["question"],
                case["student_answer"],
                correct_answer=case.get("correct_answer"),
                total_points=case.get("total_points", 10),
            )
        except Exception as exc:
            results.append(
                {
                    "id": case.get("id", "?"),
                    "passed": False,
                    "score": None,
                    "reasons": [f"grader raised: {exc}"],
                }
            )
            continue
        results.append(evaluate_case(case, graded))

    passed = sum(1 for item in results if item["passed"])
    total = len(results)
    return {
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "pass_rate": (passed / total) if total else 0.0,
        "results": results,
    }
