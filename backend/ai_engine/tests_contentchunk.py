# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.conf import settings
from django.test import TestCase

from ai_engine.models import ContentChunk


class ContentChunkModelTests(TestCase):
    def test_can_create_and_query_content_chunk(self):
        dimensions = int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536))
        embedding = [0.01] * max(1, dimensions)

        chunk = ContentChunk.objects.create(
            source_type="lesson",
            source_id="lesson-1",
            text="This is a lesson content chunk.",
            metadata={"chunk_index": 0},
            embedding=embedding,
        )

        fetched = ContentChunk.objects.filter(
            source_type="lesson", source_id="lesson-1"
        ).first()

        self.assertIsNotNone(fetched)
        self.assertEqual(str(fetched.id), str(chunk.id))
        self.assertEqual(fetched.metadata.get("chunk_index"), 0)
