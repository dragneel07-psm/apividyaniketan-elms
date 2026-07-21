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

from academic.models import AcademicClass, Assessment, Chapter, Lesson, Subject
from academic.models.question import Question
from ai_engine.models import ContentChunk

User = get_user_model()


class QuizGeneratorApiTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Quiz Generator School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        with tenant_context(self.tenant):
            self.teacher = User.objects.create_user(
                username="quiz_teacher",
                email="quiz_teacher@example.com",
                password="QuizTeacher@123",
                role="teacher",
                tenant=self.tenant,
            )
            self.student = User.objects.create_user(
                username="quiz_student",
                email="quiz_student@example.com",
                password="QuizStudent@123",
                role="student",
                tenant=self.tenant,
            )
            academic_class = AcademicClass.objects.create(name="Grade 10")
            subject = Subject.objects.create(
                name="Science", academic_class=academic_class, is_active=True
            )
            chapter = Chapter.objects.create(
                subject=subject,
                title="Motion",
                description="Basics of motion",
                order=1,
                is_published=True,
            )
            self.lesson = Lesson.objects.create(
                chapter=chapter,
                title="Newton Laws",
                content_type="text",
                content="Force, mass, acceleration and inertia.",
                order=1,
                is_published=True,
                duration_minutes=40,
            )
            ContentChunk.objects.create(
                tenant=self.tenant,
                source_type="lesson",
                source_id=str(self.lesson.id),
                text="Newton's first law describes inertia. Newton's second law links force, mass and acceleration.",
                metadata={"lesson_id": self.lesson.id},
                embedding=[0.01]
                * max(1, int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536))),
            )

    def _client_for(self, user):
        client = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        client.force_authenticate(user=user)
        return client

    def test_role_guard_blocks_student(self):
        client = self._client_for(self.student)
        response = client.post(
            "/api/ai/quizzes/generate/",
            {
                "source_type": "lesson",
                "source_id": str(self.lesson.id),
                "difficulty": "medium",
                "count": 3,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch(
        "ai_engine.services.quiz_generator_service.QuizGeneratorService._retrieved_snippets"
    )
    @patch("ai_engine.services.quiz_generator_service.QuizGeneratorService._call_model")
    def test_teacher_can_generate_quiz_and_records_are_created(
        self, mock_call_model, mock_retrieved_snippets
    ):
        mock_retrieved_snippets.return_value = ["Newton law context chunk"]
        mock_call_model.return_value = (
            (
                '{"questions":['
                '{"type":"mcq","prompt":"What is inertia?","options":["Resistance to change","Speed","Mass","Heat"],"correct_index":0,"explanation":"Definition of inertia"},'
                '{"type":"mcq","prompt":"F=ma means?","options":["Force=mass*acceleration","Force=mass+acceleration","Force=mass/acceleration","None"],"correct_index":0,"explanation":"Second law"},'
                '{"type":"mcq","prompt":"Unit of force?","options":["Newton","Joule","Watt","Pascal"],"correct_index":0,"explanation":"SI unit"}'
                "]}"
            ),
            {"model": "gpt-4o-mini", "prompt_tokens": 50, "completion_tokens": 80},
        )

        client = self._client_for(self.teacher)
        response = client.post(
            "/api/ai/quizzes/generate/",
            {
                "source_type": "lesson",
                "source_id": str(self.lesson.id),
                "difficulty": "medium",
                "count": 3,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("quiz_id"))
        self.assertEqual(len(response.data.get("questions", [])), 3)

        quiz = Assessment.objects.filter(assessment_id=response.data["quiz_id"]).first()
        self.assertIsNotNone(quiz)
        self.assertEqual(quiz.type, "quiz")
        self.assertEqual(quiz.total_marks, 3)
        self.assertEqual(Question.objects.filter(assessment=quiz).count(), 3)
