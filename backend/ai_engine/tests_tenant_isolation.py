# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
AI engine cross-tenant isolation — RAG must never retrieve another school's
content. ContentChunk rows carry a tenant FK and live in per-tenant schemas;
RAGTutorService scopes every retrieval to ``self.tenant``. A leak here would
feed school B's lesson material into school A's tutor answers (S1).

Requires the pgvector extension on the test tenant schemas. If a run skips
these for "vector extension missing", fix the test DB — do not delete the test.
"""

from __future__ import annotations

from unittest.mock import patch

from django.conf import settings
from django_tenants.utils import tenant_context

from core.tenant_isolation_base import TwoTenantAPITestCase


def _dummy_vector():
    dims = int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536))
    # Non-zero so cosine similarity is defined; identical across chunks so the
    # only thing separating results is the tenant filter under test.
    return [0.1] * dims


class RAGTenantIsolationTests(TwoTenantAPITestCase):
    def _make_chunk(self, tenant, text):
        from ai_engine.models import ContentChunk

        return self.create_in(
            tenant,
            ContentChunk,
            source_type="lesson",
            source_id="L1",
            text=text,
            embedding=_dummy_vector(),
        )

    # ── the scoping boundary ─────────────────────────────────────────────

    def test_base_queryset_scoped_to_tenant(self):
        from ai_engine.services.rag_tutor_service import RAGTutorService

        self._make_chunk(self.tenant, "A: photosynthesis notes")
        self._make_chunk(self.tenant_b, "B: secret exam answers")

        with tenant_context(self.tenant):
            service = RAGTutorService(tenant=self.tenant)
            texts = list(service._base_queryset().values_list("text", flat=True))

        self.assertIn("A: photosynthesis notes", texts)
        self.assertNotIn("B: secret exam answers", texts)

    # ── end-to-end retrieval (embedding mocked, no provider call) ─────────

    def test_retrieval_never_returns_foreign_chunks(self):
        from ai_engine.services.rag_tutor_service import RAGTutorService

        self._make_chunk(self.tenant, "A content")
        self._make_chunk(self.tenant_b, "B content")

        with tenant_context(self.tenant):
            service = RAGTutorService(tenant=self.tenant)
            with patch.object(
                service, "_expand_query", return_value=["q"]
            ), patch.object(service, "_embed_query", return_value=_dummy_vector()):
                results = service.retrieve_relevant_chunks("anything")

        texts = [r["chunk"].text for r in results]
        self.assertNotIn("B content", texts)
