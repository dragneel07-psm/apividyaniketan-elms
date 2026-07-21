# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
BadgeEvaluatorService — Evaluates all badge criteria and auto-awards badges.

Called after any event that could satisfy a badge:
  - Lesson completed       → lessons_completed
  - Assessment result      → assessments_passed, perfect_score
  - Early submission       → early_bird
  - Streak update          → streak_days

Each evaluator is idempotent (StudentBadge has unique_together on student+badge).
When a badge is awarded, XP is granted and an in-app notification is sent.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class BadgeEvaluatorService:
    def __init__(self, *, student, tenant=None, using="default"):
        self.student = student
        self.using = using
        # Resolve tenant
        if tenant is not None:
            self.tenant = tenant
        else:
            try:
                self.tenant = student.user.tenant
            except Exception:
                self.tenant = None

    # ------------------------------------------------------------------ #
    #  Entry points — call the relevant one after each event
    # ------------------------------------------------------------------ #

    def on_lesson_completed(self):
        """Call after a lesson is marked complete."""
        from academic.models import LessonProgress

        count = (
            LessonProgress.objects.using(self.using)
            .filter(student=self.student, completed=True)
            .count()
        )
        self._check_criteria("lessons_completed", count)

    def on_assessment_result(self, result):
        """
        Call after a Result is saved.
        result: academic.models.assessment.Result instance.
        """
        from academic.models.assessment import Result

        passed = self._count_passed_assessments()
        self._check_criteria("assessments_passed", passed)

        # perfect_score: score == total_marks
        if (
            result.assessment.total_marks > 0
            and result.score >= result.assessment.total_marks
        ):
            self._check_criteria("perfect_score", 1)

    def on_early_submission(self, submission):
        """
        Call after a Submission that was submitted before the due date.
        submission: academic.models.submission.Submission instance.
        """
        from django.utils import timezone

        from academic.models.submission import Submission

        assessment = submission.assessment
        if (
            assessment.due_date
            and submission.submitted_at
            and submission.submitted_at < assessment.due_date
        ):
            early_count = self._count_early_submissions()
            self._check_criteria("early_bird", early_count)

    def on_streak_update(self):
        """Call after a student's streak is updated."""
        streak = getattr(self.student, "current_streak", 0) or 0
        self._check_criteria("streak_days", streak)

        # Also check GamificationProfile streak in case it's tracked there
        try:
            profile = self.student.gamification_profile
            streak = max(streak, profile.current_streak or 0)
            self._check_criteria("streak_days", streak)
        except Exception:
            pass

    def evaluate_all(self):
        """Run all evaluators at once (used during backfill or profile init)."""
        self.on_lesson_completed()
        self.on_streak_update()
        # assessments_passed + perfect_score via latest results
        passed = self._count_passed_assessments()
        self._check_criteria("assessments_passed", passed)
        early = self._count_early_submissions()
        self._check_criteria("early_bird", early)

    # ------------------------------------------------------------------ #
    #  Core badge check
    # ------------------------------------------------------------------ #

    def _check_criteria(self, criteria_type: str, current_value: int):
        if self.tenant is None:
            return

        from gamification.models import Badge, PointTransaction, StudentBadge

        badges = Badge.objects.using(self.using).filter(
            tenant=self.tenant,
            criteria_type=criteria_type,
        )
        for badge in badges:
            if current_value >= badge.criteria_value:
                awarded, created = StudentBadge.objects.using(self.using).get_or_create(
                    tenant=self.tenant,
                    student=self.student,
                    badge=badge,
                )
                if created:
                    self._grant_xp(badge)
                    self._notify(badge)
                    logger.info("Badge awarded: %s → %s", badge.name, self.student)

    # ------------------------------------------------------------------ #
    #  Helpers
    # ------------------------------------------------------------------ #

    def _count_passed_assessments(self) -> int:
        from django.db.models import F

        from academic.models.assessment import Result

        return (
            Result.objects.using(self.using)
            .filter(
                student=self.student,
                assessment__total_marks__gt=0,
                score__gte=F("assessment__passing_marks"),
            )
            .count()
        )

    def _count_early_submissions(self) -> int:
        from academic.models.submission import Submission

        subs = (
            Submission.objects.using(self.using)
            .filter(student=self.student, status="submitted")
            .select_related("assessment")
        )
        return sum(
            1
            for s in subs
            if s.assessment.due_date
            and s.submitted_at
            and s.submitted_at < s.assessment.due_date
        )

    def _grant_xp(self, badge):
        from gamification.models import GamificationProfile, PointTransaction

        if badge.xp_reward <= 0:
            return
        PointTransaction.objects.using(self.using).create(
            tenant=self.tenant,
            student=self.student,
            points=badge.xp_reward,
            description=f"Earned badge: {badge.name}",
            activity_type="badge",
        )
        try:
            profile, _ = GamificationProfile.objects.using(self.using).get_or_create(
                tenant=self.tenant, student=self.student
            )
            profile.add_xp(badge.xp_reward)
        except Exception as exc:
            logger.warning(
                "BadgeEvaluator: failed to update GamificationProfile: %s", exc
            )

    def _notify(self, badge):
        try:
            from notifications.services import NotificationService

            NotificationService.create_notification(
                recipient=self.student.user,
                title=f"🏅 Badge Unlocked: {badge.name}",
                message=badge.description,
                tenant=self.tenant,
            )
        except Exception as exc:
            logger.warning("BadgeEvaluator: notification failed: %s", exc)
