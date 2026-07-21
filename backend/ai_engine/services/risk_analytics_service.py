# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import json
import re
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from academic.models import (
    Assessment,
    Attendance,
    Lesson,
    LessonProgress,
    Parent,
    Result,
    Student,
    Teacher,
)
from academic.models.submission import Submission
from ai_engine.services.rag_tutor_service import RAGTutorService
from notifications.models import Notification
from notifications.services import NotificationService


class RiskAnalyticsService:
    def __init__(self, *, tenant, user=None):
        self.tenant = tenant
        self.user = user
        self.lookback_days = int(getattr(settings, "AI_RISK_LOOKBACK_DAYS", 30))
        self.inactivity_days = int(getattr(settings, "AI_RISK_INACTIVITY_DAYS", 14))
        self.notification_threshold = int(
            getattr(settings, "AI_AT_RISK_NOTIFICATION_THRESHOLD", 75)
        )
        self.min_score = int(getattr(settings, "AI_AT_RISK_MIN_SCORE", 40))
        self.use_llm_explanations = bool(
            getattr(settings, "AI_RISK_USE_LLM_EXPLANATIONS", False)
        )
        self.rag = RAGTutorService(tenant=tenant)

    @staticmethod
    def _unique(values: list[str]) -> list[str]:
        seen: set[str] = set()
        output: list[str] = []
        for value in values:
            text = str(value or "").strip()
            if not text:
                continue
            key = text.lower()
            if key in seen:
                continue
            seen.add(key)
            output.append(text)
        return output

    @staticmethod
    def _percent(score: float, total: float) -> float:
        if total <= 0:
            return 0.0
        return max(0.0, min(100.0, (float(score) / float(total)) * 100.0))

    @staticmethod
    def _attendance_rate(records: list[Attendance]) -> float:
        if not records:
            return 0.0
        present_like = sum(
            1 for row in records if row.status in {"present", "late", "excused"}
        )
        return (present_like / len(records)) * 100.0

    def _attendance_signal(self, student: Student) -> dict[str, Any]:
        today = timezone.localdate()
        start = today - timedelta(days=self.lookback_days)
        records = list(
            Attendance.objects.filter(
                student=student, date__gte=start, date__lte=today
            ).order_by("date")
        )

        reasons: list[str] = []
        actions: list[str] = []
        score = 0

        if not records:
            score += 10
            reasons.append("Attendance records are insufficient in the last 30 days.")
            actions.append("Ensure attendance is captured daily for this student.")
            return {
                "score": score,
                "reasons": reasons,
                "actions": actions,
                "metrics": {"recent_attendance_pct": None, "trend_drop_pct": None},
            }

        midpoint = max(1, len(records) // 2)
        previous_window = records[:midpoint]
        recent_window = records[midpoint:]
        previous_rate = self._attendance_rate(previous_window)
        recent_rate = self._attendance_rate(recent_window)
        trend_drop = previous_rate - recent_rate

        if recent_rate < 75:
            score += 20
            reasons.append(
                f"Attendance is low at {round(recent_rate)}% in recent classes."
            )
            actions.append(
                "Schedule an attendance improvement plan with parent and class teacher."
            )
        if trend_drop >= 10:
            score += 10
            reasons.append(
                f"Attendance dropped by {round(trend_drop)} percentage points compared to earlier period."
            )
            actions.append(
                "Investigate recent absenteeism reasons and set weekly follow-up."
            )

        return {
            "score": score,
            "reasons": reasons,
            "actions": actions,
            "metrics": {
                "recent_attendance_pct": round(recent_rate, 1),
                "trend_drop_pct": round(trend_drop, 1),
            },
        }

    def _grade_signal(self, student: Student, class_id: int) -> dict[str, Any]:
        results = list(
            Result.objects.select_related("assessment")
            .filter(student=student, assessment__subject__academic_class_id=class_id)
            .order_by("-submitted_at")[:6]
        )

        score = 0
        reasons: list[str] = []
        actions: list[str] = []

        if not results:
            score += 10
            reasons.append("No recent graded assessments found.")
            actions.append("Assign a short diagnostic assessment and review outcomes.")
            return {
                "score": score,
                "reasons": reasons,
                "actions": actions,
                "metrics": {"recent_grade_pct": None, "trend_drop_pct": None},
            }

        percentages: list[float] = []
        for row in results:
            total_marks = float(getattr(row.assessment, "total_marks", 0) or 0)
            percentages.append(self._percent(float(row.score or 0), total_marks))

        recent_values = percentages[:3]
        previous_values = percentages[3:]
        recent_avg = sum(recent_values) / max(1, len(recent_values))
        previous_avg = (
            sum(previous_values) / max(1, len(previous_values))
            if previous_values
            else recent_avg
        )
        trend_drop = previous_avg - recent_avg

        if recent_avg < 55:
            score += 25
            reasons.append(f"Recent average grade is low at {round(recent_avg)}%.")
            actions.append("Provide targeted remediation worksheets for weak topics.")
        if trend_drop >= 10:
            score += 15
            reasons.append(
                f"Grades declined by {round(trend_drop)} percentage points across recent assessments."
            )
            actions.append(
                "Conduct a one-on-one academic review and weekly progress checks."
            )

        return {
            "score": score,
            "reasons": reasons,
            "actions": actions,
            "metrics": {
                "recent_grade_pct": round(recent_avg, 1),
                "trend_drop_pct": round(trend_drop, 1),
            },
        }

    def _missing_assignments_signal(
        self, student: Student, class_id: int
    ) -> dict[str, Any]:
        now = timezone.now()
        assessment_qs = Assessment.objects.filter(
            subject__academic_class_id=class_id,
            type="assignment",
            due_date__isnull=False,
            due_date__lt=now,
        )

        if student.section_id:
            assessment_qs = assessment_qs.filter(
                Q(section_id=student.section_id) | Q(section__isnull=True)
            )
        else:
            assessment_qs = assessment_qs.filter(section__isnull=True)

        due_assessments = list(assessment_qs.values_list("assessment_id", flat=True))
        due_count = len(due_assessments)
        if due_count == 0:
            return {
                "score": 0,
                "reasons": [],
                "actions": [],
                "metrics": {"missing_assignments": 0},
            }

        submission_count = (
            Submission.objects.filter(
                student=student, assessment_id__in=due_assessments
            )
            .exclude(status="draft")
            .values("assessment_id")
            .distinct()
            .count()
        )
        missing_count = max(0, due_count - submission_count)
        if missing_count == 0:
            return {
                "score": 0,
                "reasons": [],
                "actions": [],
                "metrics": {"missing_assignments": 0},
            }

        score = min(20, missing_count * 7)
        reasons = [f"{missing_count} assignment(s) are overdue and not submitted."]
        actions = [
            "Coordinate with student and parent to clear pending assignments this week."
        ]
        return {
            "score": score,
            "reasons": reasons,
            "actions": actions,
            "metrics": {"missing_assignments": missing_count},
        }

    def _inactivity_signal(self, student: Student, class_id: int) -> dict[str, Any]:
        lessons_qs = Lesson.objects.filter(
            chapter__subject__academic_class_id=class_id,
            is_published=True,
        ).values_list("id", flat=True)
        lesson_ids = list(lessons_qs)
        total_lessons = len(lesson_ids)

        if total_lessons == 0:
            return {
                "score": 0,
                "reasons": [],
                "actions": [],
                "metrics": {"lesson_completion_pct": None, "inactive_days": None},
            }

        progress_qs = LessonProgress.objects.filter(
            student=student, lesson_id__in=lesson_ids
        )
        completed_count = progress_qs.filter(completed=True).count()
        completion_pct = (completed_count / total_lessons) * 100.0
        last_accessed = (
            progress_qs.order_by("-last_accessed")
            .values_list("last_accessed", flat=True)
            .first()
        )

        score = 0
        reasons: list[str] = []
        actions: list[str] = []

        if completion_pct < 30:
            score += 15
            reasons.append(f"Lesson completion is low at {round(completion_pct)}%.")
            actions.append("Assign a guided catch-up lesson plan with daily goals.")

        if last_accessed is None:
            score += 10
            reasons.append("No lesson activity recorded recently.")
            actions.append("Schedule supervised LMS login sessions for the student.")
            inactive_days = None
        else:
            inactive_days = (timezone.now() - last_accessed).days
            if inactive_days >= self.inactivity_days:
                score += 10
                reasons.append(f"No lesson access for {inactive_days} days.")
                actions.append(
                    "Re-engage student with mentor check-in and short learning tasks."
                )

        return {
            "score": score,
            "reasons": reasons,
            "actions": actions,
            "metrics": {
                "lesson_completion_pct": round(completion_pct, 1),
                "inactive_days": inactive_days,
            },
        }

    @staticmethod
    def _extract_json(raw: str) -> dict[str, Any] | None:
        if not isinstance(raw, str):
            return None
        candidate = raw.strip()
        if not candidate:
            return None
        fenced = re.search(
            r"```(?:json)?\s*(\{.*\}|\[.*\])\s*```",
            candidate,
            re.DOTALL | re.IGNORECASE,
        )
        if fenced:
            candidate = fenced.group(1).strip()
        try:
            payload = json.loads(candidate)
        except Exception:
            return None
        return payload if isinstance(payload, dict) else None

    def _maybe_llm_enhance(
        self,
        *,
        student_name: str,
        risk_score: int,
        reasons: list[str],
        actions: list[str],
    ) -> tuple[list[str], list[str]]:
        if not self.use_llm_explanations:
            return reasons, actions

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an academic counselor assistant. "
                    "Return strict JSON only with keys reasons and suggested_actions. "
                    "Each key must be an array of short bullet strings."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Student: {student_name}\nRisk score: {risk_score}\n"
                    f"Base reasons: {json.dumps(reasons)}\n"
                    f"Base suggested actions: {json.dumps(actions)}\n"
                    "Refine these for teacher communication while preserving meaning."
                ),
            },
        ]
        text, _usage = self.rag._call_chat_model(messages)
        parsed = self._extract_json(text)
        if not isinstance(parsed, dict):
            return reasons, actions

        parsed_reasons = parsed.get("reasons")
        parsed_actions = parsed.get("suggested_actions")
        if not isinstance(parsed_reasons, list) or not isinstance(parsed_actions, list):
            return reasons, actions

        normalized_reasons = [
            str(item).strip() for item in parsed_reasons if str(item).strip()
        ]
        normalized_actions = [
            str(item).strip() for item in parsed_actions if str(item).strip()
        ]
        if not normalized_reasons or not normalized_actions:
            return reasons, actions
        return normalized_reasons[:6], normalized_actions[:6]

    def _teacher_recipients_for_class(self, class_id: int) -> list[Any]:
        queryset = (
            Teacher.objects.select_related("user")
            .filter(assigned_classes__id=class_id)
            .distinct()
        )
        class_teachers = [
            row.user
            for row in queryset
            if row.designation == "class_teacher" and getattr(row, "user", None)
        ]
        if class_teachers:
            return class_teachers
        return [row.user for row in queryset if getattr(row, "user", None)]

    @staticmethod
    def _parent_recipients_for_student(student: Student) -> list[Any]:
        return [
            row.user
            for row in Parent.objects.select_related("user").filter(students=student)
            if getattr(row, "user", None)
        ]

    def _create_risk_notifications(
        self, *, student: Student, class_id: int, risk_score: int, reasons: list[str]
    ) -> None:
        teacher_recipients = self._teacher_recipients_for_class(class_id)
        parent_recipients = self._parent_recipients_for_student(student)
        recipients = self._unique(
            [str(user.pk) for user in [*teacher_recipients, *parent_recipients]]
        )
        if not recipients:
            return

        reason_line = reasons[0] if reasons else "Multiple risk indicators detected."
        title = f"At-risk alert: {student.user.get_full_name() or student.user.email}"
        message = f"Risk score {risk_score}/100. {reason_line}"
        window_start = timezone.now() - timedelta(hours=24)

        user_by_id = {
            str(user.pk): user for user in [*teacher_recipients, *parent_recipients]
        }
        for recipient_id in recipients:
            recipient = user_by_id.get(recipient_id)
            if recipient is None:
                continue
            already_sent = Notification.objects.filter(
                tenant=self.tenant,
                recipient=recipient,
                title=title,
                created_at__gte=window_start,
            ).exists()
            if already_sent:
                continue
            NotificationService.create_notification(
                recipient=recipient,
                title=title,
                message=message,
                tenant=self.tenant,
                link="/teacher/students",
            )

    def _student_risk_payload(
        self, *, student: Student, class_id: int, send_notifications: bool
    ) -> dict[str, Any]:
        attendance = self._attendance_signal(student)
        grades = self._grade_signal(student, class_id)
        assignments = self._missing_assignments_signal(student, class_id)
        inactivity = self._inactivity_signal(student, class_id)

        risk_score = int(
            max(
                0,
                min(
                    100,
                    attendance["score"]
                    + grades["score"]
                    + assignments["score"]
                    + inactivity["score"],
                ),
            )
        )
        reasons = self._unique(
            [
                *attendance["reasons"],
                *grades["reasons"],
                *assignments["reasons"],
                *inactivity["reasons"],
            ]
        )
        actions = self._unique(
            [
                *attendance["actions"],
                *grades["actions"],
                *assignments["actions"],
                *inactivity["actions"],
            ]
        )

        if reasons and actions:
            reasons, actions = self._maybe_llm_enhance(
                student_name=student.user.get_full_name() or student.user.email,
                risk_score=risk_score,
                reasons=reasons,
                actions=actions,
            )

        if send_notifications and risk_score >= self.notification_threshold:
            self._create_risk_notifications(
                student=student,
                class_id=class_id,
                risk_score=risk_score,
                reasons=reasons,
            )

        return {
            "student_id": str(student.student_id),
            "student_name": student.user.get_full_name() or student.user.email,
            "risk_score": risk_score,
            "reasons": reasons,
            "suggested_actions": actions[:5],
            "metrics": {
                "attendance": attendance["metrics"],
                "grades": grades["metrics"],
                "assignments": assignments["metrics"],
                "activity": inactivity["metrics"],
            },
        }

    def get_at_risk_students(
        self, *, class_id: int, send_notifications: bool = True
    ) -> list[dict[str, Any]]:
        students = list(
            Student.objects.select_related("user")
            .filter(academic_class_id=class_id, user__tenant=self.tenant)
            .order_by("user__first_name", "user__last_name")
        )
        payloads = [
            self._student_risk_payload(
                student=student,
                class_id=class_id,
                send_notifications=send_notifications,
            )
            for student in students
        ]
        filtered = [row for row in payloads if int(row["risk_score"]) >= self.min_score]
        return sorted(filtered, key=lambda row: int(row["risk_score"]), reverse=True)
