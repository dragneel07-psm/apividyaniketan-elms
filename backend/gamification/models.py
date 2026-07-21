# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid

from django.conf import settings
from django.db import models

from core.models.tenant import Tenant


class Badge(models.Model):
    CRITERIA_CHOICES = [
        ("lessons_completed", "Lessons Completed"),
        ("assessments_passed", "Assessments Passed"),
        ("streak_days", "Streak Days"),
        ("perfect_score", "Perfect Score on Assessment"),
        ("early_bird", "Early Submission"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon_name = models.CharField(max_length=50, default="award")  # Lucide icon name
    criteria_type = models.CharField(max_length=50, choices=CRITERIA_CHOICES)
    criteria_value = models.IntegerField(default=1)

    xp_reward = models.IntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.criteria_type})"


class StudentBadge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    student = models.ForeignKey(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="badges",
        db_constraint=False,
    )
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "badge")

    def __str__(self):
        return f"{self.student} - {self.badge.name}"


class PointTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    student = models.ForeignKey(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="points",
        db_constraint=False,
    )
    points = models.IntegerField()
    description = models.CharField(max_length=255)
    activity_type = models.CharField(
        max_length=50
    )  # 'lesson', 'quiz', 'badge', 'streak'
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student}: {self.points} for {self.description}"


class GamificationProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    student = models.OneToOneField(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="gamification_profile",
        db_constraint=False,
    )

    current_level = models.IntegerField(default=1)
    current_xp = models.IntegerField(default=0)  # XP towards next level
    total_xp = models.IntegerField(default=0)  # Lifetime XP

    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)

    is_public = models.BooleanField(default=True, help_text="Show in leaderboards")

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - Lvl {self.current_level}"

    @property
    def xp_for_next_level(self):
        # Formula: Level * 100 * 1.5 (Example, can be tuned)
        return int(self.current_level * 100 * 1.2)

    def add_xp(self, amount):
        self.total_xp += amount
        self.current_xp += amount

        # Check for level up
        while self.current_xp >= self.xp_for_next_level:
            self.current_xp -= self.xp_for_next_level
            self.current_level += 1
            # Here we could trigger a level up event/notification

        self.save()
        return self.current_level
