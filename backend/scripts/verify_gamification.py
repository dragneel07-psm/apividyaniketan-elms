# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys
import time

import django

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django_tenants.utils import schema_context

from academic.models import Lesson, LessonProgress, Student
from gamification.models import Badge, PointTransaction, StudentBadge
from users.models import UserAccount


def verify_gamification():
    print("🎮 Testing Gamification System...")

    tenant_schema = "demo"

    # We need to run inside schema context
    with schema_context(tenant_schema):
        # 1. Setup Data: Lesson and Badge
        student_user = UserAccount.objects.filter(role="student").first()
        if not student_user:
            print("❌ No student user found in 'demo' tenant.")
            return

        student = Student.objects.get(user=student_user)

        # Ensure a badge exists
        badge, _ = Badge.objects.get_or_create(
            tenant=student.user.tenant,
            name="First Lesson",
            defaults={
                "description": "Complete your first lesson",
                "criteria_type": "lessons_completed",
                "criteria_value": 1,
                "xp_reward": 100,
                "icon_name": "star",
            },
        )
        print(f"   Badge '{badge.name}' ready.")

        # 2. Simulate Lesson Completion
        lesson = Lesson.objects.first()  # Grab any lesson
        if not lesson:
            print("❌ No lessons found to complete.")
            return

        print(f"   Simulating completion of lesson: {lesson.title}")

        # Reset progress first to ensure clean test
        LessonProgress.objects.filter(student=student, lesson=lesson).delete()

        # Create Completion triggers signal
        progress = LessonProgress.objects.create(
            student=student, lesson=lesson, completed=True
        )

        # 3. Verify Points Awarded
        points = (
            PointTransaction.objects.filter(student=student, activity_type="lesson")
            .order_by("-timestamp")
            .first()
        )
        if points and points.points == 50:
            print("✅ Points awarded for lesson (50 XP).")
        else:
            print("❌ Points NOT awarded properly.")

        # 4. Verify Badge Awarded
        # Signal check_badges is triggered after save.
        # Badge criteria is 1 lesson. We just completed 1.
        has_badge = StudentBadge.objects.filter(student=student, badge=badge).exists()

        if has_badge:
            print(f"✅ Badge '{badge.name}' awarded!")

            # Verify Badge XP
            badge_points = (
                PointTransaction.objects.filter(student=student, activity_type="badge")
                .order_by("-timestamp")
                .first()
            )
            if badge_points and badge_points.points == 100:
                print("✅ Badge XP awarded (100 XP).")
            else:
                print("❌ Badge XP NOT awarded.")

        else:
            print("❌ Badge NOT awarded.")

        # Clean up (optional)
        # LessonProgress.objects.filter(student=student, lesson=lesson).delete()
        # StudentBadge.objects.filter(student=student, badge=badge).delete()


if __name__ == "__main__":
    verify_gamification()
