# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Tests for ProgressReportService and the progress-report API endpoints.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone

# ── Helpers ──────────────────────────────────────────────────────────────────


def _mock_tenant():
    t = MagicMock()
    t.pk = 1
    return t


def _mock_student(tenant=None):
    t = tenant or _mock_tenant()
    user = MagicMock()
    user.pk = 1
    user.email = "student@school.com"
    user.get_full_name.return_value = "Alice Test"
    user.username = "alice"
    s = MagicMock()
    s.student_id = "stu-1"
    s.pk = "stu-1"
    s.user = user
    s.tenant = t
    s.daily_study_goal = 60
    s.academic_class = None
    s.current_streak = 5
    s.focus_score = 75
    s._state = MagicMock()
    s._state.db = "default"
    return s


def _service(tenant=None):
    from ai_engine.services.progress_report_service import ProgressReportService

    return ProgressReportService(tenant=tenant or _mock_tenant(), db_alias="default")


def _fake_metrics():
    """Return a metrics dict matching the shape from _collect_metrics."""
    return {
        "student_name": "Alice Test",
        "class_name": "Grade 10A",
        "avg_score": 72.0,
        "subject_averages": {"Math": 80.0, "Physics": 55.0},
        "strengths": ["Math"],
        "weak_subjects": ["Physics"],
        "attendance_rate": 90.0,
        "sm2": {
            "reviews_completed": 12,
            "avg_quality": 3.8,
            "avg_ease_factor": 2.4,
            "due_reviews": 3,
        },
        "bkt": {
            "skill_gaps": [{"skill": "Calculus", "mastery_pct": 32.0}],
            "skill_strengths": [{"skill": "Algebra", "mastery_pct": 88.0}],
            "total_skills_tracked": 8,
        },
        "tutor": {"conversations_this_period": 4, "questions_asked": 18},
        "budget_used_today_pct": 45.0,
        "streak_days": 5,
        "focus_score": 75,
        "daily_goal_minutes": 60,
        "plan_completion_pct": 60.0,
    }


# ── ProgressReportService unit tests ─────────────────────────────────────────


class ProgressReportServiceTests(TestCase):

    def test_generate_returns_student_report_dict(self):
        """generate() returns a dict with 'report' containing report_type."""
        service = _service()
        student = _mock_student()
        fake_ai = {"summary": "Great work!", "strengths": ["Algebra"]}

        with (
            patch.object(service, "_collect_metrics", return_value=_fake_metrics()),
            patch.object(service, "_generate_ai_section", return_value=fake_ai),
        ):
            result = service.generate(student, report_type="student", save=False)

        self.assertIn("report", result)
        self.assertEqual(result["report"]["report_type"], "student")
        self.assertIn("metrics", result["report"])
        self.assertIn("ai", result["report"])
        self.assertFalse(result["cached"])

    def test_generate_parent_report(self):
        """generate() for parent type includes report_type=parent."""
        service = _service()
        student = _mock_student()
        fake_ai = {
            "summary": "Bob is making steady progress.",
            "areas_to_watch": ["Science"],
            "home_support_tips": ["Encourage daily reading"],
        }

        with (
            patch.object(service, "_collect_metrics", return_value=_fake_metrics()),
            patch.object(service, "_generate_ai_section", return_value=fake_ai),
        ):
            result = service.generate(student, report_type="parent", save=False)

        self.assertEqual(result["report"]["report_type"], "parent")

    def test_generate_teacher_report(self):
        """generate() for teacher type includes report_type=teacher."""
        service = _service()
        student = _mock_student()
        fake_ai = {
            "risk_level": "high",
            "key_concerns": ["Low attendance"],
            "suggested_interventions": ["One-on-one tutoring"],
        }

        with (
            patch.object(service, "_collect_metrics", return_value=_fake_metrics()),
            patch.object(service, "_generate_ai_section", return_value=fake_ai),
        ):
            result = service.generate(student, report_type="teacher", save=False)

        self.assertEqual(result["report"]["report_type"], "teacher")

    def test_get_or_generate_uses_cache(self):
        """get_or_generate returns cached report within 7-day window."""
        service = _service()
        student = _mock_student()

        cached_report_data = {
            "report_type": "student",
            "student_name": "Alice",
            "class_name": "Grade 10",
            "generated_at": timezone.now().isoformat(),
            "metrics": _fake_metrics(),
            "ai": {"summary": "Cached"},
        }
        mock_report = MagicMock()
        mock_report.report_data = cached_report_data
        mock_report.generated_at = timezone.now()

        with patch("ai_engine.models.StudentAIReport.objects") as mock_mgr:
            mock_filter = mock_mgr.using.return_value.filter.return_value
            mock_filter.order_by.return_value.first.return_value = mock_report
            result = service.get_or_generate(
                student, report_type="student", force=False
            )

        self.assertTrue(result["cached"])
        self.assertEqual(result["report"]["ai"]["summary"], "Cached")

    def test_get_or_generate_force_bypasses_cache(self):
        """get_or_generate with force=True always generates fresh."""
        service = _service()
        student = _mock_student()

        fake_result = {
            "cached": False,
            "report": {
                "report_type": "student",
                "metrics": _fake_metrics(),
                "ai": {"summary": "Fresh"},
            },
            "generated_at": timezone.now().isoformat(),
        }

        with patch.object(service, "generate", return_value=fake_result) as mock_gen:
            result = service.get_or_generate(student, report_type="student", force=True)

        mock_gen.assert_called_once()
        self.assertEqual(result["report"]["ai"]["summary"], "Fresh")

    def test_fallback_section_student(self):
        """_fallback_section returns valid structure for student type."""
        service = _service()
        fb = service._fallback_section(_fake_metrics(), "student")
        self.assertIn("summary", fb)
        self.assertIn("strengths", fb)

    def test_fallback_section_teacher(self):
        """_fallback_section returns risk_level for teacher type."""
        service = _service()
        fb = service._fallback_section(_fake_metrics(), "teacher")
        self.assertIn("risk_level", fb)

    def test_fallback_section_parent(self):
        """_fallback_section returns home_tips for parent type."""
        service = _service()
        fb = service._fallback_section(_fake_metrics(), "parent")
        self.assertIn("overview", fb)

    def test_list_history_returns_list(self):
        """list_history returns a list of past report dicts."""
        service = _service()
        student = _mock_student()

        with patch.object(
            service, "list_history", return_value=[{"report_id": "rpt-1"}]
        ) as mock_lh:
            history = service.list_history(student, report_type="student", limit=5)

        self.assertIsInstance(history, list)

    def test_generate_calls_collect_metrics(self):
        """generate() always calls _collect_metrics once."""
        service = _service()
        student = _mock_student()

        with (
            patch.object(
                service, "_collect_metrics", return_value=_fake_metrics()
            ) as mock_cm,
            patch.object(service, "_generate_ai_section", return_value={}),
        ):
            service.generate(student, report_type="student", save=False)

        mock_cm.assert_called_once_with(student)

    def test_extract_json_plain(self):
        """_extract_json parses plain JSON string."""
        from ai_engine.services.progress_report_service import _extract_json

        result = _extract_json('{"summary": "ok", "strengths": []}')
        self.assertEqual(result["summary"], "ok")

    def test_extract_json_fenced(self):
        """_extract_json strips markdown code fences."""
        from ai_engine.services.progress_report_service import _extract_json

        fenced = '```json\n{"summary": "fenced"}\n```'
        result = _extract_json(fenced)
        self.assertEqual(result["summary"], "fenced")

    def test_extract_json_empty(self):
        """_extract_json returns empty dict for empty/None input."""
        from ai_engine.services.progress_report_service import _extract_json

        self.assertEqual(_extract_json(""), {})
        self.assertEqual(_extract_json(None), {})

    def test_extract_json_invalid_falls_back(self):
        """_extract_json returns {} for non-JSON input."""
        from ai_engine.services.progress_report_service import _extract_json

        self.assertEqual(_extract_json("not json at all"), {})


# ── API endpoint tests ────────────────────────────────────────────────────────


class ProgressReportAPITests(TestCase):

    def test_my_report_requires_authentication(self):
        from rest_framework.test import APIClient

        client = APIClient()
        resp = client.get("/api/ai/reports/me/")
        self.assertIn(resp.status_code, [400, 401, 403])

    def test_generate_report_requires_authentication(self):
        from rest_framework.test import APIClient

        client = APIClient()
        resp = client.post("/api/ai/reports/me/generate/", {}, format="json")
        self.assertIn(resp.status_code, [400, 401, 403])

    def test_history_requires_authentication(self):
        from rest_framework.test import APIClient

        client = APIClient()
        resp = client.get("/api/ai/reports/me/history/")
        self.assertIn(resp.status_code, [400, 401, 403])

    def test_class_report_requires_authentication(self):
        from rest_framework.test import APIClient

        client = APIClient()
        resp = client.get("/api/ai/reports/class/1/")
        self.assertIn(resp.status_code, [400, 401, 403])
