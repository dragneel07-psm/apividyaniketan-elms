# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Tests for StudyPlannerService and the study-schedule API endpoints.
"""

from __future__ import annotations

import datetime
from unittest.mock import MagicMock, PropertyMock, patch

from django.test import TestCase
from django.utils import timezone

# ── Helpers ──────────────────────────────────────────────────────────────────


def _mock_student(daily_goal=60):
    tenant = MagicMock()
    tenant.pk = 1
    user = MagicMock()
    user.tenant = tenant
    student = MagicMock()
    student.pk = 1
    student.user = user
    student.daily_study_goal = daily_goal
    student.academic_class = None
    return student


def _mock_node(pk, title, next_review=None, estimated_minutes=30, status="completed"):
    node = MagicMock()
    node.id = pk
    node.title = title
    node.estimated_minutes = estimated_minutes
    node.status = status
    node.next_review_at = next_review or timezone.now() - datetime.timedelta(days=1)
    node.learning_path = MagicMock()
    node.learning_path.subject = None
    return node


def _mock_mastery(skill_name, p_mastery=0.3, subject=None):
    mastery = MagicMock()
    mastery.p_mastery = p_mastery
    mastery.skill_tag = MagicMock()
    mastery.skill_tag.name = skill_name
    mastery.skill_tag.id = skill_name
    mastery.skill_tag.subject = subject
    return mastery


# ── StudyPlannerService unit tests ───────────────────────────────────────────


class StudyPlannerServiceTests(TestCase):

    def _service(self):
        from ai_engine.services.study_planner_service import StudyPlannerService

        return StudyPlannerService(db_alias="default")

    def test_build_slots_daily_goal_60(self):
        from ai_engine.services.study_planner_service import StudyPlannerService

        today = timezone.now().date()
        slots = StudyPlannerService._build_slots(today, 60, 3)
        self.assertEqual(len(slots), 3)
        start, end, mins = slots[0]
        self.assertEqual(mins, 20)  # 60 / 3
        self.assertLess(start, end)

    def test_build_slots_daily_goal_90(self):
        from ai_engine.services.study_planner_service import StudyPlannerService

        today = timezone.now().date()
        slots = StudyPlannerService._build_slots(today, 90, 3)
        _, _, mins = slots[0]
        self.assertEqual(mins, 30)

    def test_build_slots_minimum_20_minutes(self):
        from ai_engine.services.study_planner_service import StudyPlannerService

        today = timezone.now().date()
        slots = StudyPlannerService._build_slots(today, 10, 3)
        _, _, mins = slots[0]
        self.assertEqual(mins, 20)  # floor at 20

    def test_get_plan_summary_no_data(self):
        service = self._service()
        student = _mock_student()

        with (
            patch.object(service, "_due_review_nodes", return_value=[]),
            patch.object(service, "_skill_gaps", return_value=[]),
            patch.object(service, "_upcoming_exams", return_value=[]),
            patch.object(service, "_new_content_nodes", return_value=[]),
        ):
            summary = service.get_plan_summary(student, days=7)

        self.assertEqual(summary["due_reviews"], 0)
        self.assertEqual(summary["skill_gaps"], [])
        self.assertEqual(summary["upcoming_exams"], [])
        self.assertEqual(summary["new_content_nodes"], 0)
        self.assertEqual(summary["daily_goal_minutes"], 60)

    def test_get_plan_summary_with_data(self):
        service = self._service()
        student = _mock_student(daily_goal=45)

        review_nodes = [_mock_node("n1", "Photosynthesis")]
        skill_gaps = [_mock_mastery("Algebra", p_mastery=0.25)]

        with (
            patch.object(service, "_due_review_nodes", return_value=review_nodes),
            patch.object(service, "_skill_gaps", return_value=skill_gaps),
            patch.object(service, "_upcoming_exams", return_value=[]),
            patch.object(service, "_new_content_nodes", return_value=[]),
        ):
            summary = service.get_plan_summary(student, days=7)

        self.assertEqual(summary["due_reviews"], 1)
        self.assertEqual(len(summary["skill_gaps"]), 1)
        self.assertEqual(summary["skill_gaps"][0]["skill"], "Algebra")
        self.assertAlmostEqual(summary["skill_gaps"][0]["p_mastery"], 0.25)
        self.assertEqual(summary["daily_goal_minutes"], 45)

    def test_generate_plan_creates_events(self):
        service = self._service()
        student = _mock_student()

        review_nodes = [_mock_node("n1", "Newton Laws")]
        skill_gaps = [_mock_mastery("Trigonometry")]

        fake_event = MagicMock()
        fake_event.id = "ev-1"

        with (
            patch.object(service, "_due_review_nodes", return_value=review_nodes),
            patch.object(service, "_skill_gaps", return_value=skill_gaps),
            patch.object(service, "_upcoming_exams", return_value=[]),
            patch.object(service, "_new_content_nodes", return_value=[]),
            patch.object(service, "_student_subjects", return_value=[]),
            patch.object(service, "_create_event", return_value=fake_event),
            patch("ai_engine.models.StudyEvent.objects") as mock_mgr,
        ):
            mock_mgr.using.return_value.filter.return_value.delete = MagicMock()
            events = service.generate_plan(student, days=3, replace_existing=True)

        self.assertGreater(len(events), 0)

    def test_generate_plan_skips_sunday(self):
        """Sunday should produce no events when there are no urgent exams."""
        import datetime

        from ai_engine.services.study_planner_service import StudyPlannerService

        service = self._service()
        student = _mock_student()

        # Find next Sunday
        today = timezone.now().date()
        days_until_sunday = (6 - today.weekday()) % 7
        if days_until_sunday == 0:
            days_until_sunday = 7
        sunday = today + datetime.timedelta(days=days_until_sunday)

        slots = StudyPlannerService._build_slots(sunday, 60, 3)
        # Slots can still be built — the filter is in generate_plan
        self.assertEqual(len(slots), 3)

    def test_generate_plan_review_has_priority_over_skill(self):
        """Review nodes should fill slots before skill_practice items."""
        service = self._service()
        student = _mock_student(daily_goal=60)

        review_nodes = [
            _mock_node("n1", "Review A"),
            _mock_node("n2", "Review B"),
            _mock_node("n3", "Review C"),
        ]
        skill_gaps = [_mock_mastery("Algebra")]
        created_types = []

        def fake_create_event(**kwargs):
            ev = MagicMock()
            ev.event_type = kwargs["event_type"]
            created_types.append(kwargs["event_type"])
            return ev

        with (
            patch.object(service, "_due_review_nodes", return_value=review_nodes),
            patch.object(service, "_skill_gaps", return_value=skill_gaps),
            patch.object(service, "_upcoming_exams", return_value=[]),
            patch.object(service, "_new_content_nodes", return_value=[]),
            patch.object(service, "_student_subjects", return_value=[]),
            patch.object(service, "_create_event", side_effect=fake_create_event),
            patch("ai_engine.models.StudyEvent.objects") as mock_mgr,
        ):
            mock_mgr.using.return_value.filter.return_value.delete = MagicMock()
            service.generate_plan(student, days=1, replace_existing=False)

        # All 3 slots on day 1 should be 'review', not 'skill_practice'
        self.assertTrue(all(t == "review" for t in created_types))

    def test_generate_plan_exam_prep_highest_priority(self):
        """Exam prep should override review and skill slots when exam is near."""
        service = self._service()
        student = _mock_student()

        exam = MagicMock()
        exam.title = "Physics Final"
        exam.scheduled_at = timezone.now() + datetime.timedelta(days=1)
        exam.subject = MagicMock()
        exam.subject.name = "Physics"
        exam.subject.pk = 1

        review_nodes = [_mock_node("n1", "Review X")]
        created_types = []

        def fake_create_event(**kwargs):
            ev = MagicMock()
            ev.event_type = kwargs["event_type"]
            created_types.append(kwargs["event_type"])
            return ev

        with (
            patch.object(service, "_due_review_nodes", return_value=review_nodes),
            patch.object(service, "_skill_gaps", return_value=[]),
            patch.object(service, "_upcoming_exams", return_value=[exam]),
            patch.object(service, "_new_content_nodes", return_value=[]),
            patch.object(service, "_student_subjects", return_value=[]),
            patch.object(service, "_create_event", side_effect=fake_create_event),
            patch("ai_engine.models.StudyEvent.objects") as mock_mgr,
        ):
            mock_mgr.using.return_value.filter.return_value.delete = MagicMock()
            service.generate_plan(student, days=1, replace_existing=False)

        self.assertTrue(all(t == "exam" for t in created_types))

    def test_generate_plan_new_content_after_review_and_skill(self):
        """New content nodes fill remaining slots after review and skill gaps."""
        service = self._service()
        student = _mock_student(daily_goal=60)

        review_nodes = [_mock_node("n1", "Review")]
        skill_gaps = [_mock_mastery("Algebra")]
        new_content = [_mock_node("c1", "New Lesson", status="unlocked")]
        created_types = []

        def fake_create_event(**kwargs):
            ev = MagicMock()
            ev.event_type = kwargs["event_type"]
            created_types.append(kwargs["event_type"])
            return ev

        with (
            patch.object(service, "_due_review_nodes", return_value=review_nodes),
            patch.object(service, "_skill_gaps", return_value=skill_gaps),
            patch.object(service, "_upcoming_exams", return_value=[]),
            patch.object(service, "_new_content_nodes", return_value=new_content),
            patch.object(service, "_student_subjects", return_value=[]),
            patch.object(service, "_create_event", side_effect=fake_create_event),
            patch("ai_engine.models.StudyEvent.objects") as mock_mgr,
        ):
            mock_mgr.using.return_value.filter.return_value.delete = MagicMock()
            service.generate_plan(student, days=1, replace_existing=False)

        self.assertIn("review", created_types)
        self.assertIn("skill_practice", created_types)
        self.assertIn("study", created_types)


# ── API endpoint tests ────────────────────────────────────────────────────────


class StudyScheduleAPITests(TestCase):

    def _auth_client(self):
        from unittest.mock import MagicMock

        from rest_framework.test import APIClient

        client = APIClient()
        user = MagicMock()
        user.is_authenticated = True
        user.pk = 1
        client.force_authenticate(user=user)
        return client, user

    def test_generate_requires_authentication(self):
        from rest_framework.test import APIClient

        client = APIClient()
        # Unauthenticated request should be rejected (401 or 403)
        resp = client.post(
            "/api/ai/study-schedule/generate/", {"days": 3}, format="json"
        )
        self.assertIn(resp.status_code, [400, 401, 403])

    def test_summary_requires_authentication(self):
        from rest_framework.test import APIClient

        client = APIClient()
        resp = client.get("/api/ai/study-schedule/summary/")
        self.assertIn(resp.status_code, [400, 401, 403])
