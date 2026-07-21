# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Tests for Phase 2: Multi-query expansion + Persistent Conversation Memory.
Run with: python manage.py test ai_engine.tests_phase2
"""

from unittest.mock import MagicMock, patch

from django.test import TestCase

from ai_engine.services.rag_tutor_service import RAGTutorService
from ai_engine.services.sm2_service import SM2Service


class MultiQueryExpansionTest(TestCase):
    """Test _expand_query and _merge_and_rerank without hitting an actual LLM."""

    def _make_service(self):
        tenant = MagicMock()
        tenant.name = "test-school"
        with patch(
            "ai_engine.services.rag_tutor_service.get_ai_provider_config"
        ) as mock_cfg:
            mock_cfg.return_value = {"enabled": False, "configured": False}
            svc = RAGTutorService(tenant=tenant)
        return svc

    def test_expand_query_returns_original_when_no_client(self):
        """When AI is not configured, expansion returns only the original query."""
        svc = self._make_service()
        result = svc._expand_query("What is photosynthesis?")
        self.assertEqual(result, ["What is photosynthesis?"])

    def test_expand_query_with_mock_client(self):
        """When LLM returns two variants, we get a list of 3 (original + 2)."""
        svc = self._make_service()
        mock_response = MagicMock()
        mock_response.choices[0].message.content = (
            "How does photosynthesis work?\nExplain the process of photosynthesis"
        )

        with patch(
            "ai_engine.services.ai_client.provider_ready", return_value=True
        ), patch(
            "ai_engine.services.rag_tutor_service.chat_with_fallback",
            return_value=mock_response,
        ):
            result = svc._expand_query("What is photosynthesis?")

        self.assertEqual(len(result), 3)
        self.assertEqual(result[0], "What is photosynthesis?")
        self.assertIn("How does photosynthesis work?", result)

    def test_expand_query_limits_to_2_variants(self):
        """Even if LLM returns more lines, only 2 variants are taken."""
        svc = self._make_service()
        mock_response = MagicMock()
        mock_response.choices[0].message.content = (
            "Variant A\nVariant B\nVariant C\nVariant D"
        )

        with patch(
            "ai_engine.services.ai_client.provider_ready", return_value=True
        ), patch(
            "ai_engine.services.rag_tutor_service.chat_with_fallback",
            return_value=mock_response,
        ):
            result = svc._expand_query("original")

        self.assertEqual(len(result), 3)  # original + 2

    def test_expand_query_fallback_on_error(self):
        """If the LLM call raises an exception, returns only original."""
        svc = self._make_service()

        with patch(
            "ai_engine.services.ai_client.provider_ready", return_value=True
        ), patch(
            "ai_engine.services.rag_tutor_service.chat_with_fallback",
            side_effect=Exception("timeout"),
        ):
            result = svc._expand_query("What is gravity?")

        self.assertEqual(result, ["What is gravity?"])

    def test_merge_and_rerank_deduplicates(self):
        """Same chunk appearing in multiple result lists should appear once in output."""
        svc = self._make_service()

        chunk_a = MagicMock()
        chunk_a.id = "aaa"
        chunk_b = MagicMock()
        chunk_b.id = "bbb"
        chunk_c = MagicMock()
        chunk_c.id = "ccc"

        # chunk_a appears in both result lists — should be merged, not duplicated
        list1 = [(chunk_a, 0.9), (chunk_b, 0.7)]
        list2 = [(chunk_a, 0.85), (chunk_c, 0.6)]

        result = svc._merge_and_rerank([list1, list2])
        ids = [r["chunk"].id for r in result]

        self.assertEqual(
            len(ids), len(set(ids)), "Duplicate chunks found in reranked output"
        )
        self.assertIn("aaa", ids)
        self.assertIn("bbb", ids)
        self.assertIn("ccc", ids)

    def test_merge_and_rerank_top_k_respected(self):
        """Output must not exceed top_k chunks."""
        svc = self._make_service()
        svc.top_k = 2

        chunks = [MagicMock() for _ in range(6)]
        for i, c in enumerate(chunks):
            c.id = f"chunk-{i}"

        list1 = [(chunks[i], 1.0 - i * 0.1) for i in range(3)]
        list2 = [(chunks[i], 1.0 - i * 0.1) for i in range(3, 6)]

        result = svc._merge_and_rerank([list1, list2])
        self.assertLessEqual(len(result), 2)

    def test_rrf_boosts_chunks_appearing_in_multiple_lists(self):
        """A chunk in both lists should rank higher than one appearing in only one."""
        svc = self._make_service()
        svc.top_k = 10

        shared = MagicMock()
        shared.id = "shared"
        exclusive = MagicMock()
        exclusive.id = "exclusive"

        # exclusive has higher individual score but only in list1
        # shared appears in both lists
        list1 = [(exclusive, 0.95), (shared, 0.7)]
        list2 = [(shared, 0.75)]

        result = svc._merge_and_rerank([list1, list2])
        ids = [r["chunk"].id for r in result]

        # shared appears in both → higher RRF score → should rank first
        self.assertEqual(ids[0], "shared")


class RRFFusionMathTest(TestCase):
    """Verify RRF score calculation directly."""

    def test_rrf_formula(self):
        """Rank 0 in a list contributes 1/60 ≈ 0.0167. Rank 1 contributes 1/61 ≈ 0.0164."""
        RRF_K = 60
        score_rank0 = 1.0 / (0 + RRF_K)
        score_rank1 = 1.0 / (1 + RRF_K)
        self.assertAlmostEqual(score_rank0, 0.01667, places=4)
        self.assertAlmostEqual(score_rank1, 0.01639, places=4)
        self.assertGreater(score_rank0, score_rank1)
