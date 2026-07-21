# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import serializers

from ..models.timetable import Timetable


class TimetableSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(
        source="teacher.user.get_full_name", read_only=True
    )
    academic_class_name = serializers.CharField(
        source="academic_class.name", read_only=True
    )
    academic_year_name = serializers.CharField(
        source="academic_year.name", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    approved_by_name = serializers.CharField(
        source="approved_by.get_full_name", read_only=True
    )

    id = serializers.IntegerField(source="timetable_id", read_only=True)

    class Meta:
        model = Timetable
        fields = [
            "id",
            "timetable_id",
            "academic_year",
            "academic_year_name",
            "academic_class",
            "academic_class_name",
            "day_of_week",
            "start_time",
            "end_time",
            "subject_name",
            "teacher",
            "teacher_name",
            "room_number",
            "entry_type",
            "status",
            "approval_comment",
            "created_by",
            "created_by_name",
            "approved_by",
            "approved_by_name",
            "approved_at",
        ]
        read_only_fields = ["created_by", "approved_by", "approved_at"]

    def validate(self, attrs):
        start_time = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end_time = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError(
                {"end_time": "End time must be after start time."}
            )
        return attrs
