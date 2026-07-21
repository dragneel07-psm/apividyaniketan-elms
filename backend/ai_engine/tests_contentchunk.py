# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.conf import settings
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context

from ai_engine.models import ContentChunk


class ContentChunkModelTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Content Chunk School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def test_can_create_and_query_content_chunk(self):
        dimensions = int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536))
        embedding = [0.01] * max(1, dimensions)

        with tenant_context(self.tenant):
            chunk = ContentChunk.objects.create(
                tenant=self.tenant,
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
