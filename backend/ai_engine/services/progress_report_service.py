# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
ProgressReportService — AI-generated weekly progress reports.

Generates three flavours of report from a single data collection pass:

  student  — detailed breakdown for the student (motivational, actionable)
  parent   — plain-language summary for parents/guardians (no jargon)
  teacher  — per-student card for teacher view (risk signals, metrics)

Data sources used (all Phase 1–8 work feeds into this):
  • Assessment results & subject averages
  • Attendance rate (last 30 days)
  • SM-2 LearningNode performance (ease_factor, interval, last_quality)
  • BKT SkillMastery (top gaps + top strengths)
  • AI Tutor usage (conversation/message counts, topics discussed)
  • Daily token budget consumption
  • Learning streak and focus score from Student model
"""

from __future__ import annotations

import json
import logging
from datetime import timedelta
from typing import Any

from django.utils import timezone

from ai_engine.services.lang_utils import get_lang_instruction

logger = logging.getLogger(__name__)

LOOKBACK_DAYS = 30
MIN_REPORT_INTERVAL_DAYS = 7  # Don't regenerate more often than this


# ── helpers ──────────────────────────────────────────────────────────────────


def _safe_pct(numerator: float, denominator: float) -> float:
    return round((numerator / denominator) * 100, 1) if denominator else 0.0


def _extract_json(raw: str) -> dict:
    """Try to parse JSON out of a potentially markdown-fenced LLM response."""
    if not raw:
        return {}
    text = raw.strip()
    # Strip ```json ... ``` fencing
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            candidate = part.strip().lstrip("json").strip()
            if candidate.startswith("{"):
                text = candidate
                break
    try:
        return json.loads(text)
    except Exception:
        return {}


# ── service ──────────────────────────────────────────────────────────────────


class ProgressReportService:
    """Generate and persist AI progress reports for students."""

    def __init__(self, *, tenant, db_alias: str = "default"):
        self.tenant = tenant
        self.db_alias = db_alias
        self._client = None

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def get_or_generate(
        self, student, report_type: str = "student", force: bool = False
    ) -> dict:
        """
        Return a cached report if one was generated within MIN_REPORT_INTERVAL_DAYS,
        otherwise generate a fresh one.
        """
        from ai_engine.models import StudentAIReport

        if not force:
            cutoff = timezone.now() - timedelta(days=MIN_REPORT_INTERVAL_DAYS)
            latest = (
                StudentAIReport.objects.using(self.db_alias)
                .filter(
                    student=student, report_type=report_type, generated_at__gte=cutoff
                )
                .order_by("-generated_at")
                .first()
            )
            if latest:
                return {
                    "cached": True,
                    "report": latest.report_data,
                    "generated_at": latest.generated_at.isoformat(),
                }

        return self.generate(
            student, report_type=report_type, save=True, is_automated=False
        )

    def generate(
        self,
        student,
        report_type: str = "student",
        save: bool = True,
        is_automated: bool = False,
    ) -> dict:
        """Generate a fresh report for the student and optionally persist it."""
        metrics = self._collect_metrics(student)
        lang = getattr(student, "language_preference", "en") or "en"
        ai_section = self._generate_ai_section(metrics, report_type, lang=lang)
        report_data = {
            "report_type": report_type,
            "student_name": metrics["student_name"],
            "class_name": metrics["class_name"],
            "generated_at": timezone.now().isoformat(),
            "metrics": metrics,
            "ai": ai_section,
        }

        if save:
            from ai_engine.models import StudentAIReport

            StudentAIReport.objects.using(self.db_alias).create(
                tenant=self.tenant,
                student=student,
                report_type=report_type,
                report_data=report_data,
                is_automated=is_automated,
            )

        return {
            "cached": False,
            "report": report_data,
            "generated_at": report_data["generated_at"],
        }

    def list_history(
        self, student, report_type: str | None = None, limit: int = 10
    ) -> list[dict]:
        from ai_engine.models import StudentAIReport

        qs = StudentAIReport.objects.using(self.db_alias).filter(student=student)
        if report_type:
            qs = qs.filter(report_type=report_type)
        return [
            {
                "report_id": str(r.report_id),
                "report_type": r.report_type,
                "generated_at": r.generated_at.isoformat(),
                "is_automated": r.is_automated,
                "report": r.report_data,
            }
            for r in qs.order_by("-generated_at")[:limit]
        ]

    # ------------------------------------------------------------------ #
    # Metrics collection
    # ------------------------------------------------------------------ #

    def _collect_metrics(self, student) -> dict[str, Any]:
        db = self.db_alias
        now = timezone.now()
        cutoff = now - timedelta(days=LOOKBACK_DAYS)

        # ── Basic info ────────────────────────────────────────────────────
        student_name = student.user.get_full_name() or student.user.username
        class_name = (
            student.academic_class.name
            if getattr(student, "academic_class", None)
            else "N/A"
        )

        # ── Assessment results ────────────────────────────────────────────
        from academic.models import Result, Subject

        results = list(
            Result.objects.using(db)
            .filter(student=student, submitted_at__gte=cutoff)
            .select_related("assessment", "assessment__subject")
        )
        avg_score = 0.0
        subject_scores: dict[str, list[float]] = {}
        for r in results:
            if r.assessment.total_marks:
                pct = (r.score / r.assessment.total_marks) * 100
                sub = r.assessment.subject.name if r.assessment.subject else "General"
                subject_scores.setdefault(sub, []).append(pct)
                avg_score += pct
        avg_score = round(avg_score / len(results), 1) if results else 0.0
        subject_averages = {
            sub: round(sum(scores) / len(scores), 1)
            for sub, scores in subject_scores.items()
        }
        strengths = [s for s, v in subject_averages.items() if v >= 75]
        weak_subjects = [s for s, v in subject_averages.items() if v < 60]

        # ── Attendance ────────────────────────────────────────────────────
        from academic.models import Attendance

        att = list(
            Attendance.objects.using(db).filter(
                student=student, date__gte=cutoff.date()
            )
        )
        att_rate = _safe_pct(sum(1 for a in att if a.status == "present"), len(att))

        # ── SM-2 spaced repetition ─────────────────────────────────────────
        from ai_engine.models import LearningNode

        nodes = list(
            LearningNode.objects.using(db)
            .filter(learning_path__student=student, status="completed")
            .values("last_quality", "ease_factor", "interval_days", "repetitions")
        )
        avg_quality = (
            round(sum(n["last_quality"] or 0 for n in nodes) / len(nodes), 2)
            if nodes
            else 0
        )
        reviews_completed = len(nodes)
        avg_ease = (
            round(sum(n["ease_factor"] for n in nodes) / len(nodes), 2)
            if nodes
            else 2.5
        )
        due_reviews = (
            LearningNode.objects.using(db)
            .filter(
                learning_path__student=student,
                next_review_at__date__lte=now.date(),
                status__in=["completed", "unlocked", "in_progress"],
            )
            .count()
        )

        # ── BKT skill mastery ─────────────────────────────────────────────
        from ai_engine.models import SkillMastery

        masteries = list(
            SkillMastery.objects.using(db)
            .filter(student=student)
            .select_related("skill_tag")
            .order_by("p_mastery")
        )
        skill_gaps = [
            {"skill": m.skill_tag.name, "mastery_pct": round(m.p_mastery * 100, 1)}
            for m in masteries
            if m.p_mastery < 0.60
        ][:5]
        skill_strengths = [
            {"skill": m.skill_tag.name, "mastery_pct": round(m.p_mastery * 100, 1)}
            for m in sorted(masteries, key=lambda x: -x.p_mastery)
            if m.p_mastery >= 0.75
        ][:5]

        # ── AI tutor usage ────────────────────────────────────────────────
        from ai_engine.models import TutorConversation, TutorMessage

        conversations = (
            TutorConversation.objects.using(db)
            .filter(student=student, created_at__gte=cutoff)
            .count()
        )
        messages = (
            TutorMessage.objects.using(db)
            .filter(
                conversation__student=student,
                created_at__gte=cutoff,
                role="user",
            )
            .count()
        )

        # ── Token budget ──────────────────────────────────────────────────
        from ai_engine.models import AITokenBudget

        budget = (
            AITokenBudget.objects.using(db)
            .filter(tenant=self.tenant, student=student)
            .first()
        )
        budget_pct = 0.0
        if budget and budget.daily_limit_tokens:
            budget_pct = _safe_pct(budget.used_today, budget.daily_limit_tokens)

        # ── Student profile fields ────────────────────────────────────────
        streak = getattr(student, "current_streak", 0) or 0
        focus = getattr(student, "focus_score", 0) or 0
        daily_goal = getattr(student, "daily_study_goal", 60) or 60

        # ── Study plan completion ─────────────────────────────────────────
        from ai_engine.models import StudyEvent

        plan_events = StudyEvent.objects.using(db).filter(
            student=student, start_time__gte=cutoff
        )
        plan_total = plan_events.count()
        plan_done = plan_events.filter(is_completed=True).count()
        plan_completion_pct = _safe_pct(plan_done, plan_total)

        return {
            "student_name": student_name,
            "class_name": class_name,
            "avg_score": avg_score,
            "subject_averages": subject_averages,
            "strengths": strengths,
            "weak_subjects": weak_subjects,
            "attendance_rate": att_rate,
            "sm2": {
                "reviews_completed": reviews_completed,
                "avg_quality": avg_quality,
                "avg_ease_factor": avg_ease,
                "due_reviews": due_reviews,
            },
            "bkt": {
                "skill_gaps": skill_gaps,
                "skill_strengths": skill_strengths,
                "total_skills_tracked": len(masteries),
            },
            "tutor": {
                "conversations_this_period": conversations,
                "questions_asked": messages,
            },
            "budget_used_today_pct": budget_pct,
            "streak_days": streak,
            "focus_score": focus,
            "daily_goal_minutes": daily_goal,
            "plan_completion_pct": plan_completion_pct,
        }

    # ------------------------------------------------------------------ #
    # LLM section generation
    # ------------------------------------------------------------------ #

    def _generate_ai_section(
        self, metrics: dict, report_type: str, lang: str = "en"
    ) -> dict:
        prompt = self._build_prompt(metrics, report_type, lang=lang)
        raw = self._call_llm(prompt, lang=lang)
        parsed = _extract_json(raw)
        if not parsed:
            parsed = self._fallback_section(metrics, report_type)
        return parsed

    def _build_prompt(self, m: dict, report_type: str, lang: str = "en") -> str:
        skills_gap_str = (
            ", ".join(
                f"{g['skill']} ({g['mastery_pct']}%)" for g in m["bkt"]["skill_gaps"]
            )
            or "none"
        )
        skills_str = (
            ", ".join(
                f"{s['skill']} ({s['mastery_pct']}%)"
                for s in m["bkt"]["skill_strengths"]
            )
            or "none"
        )

        base = f"""
Student: {m['student_name']} | Class: {m['class_name']}
Period: last 30 days

Academic Performance:
- Average score: {m['avg_score']}%
- Strong subjects: {', '.join(m['strengths']) or 'none identified'}
- Weak subjects: {', '.join(m['weak_subjects']) or 'none identified'}
- Subject breakdown: {', '.join(f"{s}: {v}%" for s, v in m['subject_averages'].items()) or 'no results yet'}

Attendance: {m['attendance_rate']}%

Learning Habits:
- Study streak: {m['streak_days']} days
- Focus score: {m['focus_score']}%
- Daily goal: {m['daily_goal_minutes']} min
- Study plan completion: {m['plan_completion_pct']}%

AI Tutor Usage:
- Conversations: {m['tutor']['conversations_this_period']}
- Questions asked: {m['tutor']['questions_asked']}

Skill Mastery (BKT):
- Skill gaps (< 60%): {skills_gap_str}
- Mastered skills (≥ 75%): {skills_str}

Spaced Review (SM-2):
- Reviews completed: {m['sm2']['reviews_completed']}
- Average recall quality: {m['sm2']['avg_quality']}/5
- Cards due for review: {m['sm2']['due_reviews']}
"""

        if report_type == "student":
            instruction = """
Write an encouraging, honest progress report FOR THE STUDENT.
Use "you/your" language. Be motivational but specific.
Return valid JSON only with these keys:
{
  "headline": "One compelling sentence about overall progress",
  "summary": "2-3 sentences overview",
  "strengths": ["bullet 1", "bullet 2", "bullet 3"],
  "areas_to_improve": ["bullet 1", "bullet 2"],
  "weekly_goals": ["specific goal 1", "specific goal 2", "specific goal 3"],
  "tutor_tip": "One tip for using the AI tutor effectively"
}"""

        elif report_type == "parent":
            instruction = """
Write a clear, warm progress report FOR THE PARENT/GUARDIAN.
Avoid technical jargon. Explain what the numbers mean in practical terms.
Return valid JSON only with these keys:
{
  "headline": "One-line summary for parents",
  "overview": "2-3 sentence plain-language overview of how the child is doing",
  "positives": ["positive 1", "positive 2"],
  "concerns": ["concern 1 if any"],
  "how_to_help": ["practical thing parent can do 1", "practical thing parent can do 2"],
  "teacher_note": "What to ask/watch for at the next parent-teacher meeting"
}"""

        else:  # teacher
            instruction = """
Write a concise progress card FOR THE TEACHER reviewing this student.
Be data-driven and flag any risks clearly.
Return valid JSON only with these keys:
{
  "risk_level": "low | medium | high",
  "risk_reasons": ["reason if medium/high risk, else empty"],
  "academic_summary": "1-2 sentences on academic standing",
  "engagement_summary": "1-2 sentences on AI tutor/study plan engagement",
  "recommended_interventions": ["intervention 1 if needed"],
  "metrics_snapshot": {
    "avg_score": <number>,
    "attendance": <number>,
    "skill_gaps_count": <number>,
    "due_reviews": <number>
  }
}"""

        lang_instruction = get_lang_instruction(lang)
        if lang_instruction:
            instruction = instruction.rstrip() + f"\n\n{lang_instruction}"
        return base.strip() + "\n\n" + instruction.strip()

    def _call_llm(self, prompt: str, lang: str = "en") -> str:
        try:
            from ai_engine.services.ai_client import chat_with_fallback, provider_ready

            if not provider_ready():
                return ""

            lang_instruction = get_lang_instruction(lang)
            system_content = (
                "You are a professional school academic advisor. "
                "Always respond with valid JSON only — no extra text."
            )
            if lang_instruction:
                system_content = f"{system_content}\n{lang_instruction}"
            resp = chat_with_fallback(
                [
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                response_format={"type": "json_object"},
                max_tokens=600,
            )
            return resp.choices[0].message.content or ""
        except Exception as exc:
            logger.warning("ProgressReportService LLM call failed: %s", exc)
            return ""

    @staticmethod
    def _fallback_section(m: dict, report_type: str) -> dict:
        name = m["student_name"].split()[0]
        if report_type == "student":
            return {
                "headline": f"{name}, you're making steady progress!",
                "summary": (
                    f"Your average score this period is {m['avg_score']}% "
                    f"with {m['attendance_rate']}% attendance."
                ),
                "strengths": m["strengths"][:3] or ["Keep up the consistent effort"],
                "areas_to_improve": m["weak_subjects"][:2]
                or ["Continue reviewing weak topics"],
                "weekly_goals": [
                    f"Complete all {m['sm2']['due_reviews']} pending spaced reviews",
                    "Ask the AI tutor at least one question per day",
                    f"Finish your {m['daily_goal_minutes']}-minute daily study goal",
                ],
                "tutor_tip": "Ask the AI tutor to explain any topic you found confusing this week.",
            }
        elif report_type == "parent":
            return {
                "headline": f"{name} is progressing in their studies.",
                "overview": (
                    f"{name} scored an average of {m['avg_score']}% this period "
                    f"and attended {m['attendance_rate']}% of classes."
                ),
                "positives": m["strengths"][:2] or ["Showing effort in their studies"],
                "concerns": m["weak_subjects"][:1],
                "how_to_help": [
                    "Ensure a quiet study space for 30–60 minutes daily",
                    "Ask your child what they learned today",
                ],
                "teacher_note": "Ask about upcoming assessments and how to support revision at home.",
            }
        else:
            return {
                "risk_level": (
                    "medium"
                    if m["avg_score"] < 60 or m["attendance_rate"] < 75
                    else "low"
                ),
                "risk_reasons": (
                    [f"Average score {m['avg_score']}% is below 60%"]
                    if m["avg_score"] < 60
                    else []
                ),
                "academic_summary": (
                    f"Average score: {m['avg_score']}%. "
                    f"Weak in: {', '.join(m['weak_subjects']) or 'none flagged'}."
                ),
                "engagement_summary": (
                    f"Asked {m['tutor']['questions_asked']} AI tutor questions; "
                    f"study plan {m['plan_completion_pct']}% complete."
                ),
                "recommended_interventions": (
                    ["Consider a one-on-one check-in"] if m["avg_score"] < 50 else []
                ),
                "metrics_snapshot": {
                    "avg_score": m["avg_score"],
                    "attendance": m["attendance_rate"],
                    "skill_gaps_count": len(m["bkt"]["skill_gaps"]),
                    "due_reviews": m["sm2"]["due_reviews"],
                },
            }
