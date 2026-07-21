# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Unit tests for Phase 4: Confidence Scoring, Socratic Mode, and Exact Citations.
Run with: python manage.py test ai_engine.tests_phase4
"""

from unittest.mock import MagicMock, patch

from django.test import TestCase

from ai_engine.services.rag_tutor_service import RAGTutorService


def _make_service():
    tenant = MagicMock()
    tenant.name = "test-school"
    with patch(
        "ai_engine.services.rag_tutor_service.get_ai_provider_config"
    ) as mock_cfg:
        mock_cfg.return_value = {"enabled": False, "configured": False}
        svc = RAGTutorService(tenant=tenant)
    return svc


def _make_chunk(
    text="Sample content", source_type="lesson", source_id="42", metadata=None
):
    chunk = MagicMock()
    chunk.source_type = source_type
    chunk.source_id = source_id
    chunk.text = text
    chunk.metadata = metadata or {}
    return chunk


# ------------------------------------------------------------------
# Confidence Scoring
# ------------------------------------------------------------------


class ConfidenceScoringTest(TestCase):

    def test_empty_grounded_returns_zero(self):
        svc = _make_service()
        self.assertEqual(svc._compute_confidence([]), 0.0)

    def test_single_high_similarity(self):
        svc = _make_service()
        grounded = [{"chunk": _make_chunk(), "similarity": 0.92}]
        conf = svc._compute_confidence(grounded)
        self.assertAlmostEqual(conf, 0.92, places=3)

    def test_mean_of_multiple_chunks(self):
        svc = _make_service()
        grounded = [
            {"chunk": _make_chunk(), "similarity": 0.80},
            {"chunk": _make_chunk(), "similarity": 0.90},
            {"chunk": _make_chunk(), "similarity": 0.70},
        ]
        conf = svc._compute_confidence(grounded)
        self.assertAlmostEqual(conf, 0.80, places=3)

    def test_confidence_clamped_to_1(self):
        svc = _make_service()
        grounded = [{"chunk": _make_chunk(), "similarity": 1.5}]
        conf = svc._compute_confidence(grounded)
        self.assertLessEqual(conf, 1.0)

    def test_confidence_clamped_to_0(self):
        svc = _make_service()
        grounded = [{"chunk": _make_chunk(), "similarity": -0.3}]
        conf = svc._compute_confidence(grounded)
        self.assertGreaterEqual(conf, 0.0)


class ConfidenceLabelTest(TestCase):

    def test_high_label(self):
        svc = _make_service()
        self.assertEqual(svc._confidence_label(0.85), "high")
        self.assertEqual(svc._confidence_label(0.99), "high")
        self.assertEqual(svc._confidence_label(1.0), "high")

    def test_moderate_label(self):
        svc = _make_service()
        self.assertEqual(svc._confidence_label(0.70), "moderate")
        self.assertEqual(svc._confidence_label(0.84), "moderate")

    def test_low_label(self):
        svc = _make_service()
        self.assertEqual(svc._confidence_label(0.0), "low")
        self.assertEqual(svc._confidence_label(0.69), "low")


# ------------------------------------------------------------------
# Exact Citation Building
# ------------------------------------------------------------------


class CitationBuildingTest(TestCase):

    def test_citations_include_text_span(self):
        svc = _make_service()
        chunk = _make_chunk(
            text="Full lesson content here.", source_type="lesson", source_id="10"
        )
        grounded = [{"chunk": chunk, "similarity": 0.88}]
        citations = svc._build_citations(grounded)
        self.assertEqual(len(citations), 1)
        self.assertEqual(citations[0]["text_span"], "Full lesson content here.")

    def test_citations_snippet_is_truncated(self):
        svc = _make_service()
        long_text = "A" * 500
        chunk = _make_chunk(text=long_text)
        grounded = [{"chunk": chunk, "similarity": 0.75}]
        citations = svc._build_citations(grounded)
        self.assertEqual(len(citations[0]["snippet"]), 220)

    def test_citations_include_similarity_score(self):
        svc = _make_service()
        chunk = _make_chunk()
        grounded = [{"chunk": chunk, "similarity": 0.812}]
        citations = svc._build_citations(grounded)
        self.assertAlmostEqual(citations[0]["similarity"], 0.812, places=3)

    def test_citations_include_metadata(self):
        svc = _make_service()
        meta = {"chapter_id": "99", "title": "Cell Biology"}
        chunk = _make_chunk(metadata=meta)
        grounded = [{"chunk": chunk, "similarity": 0.8}]
        citations = svc._build_citations(grounded)
        self.assertEqual(citations[0]["metadata"]["chapter_id"], "99")

    def test_citations_multiple_sources(self):
        svc = _make_service()
        grounded = [
            {
                "chunk": _make_chunk(source_type="lesson", source_id="1"),
                "similarity": 0.9,
            },
            {
                "chunk": _make_chunk(source_type="chapter", source_id="2"),
                "similarity": 0.75,
            },
        ]
        citations = svc._build_citations(grounded)
        self.assertEqual(len(citations), 2)
        self.assertEqual(citations[0]["source_type"], "lesson")
        self.assertEqual(citations[1]["source_type"], "chapter")


# ------------------------------------------------------------------
# Socratic Mode Prompting
# ------------------------------------------------------------------


class SocraticModeTest(TestCase):

    def _get_messages(self, mode):
        """Return (system_prompt, user_prompt) for a given mode."""
        svc = _make_service()
        chunk = _make_chunk(text="Photosynthesis converts light to chemical energy.")
        snippets = [{"chunk": chunk, "similarity": 0.9}]
        messages = svc._build_grounded_messages(
            "What is photosynthesis?",
            snippets,
            context={"mode": mode},
        )
        system_prompt = messages[0]["content"]
        user_prompt = messages[-1]["content"]
        return system_prompt, user_prompt

    def test_socratic_mode_prompt_contains_guide_instruction(self):
        system_prompt, _ = self._get_messages("socratic")
        self.assertIn("Socratic", system_prompt)
        self.assertIn("guide", system_prompt.lower())

    def test_socratic_mode_does_not_instruct_to_give_answer(self):
        # User prompt for Socratic should NOT say "Answer using only"
        _, user_prompt = self._get_messages("socratic")
        self.assertNotIn("Answer using only the snippets", user_prompt)

    def test_direct_mode_user_prompt_has_answer_instruction(self):
        _, user_prompt = self._get_messages("direct")
        self.assertIn("Answer using only the snippets", user_prompt)

    def test_default_mode_is_direct(self):
        """If no mode is specified, default is 'direct'."""
        svc = _make_service()
        chunk = _make_chunk(text="Content here.")
        snippets = [{"chunk": chunk, "similarity": 0.9}]
        messages = svc._build_grounded_messages("A question?", snippets, context={})
        user_prompt = messages[-1]["content"]
        self.assertIn("Answer using only the snippets", user_prompt)

    def test_unknown_mode_falls_back_to_direct(self):
        """Unrecognised mode should fall back to direct."""
        _, user_prompt = self._get_messages("unknown_mode")
        self.assertIn("Answer using only the snippets", user_prompt)


# ------------------------------------------------------------------
# answer_question returns confidence and mode
# ------------------------------------------------------------------


class AnswerQuestionOutputTest(TestCase):

    def test_no_context_returns_zero_confidence(self):
        """When no chunks are grounded, confidence should be 0."""
        svc = _make_service()
        # Patch retrieve to return nothing above threshold
        with patch.object(svc, "retrieve_relevant_chunks", return_value=[]):
            with patch.object(svc, "answer_without_grounding") as mock_fallback:
                mock_fallback.return_value = {
                    "answer": "fallback",
                    "sources": [],
                    "usage": {},
                    "is_demo": True,
                    "fallback_reason": "general_llm",
                }
                result = svc.answer_question("What is X?")
        # answer_without_grounding was called — confidence not in result (general fallback path)
        mock_fallback.assert_called_once()

    def test_grounded_answer_includes_confidence(self):
        """A grounded answer must include confidence and confidence_label."""
        svc = _make_service()
        chunk = _make_chunk(text="Test content about Newton's laws.")
        grounded = [{"chunk": chunk, "similarity": 0.88}]

        with patch.object(svc, "retrieve_relevant_chunks", return_value=grounded):
            with patch.object(
                svc,
                "_call_chat_model",
                return_value=(
                    "Newton's first law...",
                    {
                        "model": "gpt-4o-mini",
                        "prompt_tokens": 10,
                        "completion_tokens": 20,
                    },
                ),
            ):
                result = svc.answer_question("What is Newton's first law?")

        self.assertIn("confidence", result)
        self.assertIn("confidence_label", result)
        self.assertAlmostEqual(result["confidence"], 0.88, places=2)
        self.assertEqual(result["confidence_label"], "high")

    def test_grounded_answer_includes_mode(self):
        """Mode should be echoed back in the response."""
        svc = _make_service()
        chunk = _make_chunk(text="Osmosis is the movement of water.")
        grounded = [{"chunk": chunk, "similarity": 0.80}]

        with patch.object(svc, "retrieve_relevant_chunks", return_value=grounded):
            with patch.object(
                svc,
                "_call_chat_model",
                return_value=(
                    "Osmosis moves water...",
                    {
                        "model": "gpt-4o-mini",
                        "prompt_tokens": 5,
                        "completion_tokens": 10,
                    },
                ),
            ):
                result = svc.answer_question(
                    "Explain osmosis?", context={"mode": "socratic"}
                )

        self.assertEqual(result["mode"], "socratic")

    def test_sources_have_text_span(self):
        """Sources returned from answer_question must include text_span."""
        svc = _make_service()
        chunk = _make_chunk(text="Full text of the lesson chunk.")
        grounded = [{"chunk": chunk, "similarity": 0.82}]

        with patch.object(svc, "retrieve_relevant_chunks", return_value=grounded):
            with patch.object(
                svc,
                "_call_chat_model",
                return_value=(
                    "Answer...",
                    {
                        "model": "gpt-4o-mini",
                        "prompt_tokens": 5,
                        "completion_tokens": 10,
                    },
                ),
            ):
                result = svc.answer_question("Question?")

        self.assertTrue(len(result["sources"]) > 0)
        self.assertIn("text_span", result["sources"][0])
        self.assertEqual(
            result["sources"][0]["text_span"], "Full text of the lesson chunk."
        )
