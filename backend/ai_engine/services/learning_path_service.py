# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from typing import List, Optional

from django.utils import timezone

from academic.models import Lesson, LessonProgress, Result, Student, Subject
from ai_engine.models import LearningNode, LearningPath


class LearningPathService:
    def generate_path(
        self, student: Student, subject: Optional[Subject] = None
    ) -> LearningPath:
        """
        Generate a personalized learning path for a student.

        Priority order:
          1. BKT skill gaps — lessons tagged with low-mastery skills (below 0.6)
          2. Weak assessment areas — recent results < 70%
          3. Curriculum progression — next unfinished published lessons
        """
        from ai_engine.models import SkillMastery
        from ai_engine.services.bkt_service import BKTService

        tenant = student.user.tenant
        db_alias = (
            getattr(student, "_state", None).db
            if hasattr(student, "_state")
            else "default"
        )

        current_date = timezone.now().date()
        title = (
            f"{subject.name} Mastery Path - {current_date}"
            if subject
            else f"Personalized Learning Path - {current_date}"
        )

        path = LearningPath.objects.using(db_alias).create(
            tenant=tenant,
            student=student,
            subject=subject,
            title=title,
            description=(
                "AI-generated personalized learning path based on skill mastery, "
                "recent performance, and curriculum progression."
            ),
        )

        nodes_created = 0
        bkt = BKTService()

        # --- Strategy 1: BKT Skill Gaps (p_mastery < 0.6) ---
        skill_gaps = bkt.get_skill_gaps(student, db_alias=db_alias, limit=5)
        added_lesson_ids: set = set()

        for mastery_obj in skill_gaps:
            if mastery_obj.p_mastery >= 0.6:
                break
            skill = mastery_obj.skill_tag
            # Find published lessons tagged with this skill
            skill_lessons = skill.lessons.using(db_alias).filter(is_published=True)
            if subject:
                skill_lessons = skill_lessons.filter(chapter__subject=subject)
            for lesson in skill_lessons[:2]:
                if str(lesson.id) in added_lesson_ids:
                    continue
                LearningNode.objects.using(db_alias).create(
                    learning_path=path,
                    title=f"Strengthen: {lesson.title}",
                    description=(
                        f"Your mastery of '{skill.name}' is {mastery_obj.p_mastery:.0%}. "
                        f"Reviewing this lesson will help you improve."
                    ),
                    resource_type="article",
                    lesson=lesson,
                    order=nodes_created + 1,
                    status="unlocked" if nodes_created == 0 else "locked",
                    estimated_minutes=lesson.duration_minutes,
                )
                added_lesson_ids.add(str(lesson.id))
                nodes_created += 1

        # --- Strategy 2: Weak Assessment Areas (score < 70%) ---
        result_filter = {"student": student, "score__lt": 70}
        if subject:
            result_filter["assessment__subject"] = subject

        weak_results = (
            Result.objects.using(db_alias)
            .filter(**result_filter)
            .select_related("assessment")
            .order_by("-submitted_at")[:3]
        )

        for res in weak_results:
            assessment = res.assessment
            LearningNode.objects.using(db_alias).create(
                learning_path=path,
                title=f"Review: {assessment.title}",
                description=(
                    f"Your recent score of {res.score}% indicates room for improvement. "
                    f"Focus on the core concepts of this assessment."
                ),
                resource_type="topic",
                order=nodes_created + 1,
                status="unlocked" if nodes_created == 0 else "locked",
                estimated_minutes=30,
            )
            nodes_created += 1

        # --- Strategy 3: Curriculum Progression (next unfinished lessons) ---
        lesson_filter = {"is_published": True}
        if subject:
            lesson_filter["chapter__subject"] = subject
        elif student.academic_class:
            lesson_filter["chapter__subject__academic_class"] = student.academic_class

        all_lessons = (
            Lesson.objects.using(db_alias)
            .filter(**lesson_filter)
            .order_by("chapter__order", "order")
        )

        completed_lesson_ids = (
            LessonProgress.objects.using(db_alias)
            .filter(
                student=student,
                completed=True,
            )
            .values_list("lesson_id", flat=True)
        )

        next_lessons = all_lessons.exclude(id__in=completed_lesson_ids).exclude(
            id__in=added_lesson_ids
        )[:3]

        for lesson in next_lessons:
            LearningNode.objects.using(db_alias).create(
                learning_path=path,
                title=f"Learn: {lesson.title}",
                description=f"Next recommended step in your {lesson.chapter.subject.name} curriculum.",
                resource_type="video",
                lesson=lesson,
                order=nodes_created + 1,
                status="unlocked" if nodes_created == 0 else "locked",
                estimated_minutes=lesson.duration_minutes,
            )
            nodes_created += 1

        return path

    def get_active_path(
        self, student: Student, subject: Optional[Subject] = None
    ) -> Optional[LearningPath]:
        """
        Retrieve the most recent active path for a student.
        """
        db_alias = (
            getattr(student, "_state", None).db
            if hasattr(student, "_state")
            else "default"
        )
        query = LearningPath.objects.using(db_alias).filter(
            student=student, is_active=True
        )
        if subject:
            query = query.filter(subject=subject)

        return query.order_by("-created_at").first()
