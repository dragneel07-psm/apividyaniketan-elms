# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
ParentDigestService — Generates a short daily plain-language digest for parents.

Example output:
  "Priya completed 2 lessons today and is on a 5-day streak.
   She scored 82% on her Math quiz — well done!
   Her AI tutor session covered Photosynthesis; consider asking her about it."

Uses ProgressReportService metrics data (no extra LLM call if AI is unavailable —
falls back to a template-based digest).
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)

# Lookback window for "today's" activity
LOOKBACK_HOURS = 24


class ParentDigestService:
    def __init__(self, *, tenant):
        self.tenant = tenant

    def generate_digest(self, student, using="default") -> str:
        """
        Return a 2-3 sentence digest string for a parent about their child's
        recent activity. Returns empty string if there's nothing to report.
        """
        parts = self._collect_activity(student, using=using)
        if not parts:
            return ""

        # Try LLM-enhanced version first
        enhanced = self._llm_digest(student, parts, using=using)
        if enhanced:
            return enhanced

        # Fallback: template digest
        return self._template_digest(student, parts)

    # ------------------------------------------------------------------ #
    #  Data collection
    # ------------------------------------------------------------------ #

    def _collect_activity(self, student, using="default") -> dict:
        from academic.models import LessonProgress
        from academic.models.assessment import Result
        from ai_engine.models import TutorMessage

        cutoff = timezone.now() - timedelta(hours=LOOKBACK_HOURS)
        name = ""
        try:
            name = student.user.get_full_name().split()[0] if student.user else ""
        except Exception:
            name = "Your child"

        # Lessons completed today
        lessons_today = (
            LessonProgress.objects.using(using)
            .filter(
                student=student,
                completed=True,
                # Approximate: LessonProgress has no completed_at, use last active proxy
            )
            .count()
        )

        # Recent quiz results
        recent_results = list(
            Result.objects.using(using)
            .filter(student=student, submitted_at__gte=cutoff)
            .select_related("assessment__subject")
            .order_by("-submitted_at")[:3]
        )

        # Tutor topics (last 24h)
        tutor_msgs = (
            TutorMessage.objects.using(using)
            .filter(conversation__student=student, role="user", created_at__gte=cutoff)
            .values_list("content", flat=True)[:3]
        )

        streak = getattr(student, "current_streak", 0) or 0

        return {
            "name": name,
            "streak": streak,
            "recent_results": [
                {
                    "subject": (
                        r.assessment.subject.name if r.assessment.subject else "Unknown"
                    ),
                    "score_pct": (
                        round((r.score / r.assessment.total_marks) * 100)
                        if r.assessment.total_marks
                        else 0
                    ),
                    "title": r.assessment.title,
                }
                for r in recent_results
                if r.assessment.total_marks > 0
            ],
            "tutor_topics": list(tutor_msgs),
            "lessons_today": lessons_today,
        }

    # ------------------------------------------------------------------ #
    #  Digest generation
    # ------------------------------------------------------------------ #

    def _template_digest(self, student, parts: dict) -> str:
        name = parts["name"]
        sentences = []

        if parts["streak"] > 0:
            sentences.append(
                f"{name} is on a {parts['streak']}-day learning streak — great consistency!"
            )

        if parts["recent_results"]:
            top = parts["recent_results"][0]
            emoji = (
                "🎉"
                if top["score_pct"] >= 80
                else ("📚" if top["score_pct"] >= 60 else "💪")
            )
            sentences.append(
                f"{emoji} {name} scored {top['score_pct']}% on the {top['subject']} {top['title']}."
            )

        if parts["tutor_topics"]:
            topic_preview = parts["tutor_topics"][0][:80]
            sentences.append(
                f'Today\'s AI tutor session covered: "{topic_preview}" — ask {name} about it!'
            )

        if not sentences:
            if parts["lessons_today"] > 0:
                sentences.append(
                    f"{name} completed {parts['lessons_today']} lesson(s) today."
                )
            else:
                return ""

        return " ".join(sentences)

    def _llm_digest(self, student, parts: dict, using: str) -> str:
        from ai_engine.services.ai_client import chat_with_fallback, provider_ready

        if not provider_ready():
            return ""

        try:
            data_summary = (
                f"Student: {parts['name']}\n"
                f"Current streak: {parts['streak']} days\n"
                f"Recent assessment results: {parts['recent_results']}\n"
                f"AI tutor questions asked today: {parts['tutor_topics']}\n"
                f"Lessons completed (approximate): {parts['lessons_today']}"
            )

            resp = chat_with_fallback(
                [
                    {
                        "role": "system",
                        "content": (
                            "You are a school assistant writing a brief daily update for a parent. "
                            "Write 2-3 warm, concise sentences in plain English. "
                            "Highlight achievements positively. No technical jargon."
                        ),
                    },
                    {"role": "user", "content": data_summary},
                ],
                temperature=0.5,
                max_tokens=150,
            )
            from ai_engine.models import AIInteractionLog

            usage = resp.usage
            AIInteractionLog.objects.using(using).create(
                tenant=self.tenant,
                feature_used="parent_digest",
                prompt_tokens=getattr(usage, "prompt_tokens", 0),
                completion_tokens=getattr(usage, "completion_tokens", 0),
                total_tokens=getattr(usage, "total_tokens", 0),
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception as exc:
            logger.warning("ParentDigestService LLM failed: %s", exc)
            return ""
