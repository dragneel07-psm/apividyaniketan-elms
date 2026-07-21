# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from academic.views.assessment import ResultViewSet


class ResultAIFeedbackTests(SimpleTestCase):
    def _dummy_result(self):
        saved = {"called": False}

        result = SimpleNamespace()
        result.student = SimpleNamespace(
            user=SimpleNamespace(
                get_full_name=lambda: "Test Student",
                first_name="Test",
            )
        )
        result.assessment = SimpleNamespace(
            title="Quiz 1",
            total_marks=100,
        )
        result.score = 75
        result.time_taken_minutes = 12
        result.answers_data = {"q1": {"answer": "demo"}}
        result.ai_feedback = ""

        def _save():
            saved["called"] = True

        result.save = _save
        return result, saved

    @patch(
        "ai_engine.services.tutor_service.ai_tutor_service.get_chat_response",
        return_value="AI feedback text",
    )
    def test_generate_ai_feedback_uses_tutor_service(self, _mock_chat):
        result, saved = self._dummy_result()
        view = ResultViewSet()
        view.get_object = lambda: result

        response = view.generate_ai_feedback(SimpleNamespace())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("ai_feedback"), "AI feedback text")
        self.assertTrue(saved["called"])

    @patch(
        "ai_engine.services.tutor_service.ai_tutor_service.get_chat_response",
        side_effect=Exception("provider down"),
    )
    def test_generate_ai_feedback_fallback_when_ai_fails(self, _mock_chat):
        result, saved = self._dummy_result()
        view = ResultViewSet()
        view.get_object = lambda: result

        response = view.generate_ai_feedback(SimpleNamespace())

        self.assertEqual(response.status_code, 200)
        self.assertIn("ai_feedback", response.data)
        self.assertIn("error", response.data)
        self.assertTrue(bool(response.data["ai_feedback"]))
        self.assertTrue(saved["called"])
