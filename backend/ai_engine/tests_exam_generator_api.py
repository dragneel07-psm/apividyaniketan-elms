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

User = get_user_model()


class ExamGeneratorApiTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Exam Generator School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        with tenant_context(self.tenant):
            self.teacher = User.objects.create_user(
                username="exam_teacher",
                email="exam_teacher@example.com",
                password="ExamTeacher@123",
                role="teacher",
                tenant=self.tenant,
            )
            self.student = User.objects.create_user(
                username="exam_student",
                email="exam_student@example.com",
                password="ExamStudent@123",
                role="student",
                tenant=self.tenant,
            )
            self.academic_class = AcademicClass.objects.create(name="Grade 10")
            self.subject = Subject.objects.create(
                name="Science",
                academic_class=self.academic_class,
                is_active=True,
            )
            self.chapter_1 = Chapter.objects.create(
                subject=self.subject,
                title="Motion",
                description="Motion basics",
                order=1,
                is_published=True,
            )
            self.chapter_2 = Chapter.objects.create(
                subject=self.subject,
                title="Force",
                description="Force and mass",
                order=2,
                is_published=True,
            )
            self.lesson = Lesson.objects.create(
                chapter=self.chapter_1,
                title="Newton Laws",
                content_type="text",
                content="Newton's laws of motion.",
                order=1,
                is_published=True,
                duration_minutes=40,
            )
            ContentChunk.objects.create(
                tenant=self.tenant,
                source_type="chapter",
                source_id=str(self.chapter_1.id),
                text="Chapter on motion includes speed, velocity, and acceleration.",
                metadata={"chapter_id": self.chapter_1.id},
                embedding=[0.01]
                * max(1, int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536))),
            )

    def _client_for(self, user):
        client = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        client.force_authenticate(user=user)
        return client

    def test_student_cannot_generate_exam_paper(self):
        client = self._client_for(self.student)
        response = client.post(
            "/api/ai/exams/generate/",
            {
                "class_id": str(self.academic_class.id),
                "subject_id": str(self.subject.id),
                "units": [str(self.chapter_1.id)],
                "marks": 100,
                "difficulty_mix": {"easy": 30, "medium": 50, "hard": 20},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch(
        "ai_engine.services.exam_generator_service.ExamPaperGeneratorService._call_model"
    )
    def test_teacher_generates_exam_paper_and_can_fetch_artifact(self, mock_call_model):
        mock_call_model.return_value = (
            (
                '{"paper":{"title":"Grade 10 Science Terminal Exam","total_marks":100,'
                '"sections":['
                '{"title":"Section A","instructions":"Answer all questions","marks":40,"questions":['
                '{"type":"mcq","prompt":"What is velocity?","marks":10,"options":["Speed with direction","Distance","Time","Mass"]},'
                '{"type":"short_answer","prompt":"State Newton first law.","marks":10},'
                '{"type":"short_answer","prompt":"Define acceleration.","marks":10},'
                '{"type":"mcq","prompt":"SI unit of force?","marks":10,"options":["Newton","Joule","Watt","Pascal"]}'
                "]},"
                '{"title":"Section B","instructions":"Attempt all","marks":60,"questions":['
                '{"type":"long_answer","prompt":"Derive F=ma with example.","marks":20},'
                '{"type":"long_answer","prompt":"Differentiate scalar and vector.","marks":20},'
                '{"type":"long_answer","prompt":"Explain momentum conservation.","marks":20}'
                "]}"
                "]},"
                '"answer_key":{"1":"Speed with direction","2":"An object remains at rest/uniform motion unless force acts","3":"Rate of change of velocity","4":"Newton"},'
                '"marking_scheme":{"guidelines":["Award method marks","Award stepwise marks"],"difficulty_mix":{"easy":30,"medium":50,"hard":20}}}'
            ),
            {"model": "gpt-4o-mini", "prompt_tokens": 120, "completion_tokens": 260},
        )

        client = self._client_for(self.teacher)
        response = client.post(
            "/api/ai/exams/generate/",
            {
                "class_id": str(self.academic_class.id),
                "subject_id": str(self.subject.id),
                "units": [str(self.chapter_1.id), str(self.chapter_2.id)],
                "marks": 100,
                "difficulty_mix": {"easy": 30, "medium": 50, "hard": 20},
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("paper", response.data)
        self.assertIn("answer_key", response.data)
        self.assertIn("marking_scheme", response.data)
        self.assertEqual(response.data["paper"]["total_marks"], 100)

        artifact = AiGeneratedArtifact.objects.filter(
            tenant=self.tenant,
            artifact_type="exam_paper",
            source_type="subject",
            source_id=str(self.subject.id),
        ).first()
        self.assertIsNotNone(artifact)

        list_response = client.get(
            f"/api/ai/artifacts/?artifact_type=exam_paper&source_type=subject&source_id={self.subject.id}&limit=5"
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["artifact_type"], "exam_paper")
