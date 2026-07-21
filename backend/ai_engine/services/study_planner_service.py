# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
StudyPlannerService — AI-powered personalised study planner.

Combines four data sources to build an optimised weekly schedule:

  1. SM-2 spaced-repetition nodes due today or overdue
     → event_type='review'  (highest priority — must not be skipped)

  2. BKT skill gaps  (p_mastery < SKILL_GAP_THRESHOLD)
     → event_type='skill_practice'

  3. Upcoming exam / quiz prep  (within EXAM_PREP_DAYS days)
     → event_type='exam'

  4. Active learning-path new content  (status unlocked/in_progress)
     → event_type='study'

Each slot is time-boxed by student.daily_study_goal (minutes).
Sunday is skipped (rest day) unless the student has exams coming up.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)

# ── Tuneable constants ───────────────────────────────────────────────────────
SKILL_GAP_THRESHOLD = 0.60  # BKT p_mastery below this = skill gap
EXAM_PREP_DAYS = 3  # Flag exams within this many days
DEFAULT_DAILY_GOAL_MINUTES = 60
MAX_SESSIONS_PER_DAY = 3
# ────────────────────────────────────────────────────────────────────────────


class StudyPlannerService:
    """
    Generates StudyEvent objects for `days` ahead for a given student.

    All DB queries are routed through `db_alias` to support multi-tenancy.
    """

    def __init__(self, db_alias: str = "default"):
        self.db_alias = db_alias

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def generate_plan(
        self,
        student,
        days: int = 7,
        replace_existing: bool = True,
    ) -> list:
        """
        Build and persist StudyEvent objects for the next `days` days.

        Returns the list of created StudyEvent instances.
        """
        from ai_engine.models import StudyEvent

        today = timezone.now().date()
        tenant = student.user.tenant
        daily_goal = (
            getattr(student, "daily_study_goal", DEFAULT_DAILY_GOAL_MINUTES)
            or DEFAULT_DAILY_GOAL_MINUTES
        )

        # Collect prioritised work items
        review_nodes = self._due_review_nodes(student)
        skill_gaps = self._skill_gaps(student)
        upcoming_exams = self._upcoming_exams(student, days + EXAM_PREP_DAYS)
        new_content = self._new_content_nodes(student)

        if replace_existing:
            StudyEvent.objects.using(self.db_alias).filter(
                student=student,
                start_time__date__gte=today,
            ).delete()

        created: list = []
        review_idx = 0
        skill_idx = 0
        content_idx = 0

        for day_offset in range(days):
            day = today + timedelta(days=day_offset)
            weekday = day.weekday()  # 0=Mon … 6=Sun

            # Skip Sundays unless exam within 1 day
            has_urgent_exam = any(
                (e.scheduled_at.date() - day).days <= 1
                for e in upcoming_exams
                if hasattr(e.scheduled_at, "date")
                and (e.scheduled_at.date() - day).days >= 0
            )
            if weekday == 6 and not has_urgent_exam:
                continue

            slots = self._build_slots(day, daily_goal, MAX_SESSIONS_PER_DAY)
            day_created: list = []

            for slot_start, slot_end, slot_minutes in slots:
                if len(day_created) >= MAX_SESSIONS_PER_DAY:
                    break

                # Priority 1: exam prep (within EXAM_PREP_DAYS)
                exam_soon = [
                    e
                    for e in upcoming_exams
                    if hasattr(e.scheduled_at, "date")
                    and 0 <= (e.scheduled_at.date() - day).days <= EXAM_PREP_DAYS
                ]
                if exam_soon:
                    exam = exam_soon[0]
                    event = self._create_event(
                        tenant=tenant,
                        student=student,
                        title=f"Exam Prep: {exam.subject.name if exam.subject else exam.title}",
                        description=(
                            f"Focused revision for {exam.title} on "
                            f"{exam.scheduled_at.strftime('%a %d %b')}."
                        ),
                        event_type="exam",
                        subject=exam.subject if hasattr(exam, "subject") else None,
                        start=slot_start,
                        end=slot_end,
                        estimated_minutes=slot_minutes,
                    )
                    day_created.append(event)
                    continue

                # Priority 2: SM-2 spaced review
                if review_idx < len(review_nodes):
                    node = review_nodes[review_idx]
                    review_idx += 1
                    subject = getattr(node.learning_path, "subject", None)
                    event = self._create_event(
                        tenant=tenant,
                        student=student,
                        title=f"Review: {node.title}",
                        description=(
                            f"Spaced-repetition review — this card is due today. "
                            f"Estimated: {node.estimated_minutes or slot_minutes} min."
                        ),
                        event_type="review",
                        subject=subject,
                        start=slot_start,
                        end=slot_end,
                        estimated_minutes=min(
                            node.estimated_minutes or slot_minutes, slot_minutes
                        ),
                        node_id=node.id,
                    )
                    day_created.append(event)
                    continue

                # Priority 3: BKT skill practice
                if skill_idx < len(skill_gaps):
                    mastery = skill_gaps[skill_idx]
                    skill_idx += 1
                    subject = getattr(mastery.skill_tag, "subject", None)
                    pct = round(mastery.p_mastery * 100)
                    event = self._create_event(
                        tenant=tenant,
                        student=student,
                        title=f"Skill Practice: {mastery.skill_tag.name}",
                        description=(
                            f"Your mastery of '{mastery.skill_tag.name}' is {pct}%. "
                            f"Practice to strengthen this skill."
                        ),
                        event_type="skill_practice",
                        subject=subject,
                        start=slot_start,
                        end=slot_end,
                        estimated_minutes=slot_minutes,
                        skill_tag_id=mastery.skill_tag.id,
                    )
                    day_created.append(event)
                    continue

                # Priority 4: new learning-path content
                if content_idx < len(new_content):
                    node = new_content[content_idx]
                    content_idx += 1
                    subject = getattr(node.learning_path, "subject", None)
                    event = self._create_event(
                        tenant=tenant,
                        student=student,
                        title=f"Study: {node.title}",
                        description=(
                            f"Next lesson in your learning path. "
                            f"Estimated: {node.estimated_minutes or slot_minutes} min."
                        ),
                        event_type="study",
                        subject=subject,
                        start=slot_start,
                        end=slot_end,
                        estimated_minutes=min(
                            node.estimated_minutes or slot_minutes, slot_minutes
                        ),
                        node_id=node.id,
                    )
                    day_created.append(event)
                    continue

                # Fallback: general subject rotation
                subjects = self._student_subjects(student)
                if subjects:
                    sub = subjects[day_offset % len(subjects)]
                    event = self._create_event(
                        tenant=tenant,
                        student=student,
                        title=f"Study: {sub.name}",
                        description=f"General study session for {sub.name}.",
                        event_type="study",
                        subject=sub,
                        start=slot_start,
                        end=slot_end,
                        estimated_minutes=slot_minutes,
                    )
                    day_created.append(event)

            created.extend(day_created)

        return created

    def get_plan_summary(self, student, days: int = 7) -> dict:
        """
        Return a summary of what the planner found (without creating DB events).
        Useful for the 'preview' API call.
        """
        review_nodes = self._due_review_nodes(student)
        skill_gaps = self._skill_gaps(student)
        upcoming_exams = self._upcoming_exams(student, days + EXAM_PREP_DAYS)
        new_content = self._new_content_nodes(student)

        return {
            "due_reviews": len(review_nodes),
            "skill_gaps": [
                {
                    "skill": m.skill_tag.name,
                    "p_mastery": round(m.p_mastery, 3),
                    "subject": (
                        m.skill_tag.subject.name if m.skill_tag.subject else None
                    ),
                }
                for m in skill_gaps[:5]
            ],
            "upcoming_exams": [
                {
                    "title": e.title,
                    "scheduled_at": e.scheduled_at.isoformat(),
                    "subject": (
                        e.subject.name if hasattr(e, "subject") and e.subject else None
                    ),
                }
                for e in upcoming_exams[:5]
            ],
            "new_content_nodes": len(new_content),
            "daily_goal_minutes": (
                getattr(student, "daily_study_goal", DEFAULT_DAILY_GOAL_MINUTES)
                or DEFAULT_DAILY_GOAL_MINUTES
            ),
        }

    # ------------------------------------------------------------------ #
    # Data collectors
    # ------------------------------------------------------------------ #

    def _due_review_nodes(self, student) -> list:
        """SM-2 nodes whose next_review_at is today or overdue."""
        from ai_engine.models import LearningNode

        today = timezone.now().date()
        return list(
            LearningNode.objects.using(self.db_alias)
            .filter(
                learning_path__student=student,
                next_review_at__date__lte=today,
                status__in=["completed", "unlocked", "in_progress"],
            )
            .select_related("learning_path", "learning_path__subject")
            .order_by("next_review_at")[:20]
        )

    def _skill_gaps(self, student) -> list:
        """BKT skills with p_mastery below threshold, ordered by lowest first."""
        from ai_engine.models import SkillMastery

        return list(
            SkillMastery.objects.using(self.db_alias)
            .filter(student=student, p_mastery__lt=SKILL_GAP_THRESHOLD)
            .select_related("skill_tag", "skill_tag__subject")
            .order_by("p_mastery")[:10]
        )

    def _upcoming_exams(self, student, days_ahead: int) -> list:
        """Assessments of type exam/quiz scheduled in the next days_ahead days."""
        from academic.models import Assessment

        now = timezone.now()
        end = now + timedelta(days=days_ahead)
        return list(
            Assessment.objects.using(self.db_alias)
            .filter(
                type__in=["exam", "quiz"],
                scheduled_at__range=(now, end),
                subject__in=self._student_subjects(student),
            )
            .select_related("subject")
            .order_by("scheduled_at")
        )

    def _new_content_nodes(self, student) -> list:
        """Active learning-path nodes not yet completed, ordered by path order."""
        from ai_engine.models import LearningNode

        return list(
            LearningNode.objects.using(self.db_alias)
            .filter(
                learning_path__student=student,
                learning_path__is_active=True,
                status__in=["unlocked", "in_progress"],
            )
            .select_related("learning_path", "learning_path__subject")
            .order_by("order")[:20]
        )

    def _student_subjects(self, student) -> list:
        from academic.models import Subject

        if getattr(student, "academic_class", None):
            return list(
                Subject.objects.using(self.db_alias)
                .filter(classes=student.academic_class)
                .distinct()
            )
        return []

    # ------------------------------------------------------------------ #
    # Slot builder
    # ------------------------------------------------------------------ #

    @staticmethod
    def _build_slots(day: date, daily_goal_minutes: int, max_slots: int) -> list[tuple]:
        """
        Divide the student's daily goal into up to max_slots study blocks.
        Returns list of (start_datetime, end_datetime, duration_minutes).
        """
        import datetime

        from django.utils import timezone as tz

        per_slot = max(20, daily_goal_minutes // max_slots)
        # Session start times: 16:00, 18:00, 20:00
        starts = [datetime.time(16, 0), datetime.time(18, 0), datetime.time(20, 0)]
        slots = []
        for t in starts[:max_slots]:
            start_dt = tz.make_aware(datetime.datetime.combine(day, t))
            end_dt = start_dt + datetime.timedelta(minutes=per_slot)
            slots.append((start_dt, end_dt, per_slot))
        return slots

    # ------------------------------------------------------------------ #
    # Event factory
    # ------------------------------------------------------------------ #

    def _create_event(
        self,
        tenant,
        student,
        title: str,
        description: str,
        event_type: str,
        subject,
        start,
        end,
        estimated_minutes: int,
        node_id=None,
        skill_tag_id=None,
    ):
        from ai_engine.models import StudyEvent

        return StudyEvent.objects.using(self.db_alias).create(
            tenant=tenant,
            student=student,
            title=title,
            description=description,
            event_type=event_type,
            subject=subject,
            start_time=start,
            end_time=end,
            estimated_minutes=estimated_minutes,
            node_id=node_id,
            skill_tag_id=skill_tag_id,
        )
