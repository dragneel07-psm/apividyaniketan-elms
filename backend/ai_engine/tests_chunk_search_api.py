# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context
from rest_framework import status
from rest_framework.test import APIClient

from ai_engine.models import ContentChunk

User = get_user_model()


class ContentChunkSearchApiTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Chunk Search School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        dimensions = max(1, int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536)))
        lesson_vector = [0.0] * dimensions
        chapter_vector = [0.0] * dimensions
        lesson_vector[0] = 1.0
        chapter_vector[1] = 1.0

        with tenant_context(self.tenant):
            self.user = User.objects.create_user(
                username="chunk_search_user",
                email="chunk_search@example.com",
                password="ChunkSearch@123",
                role="teacher",
                tenant=self.tenant,
            )
            ContentChunk.objects.create(
                tenant=self.tenant,
                source_type="lesson",
                source_id="lesson-101",
                text="Newton first law explains inertia.",
                metadata={"lesson_id": 101},
                embedding=lesson_vector,
            )
            ContentChunk.objects.create(
                tenant=self.tenant,
                source_type="chapter",
                source_id="chapter-5",
                text="Photosynthesis occurs in chloroplast.",
                metadata={"chapter_id": 5},
                embedding=chapter_vector,
            )

        self.client = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        self.client.force_authenticate(user=self.user)

    @patch("ai_engine.services.rag_tutor_service.RAGTutorService._embed_query")
    def test_search_returns_similar_chunks(self, mock_embed_query):
        dimensions = max(1, int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536)))
        vector = [0.0] * dimensions
        vector[0] = 1.0
        mock_embed_query.return_value = vector

        response = self.client.post(
            "/api/ai/chunks/search/",
            {
                "query": "What is inertia?",
                "top_k": 3,
                "min_similarity": 0.1,
                "source_type": "lesson",
            },
            format="json",
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("count"), 1)

        first = response.data["results"][0]
        self.assertEqual(first["source_type"], "lesson")
        self.assertEqual(first["source_id"], "lesson-101")
        self.assertGreater(first["similarity"], 0)
