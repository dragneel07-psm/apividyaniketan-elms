# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import (
    AcademicClass,
    Assessment,
    Chapter,
    Lesson,
    Result,
    Student,
    Subject,
    Teacher,
)
from academic.models.submission import Submission
from ai_engine.models import AIGradingDraft, GradingRubric

User = get_user_model()


class AssistedGradingApiTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "AI Grading School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        with tenant_context(self.tenant):
            self.teacher_user = User.objects.create_user(
                username="grading_teacher",
                email="grading_teacher@example.com",
                password="Teacher@123",
                role="teacher",
                tenant=self.tenant,
                first_name="Grade",
                last_name="Teacher",
            )
            self.admin_user = User.objects.create_user(
                username="grading_admin",
                email="grading_admin@example.com",
                password="Admin@123",
                role="admin",
                tenant=self.tenant,
            )
            self.student_user = User.objects.create_user(
                username="grading_student",
                email="grading_student@example.com",
                password="Student@123",
                role="student",
                tenant=self.tenant,
                first_name="Grade",
                last_name="Student",
            )
            self.academic_class = AcademicClass.objects.create(name="Grade 10")
            self.teacher_profile = Teacher.objects.create(user=self.teacher_user)
            self.teacher_profile.assigned_classes.add(self.academic_class)
            self.student_profile = Student.objects.create(
                user=self.student_user, academic_class=self.academic_class
            )

            self.subject = Subject.objects.create(
                name="Science",
                academic_class=self.academic_class,
                is_active=True,
                teacher=self.teacher_profile,
            )
            chapter = Chapter.objects.create(
                subject=self.subject, title="Motion", order=1, is_published=True
            )
            lesson = Lesson.objects.create(
                chapter=chapter,
                title="Newton Laws",
                content_type="text",
                content="State and explain Newton's second law with example.",
                order=1,
                is_published=True,
                duration_minutes=40,
            )
            self.assessment = Assessment.objects.create(
                subject=self.subject,
                title="Science Descriptive Test",
                type="assignment",
                total_marks=100,
                passing_marks=40,
                duration_minutes=60,
                description="Subjective test",
            )
            lesson.assessment = self.assessment
            lesson.save(update_fields=["assessment"])
            self.submission = Submission.objects.create(
                assessment=self.assessment,
                student=self.student_profile,
                content="Newton second law says force equals mass times acceleration. If mass doubles, force doubles.",
                status="submitted",
                is_graded=False,
            )

    def _client_for(self, user):
        client = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        client.force_authenticate(user=user)
        return client

    def test_student_cannot_create_rubric_or_generate_draft(self):
        student_client = self._client_for(self.student_user)

        rubric_resp = student_client.post(
            "/api/ai/grading/rubrics/",
            {"title": "Essay Rubric", "criteria": [], "total_points": 100},
            format="json",
        )
        self.assertEqual(rubric_resp.status_code, status.HTTP_403_FORBIDDEN)

        draft_resp = student_client.post(
            "/api/ai/grading/grade_submission/",
            {
                "submission_id": str(self.submission.submission_id),
                "rubric_id": "00000000-0000-0000-0000-000000000000",
            },
            format="json",
        )
        self.assertEqual(draft_resp.status_code, status.HTTP_403_FORBIDDEN)

        list_resp = student_client.get(
            f"/api/ai/grading/drafts/?submission_id={self.submission.submission_id}"
        )
        self.assertEqual(list_resp.status_code, status.HTTP_403_FORBIDDEN)

    @patch(
        "ai_engine.services.assisted_grading_service.AssistedGradingService._call_model"
    )
    def test_teacher_can_create_draft_and_approve(self, mock_call_model):
        mock_call_model.return_value = (
            (
                '{"score":78,"feedback":"Good conceptual understanding with minor gaps.",'
                '"criteria_breakdown":['
                '{"criterion":"Accuracy","points_awarded":38,"max_points":50,"feedback":"Mostly correct"},'
                '{"criterion":"Clarity","points_awarded":20,"max_points":25,"feedback":"Clear flow"},'
                '{"criterion":"Completeness","points_awarded":20,"max_points":25,"feedback":"Needs one more example"}'
                "]}",
            ),
            {"model": "gpt-4o-mini", "prompt_tokens": 60, "completion_tokens": 90},
        )

        teacher_client = self._client_for(self.teacher_user)
        rubric_resp = teacher_client.post(
            "/api/ai/grading/rubrics/",
            {
                "title": "Subjective Rubric",
                "total_points": 100,
                "criteria": [
                    {"name": "Accuracy", "max_points": 50},
                    {"name": "Clarity", "max_points": 25},
                    {"name": "Completeness", "max_points": 25},
                ],
            },
            format="json",
        )
        self.assertEqual(rubric_resp.status_code, status.HTTP_201_CREATED)
        rubric_id = rubric_resp.data["id"]
        self.assertTrue(GradingRubric.objects.filter(id=rubric_id).exists())

        draft_resp = teacher_client.post(
            "/api/ai/grading/grade_submission/",
            {
                "submission_id": str(self.submission.submission_id),
                "rubric_id": rubric_id,
            },
            format="json",
        )
        self.assertEqual(draft_resp.status_code, status.HTTP_200_OK)
        self.assertIn("score", draft_resp.data)
        self.assertIn("feedback", draft_resp.data)
        self.assertIn("criteria_breakdown", draft_resp.data)
        draft_id = draft_resp.data["draft_id"]

        draft = AIGradingDraft.objects.get(id=draft_id)
        self.assertEqual(draft.status, "draft")
        self.assertIsNone(draft.approved_by)

        student_client = self._client_for(self.student_user)
        student_draft_view = student_client.get(
            f"/api/ai/grading/drafts/?submission_id={self.submission.submission_id}"
        )
        self.assertEqual(student_draft_view.status_code, status.HTTP_403_FORBIDDEN)

        approve_resp = teacher_client.post(
            "/api/ai/grading/approve_draft/",
            {"draft_id": str(draft_id)},
            format="json",
        )
        self.assertEqual(approve_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_resp.data["status"], "approved")

        draft.refresh_from_db()
        self.submission.refresh_from_db()
        self.assertEqual(draft.status, "approved")
        self.assertIsNotNone(draft.approved_by)
        self.assertEqual(str(draft.approved_by_id), str(self.teacher_user.pk))
        self.assertTrue(self.submission.is_graded)
        self.assertEqual(self.submission.status, "graded")

        result = Result.objects.filter(
            assessment=self.assessment, student=self.student_profile
        ).first()
        self.assertIsNotNone(result)
        self.assertEqual(int(result.score), int(round(draft.score)))
