# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import SimpleTestCase

from ai_engine.evals.runner import evaluate_case, load_cases, run_eval


def case(min_score=5, max_score=10, mention=None):
    expected = {"min_score": min_score, "max_score": max_score}
    if mention:
        expected["feedback_must_mention"] = mention
    return {
        "id": "c1",
        "question": "Q?",
        "student_answer": "A.",
        "correct_answer": "A!",
        "total_points": 10,
        "expected": expected,
    }


class EvaluateCaseTests(SimpleTestCase):
    def test_passes_inside_band(self):
        outcome = evaluate_case(case(), {"score": 7, "feedback": "Good work."})
        self.assertTrue(outcome["passed"])

    def test_fails_below_band(self):
        outcome = evaluate_case(case(), {"score": 3, "feedback": "ok"})
        self.assertFalse(outcome["passed"])
        self.assertIn("below expected minimum", outcome["reasons"][0])

    def test_fails_above_band(self):
        outcome = evaluate_case(case(max_score=8), {"score": 9.5, "feedback": "ok"})
        self.assertFalse(outcome["passed"])

    def test_fails_on_missing_score(self):
        outcome = evaluate_case(case(), {"feedback": "ok"})
        self.assertFalse(outcome["passed"])

    def test_fails_on_empty_feedback(self):
        outcome = evaluate_case(case(), {"score": 7, "feedback": "  "})
        self.assertFalse(outcome["passed"])

    def test_feedback_mention_check_is_case_insensitive(self):
        outcome = evaluate_case(
            case(mention=["Photosynthesis"]),
            {"score": 7, "feedback": "mentions photosynthesis clearly"},
        )
        self.assertTrue(outcome["passed"])

    def test_feedback_mention_failure(self):
        outcome = evaluate_case(
            case(mention=["chloroplast"]),
            {"score": 7, "feedback": "nice answer"},
        )
        self.assertFalse(outcome["passed"])


class RunEvalTests(SimpleTestCase):
    def test_aggregates_pass_rate(self):
        cases = [case(), case(min_score=9)]

        def grade_fn(question, answer, correct_answer=None, total_points=10):
            return {"score": 7, "feedback": "Good."}

        summary = run_eval(cases, grade_fn)
        self.assertEqual(summary["total"], 2)
        self.assertEqual(summary["passed"], 1)
        self.assertEqual(summary["pass_rate"], 0.5)

    def test_grader_exception_counts_as_failure(self):
        def grade_fn(*args, **kwargs):
            raise RuntimeError("provider down")

        summary = run_eval([case()], grade_fn)
        self.assertEqual(summary["failed"], 1)
        self.assertIn("grader raised", summary["results"][0]["reasons"][0])


class GoldenDatasetTests(SimpleTestCase):
    def test_dataset_loads_and_is_well_formed(self):
        cases = load_cases()
        self.assertGreaterEqual(len(cases), 10)
        for item in cases:
            self.assertIn("id", item)
            self.assertIn("question", item)
            self.assertIn("student_answer", item)
            expected = item["expected"]
            self.assertLessEqual(expected["min_score"], expected["max_score"])
            self.assertLessEqual(expected["max_score"], item.get("total_points", 10))


class RunAiEvalsCommandTests(SimpleTestCase):
    def test_skips_cleanly_without_provider(self):
        out = StringIO()
        with patch("ai_engine.services.ai_client.provider_ready", return_value=False):
            call_command("run_ai_evals", stdout=out)
        self.assertIn("evals skipped", out.getvalue())

    def test_fails_below_min_pass_rate(self):
        out = StringIO()
        with patch(
            "ai_engine.services.ai_client.provider_ready", return_value=True
        ), patch(
            "ai_engine.services.grading_service.GradingService.grade_submission",
            return_value={"score": 0, "feedback": "x"},
        ):
            with self.assertRaises(SystemExit):
                call_command("run_ai_evals", stdout=out)
