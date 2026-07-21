# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from io import StringIO
from unittest.mock import patch

from django.conf import settings
from django.core.management import call_command
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context

from academic.models import AcademicClass, Chapter, Lesson, LessonMaterial, Subject
from ai_engine.models import ContentChunk


class AIIndexContentCommandTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "AI Index Command School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        with tenant_context(self.tenant):
            academic_class = AcademicClass.objects.create(name="Grade Index 9")
            subject = Subject.objects.create(
                name="Science Index", academic_class=academic_class, is_active=True
            )
            chapter = Chapter.objects.create(
                subject=subject,
                title="Motion",
                description="Motion basics",
                order=1,
                is_published=True,
            )
            self.lesson = Lesson.objects.create(
                chapter=chapter,
                title="Newton's Laws",
                content_type="text",
                content="Force equals mass times acceleration.",
                order=1,
                is_published=True,
                duration_minutes=40,
            )
            LessonMaterial.objects.create(
                lesson=self.lesson,
                title="Class handout",
                link="https://example.com/handout",
                material_type="link",
            )

    def _mock_embeddings(self, chunks):
        dimensions = max(1, int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536)))
        return ([[0.01] * dimensions for _ in chunks], "stub-mock")

    @patch("ai_engine.services.indexing_service._generate_embeddings")
    def test_command_indexes_and_is_idempotent_for_same_source(
        self, mock_generate_embeddings
    ):
        mock_generate_embeddings.side_effect = self._mock_embeddings

        output = StringIO()
        call_command("ai_index_content", tenant=self.tenant.schema_name, stdout=output)

        with tenant_context(self.tenant):
            lesson_chunks_first = ContentChunk.objects.filter(
                tenant=self.tenant,
                source_type="lesson",
                source_id=str(self.lesson.id),
            ).count()
            self.assertGreater(lesson_chunks_first, 0)

        output_second = StringIO()
        call_command(
            "ai_index_content", tenant=self.tenant.schema_name, stdout=output_second
        )

        with tenant_context(self.tenant):
            lesson_chunks_second = ContentChunk.objects.filter(
                tenant=self.tenant,
                source_type="lesson",
                source_id=str(self.lesson.id),
            ).count()
            self.assertEqual(lesson_chunks_first, lesson_chunks_second)

        self.assertIn("provider=stub-mock", output.getvalue())
