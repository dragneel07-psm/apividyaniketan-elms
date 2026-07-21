# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from datetime import timedelta

from django.db.models import Count, F
from django.utils import timezone

from academic.models import LessonProgress, Result, Student
from gamification.models import (
    Badge,
    GamificationProfile,
    PointTransaction,
    StudentBadge,
)


class GamificationService:
    @staticmethod
    def get_or_create_profile(student):
        profile, created = GamificationProfile.objects.get_or_create(
            student=student,
            defaults={
                "tenant": student.user.tenant
            },  # Always use user tenant as source of truth
        )
        return profile

    @staticmethod
    def award_points(student, points, description, activity_type):
        """
        Record a point transaction and update profile stats.
        """
        tenant = student.user.tenant

        # 1. Create Transaction Record
        PointTransaction.objects.create(
            tenant=tenant,
            student=student,
            points=points,
            description=description,
            activity_type=activity_type,
        )

        # 2. Update Profile
        profile = GamificationService.get_or_create_profile(student)
        old_level = profile.current_level
        new_level = profile.add_xp(points)

        # 3. Check for Streak (if activity is daily relevant)
        if activity_type in ["lesson", "assessment"]:
            GamificationService.update_streak(profile)

        return {
            "level_up": new_level > old_level,
            "new_level": new_level,
            "current_xp": profile.current_xp,
            "next_level_xp": profile.xp_for_next_level,
        }

    @staticmethod
    def update_streak(profile):
        today = timezone.now().date()
        if profile.last_activity_date == today:
            return

        if profile.last_activity_date == today - timedelta(days=1):
            profile.current_streak += 1
        else:
            profile.current_streak = 1

        if profile.current_streak > profile.longest_streak:
            profile.longest_streak = profile.current_streak

        profile.last_activity_date = today
        profile.save()

    @staticmethod
    def check_badges(student):
        """
        Check and award badges based on student progress.
        """
        profile = GamificationService.get_or_create_profile(student)
        tenant = profile.tenant
        available_badges = Badge.objects.filter(tenant=tenant)
        earned_badge_ids = set(
            StudentBadge.objects.filter(student=student).values_list(
                "badge_id", flat=True
            )
        )

        new_badges = []

        for badge in available_badges:
            if badge.id in earned_badge_ids:
                continue

            should_award = False

            if badge.criteria_type == "lessons_completed":
                completed_count = LessonProgress.objects.filter(
                    student=student, completed=True
                ).count()
                if completed_count >= badge.criteria_value:
                    should_award = True

            elif badge.criteria_type == "streak_days":
                if profile.current_streak >= badge.criteria_value:
                    should_award = True

            elif badge.criteria_type == "perfect_score":
                perfect_exists = Result.objects.filter(
                    student=student, score=F("assessment__total_marks")
                ).exists()
                if perfect_exists:
                    should_award = True

            if should_award:
                sb = StudentBadge.objects.create(
                    tenant=tenant, student=student, badge=badge
                )
                new_badges.append(sb)
                # Award XP reward for badge
                GamificationService.award_points(
                    student, badge.xp_reward, f"Earned Badge: {badge.name}", "badge"
                )

        return new_badges

    @staticmethod
    def on_lesson_complete(student, lesson):
        """
        Called when a lesson is marked completed.
        """
        # 1. Award base XP for lesson
        result = GamificationService.award_points(
            student, 50, f"Completed lesson: {lesson.title}", "lesson"
        )

        # 2. Check for new badges
        new_badges = GamificationService.check_badges(student)

        return {
            "xp_earned": 50,
            "level_up": result["level_up"],
            "new_level": result["new_level"],
            "new_badges": [b.badge.name for b in new_badges],
        }

    @staticmethod
    def on_assessment_complete(student, result):
        """
        Called when an assessment is submitted/graded.
        """
        # Award points based on percentage
        percentage = (result.score / result.assessment.total_marks) * 100
        points = int(percentage * 1.0)  # e.g. 100% -> 100 points

        res = GamificationService.award_points(
            student,
            points,
            f"Completed {result.assessment.type}: {result.assessment.title}",
            "assessment",
        )

        new_badges = GamificationService.check_badges(student)

        return {
            "xp_earned": points,
            "level_up": res["level_up"],
            "new_badges": [b.badge.name for b in new_badges],
        }
