# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import serializers

from academic.models import Student

from .models import Badge, PointTransaction, StudentBadge


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = "__all__"


class StudentBadgeSerializer(serializers.ModelSerializer):
    badge_details = BadgeSerializer(source="badge", read_only=True)

    class Meta:
        model = StudentBadge
        fields = ["id", "badge", "badge_details", "earned_at"]


class PointTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointTransaction
        fields = "__all__"


class LeaderboardEntrySerializer(serializers.Serializer):
    student_id = serializers.UUIDField(source="student_id")
    student_name = serializers.CharField()
    total_points = serializers.IntegerField()
    badges_count = serializers.IntegerField()
    rank = serializers.IntegerField()


from .models import GamificationProfile


class GamificationProfileSerializer(serializers.ModelSerializer):
    next_level_xp = serializers.ReadOnlyField(source="xp_for_next_level")

    class Meta:
        model = GamificationProfile
        fields = [
            "current_level",
            "current_xp",
            "total_xp",
            "current_streak",
            "longest_streak",
            "next_level_xp",
        ]
