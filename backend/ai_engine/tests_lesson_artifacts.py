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

from academic.models import AcademicClass, Chapter, Lesson, Subject
from ai_engine.models import AiGeneratedArtifact, ContentChunk
from ai_engine.serializers import LessonArtifactResponseSerializer

User = get_user_model()


class LessonArtifactSerializerTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Lesson Artifact Serializer School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def test_response_serializer_validates_shape(self):
        serializer = LessonArtifactResponseSerializer(
            data={
                "summary": "Newton's laws summary",
                "bullets": ["Law 1", "Law 2"],
                "key_terms": ["inertia", "force"],
                "practice_questions": ["Explain inertia."],
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)


class LessonArtifactEndpointTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Lesson Artifact API School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        with tenant_context(self.tenant):
            self.user = User.objects.create_user(
                username="artifact_user",
                email="artifact_user@example.com",
                password="Artifact@123",
                role="student",
                tenant=self.tenant,
            )
            academic_class = AcademicClass.objects.create(name="Grade 9")
            subject = Subject.objects.create(
                name="Science", academic_class=academic_class, is_active=True
            )
            chapter = Chapter.objects.create(
                subject=subject, title="Motion", order=1, is_published=True
            )
            self.lesson = Lesson.objects.create(
                chapter=chapter,
                title="Newton's Laws",
                content_type="text",
                content="Force equals mass multiplied by acceleration.",
                order=1,
                is_published=True,
                duration_minutes=40,
            )
            ContentChunk.objects.create(
                tenant=self.tenant,
                source_type="lesson",
                source_id=str(self.lesson.id),
                text="Newton's first law says objects keep their state unless net external force acts.",
                metadata={"lesson_id": self.lesson.id},
                embedding=[0.01]
                * max(1, int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536))),
            )

        self.client = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        self.client.force_authenticate(user=self.user)

    @patch("ai_engine.services.lesson_summary_service.LessonSummaryService._call_model")
    def test_summarize_endpoint_returns_expected_payload_and_caches(
        self, mock_call_model
    ):
        mock_call_model.return_value = (
            '{"summary":"Newton laws summary","bullets":["Law 1","Law 2"],"key_terms":["force","inertia"],"practice_questions":["Define inertia."]}',
            {"model": "gpt-4o-mini", "prompt_tokens": 30, "completion_tokens": 15},
        )
        response = self.client.post(
            f"/api/ai/lessons/{self.lesson.id}/summarize/?lang=en", format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"], "Newton laws summary")
        self.assertEqual(response.data["bullets"], ["Law 1", "Law 2"])
        self.assertEqual(response.data["key_terms"], ["force", "inertia"])
        self.assertEqual(response.data["practice_questions"], ["Define inertia."])

        artifact = AiGeneratedArtifact.objects.filter(
            tenant=self.tenant,
            artifact_type="summary",
            source_type="lesson",
            source_id=str(self.lesson.id),
            lang="en",
        ).first()
        self.assertIsNotNone(artifact)

    def test_invalid_lang_returns_400(self):
        response = self.client.post(
            f"/api/ai/lessons/{self.lesson.id}/exam_notes/?lang=fr", format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
