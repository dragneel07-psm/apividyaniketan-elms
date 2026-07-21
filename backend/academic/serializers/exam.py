# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import serializers

from academic.models import Exam, ExamSeating, Student
from academic.models.assessment import Assessment

from .assessment import AssessmentSerializer


class ExamSeatingSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="student.user.get_full_name", read_only=True
    )
    student_id_code = serializers.CharField(source="student.student_id", read_only=True)

    class Meta:
        model = ExamSeating
        fields = [
            "seating_id",
            "exam",
            "student",
            "student_name",
            "student_id_code",
            "hall_ticket_number",
            "room_number",
            "seat_number",
            "attendance_status",
        ]
        read_only_fields = ["seating_id", "hall_ticket_number"]


class ExamSerializer(serializers.ModelSerializer):
    # Override the FK field to accept any Assessment UUID (not filtered by type='exam').
    # The validate_assessment method coerces the type and ensures no duplicate Exam exists.
    assessment = serializers.PrimaryKeyRelatedField(
        queryset=Assessment.objects.all(),
        pk_field=serializers.UUIDField(format="hex_verbose"),
    )
    assessment_details = AssessmentSerializer(source="assessment", read_only=True)
    seating_arrangements = ExamSeatingSerializer(many=True, read_only=True)

    class Meta:
        model = Exam
        fields = [
            "exam_id",
            "assessment",
            "assessment_details",
            "hall_ticket_prefix",
            "exam_center",
            "seating_capacity",
            "instructions",
            "is_published",
            "results_released",
            "seating_arrangements",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["exam_id", "created_at", "updated_at"]

    def validate_assessment(self, assessment):
        # Ensure the linked assessment is (or will be) type='exam'.
        if assessment.type != "exam":
            assessment.type = "exam"
            assessment.save(update_fields=["type"])
        # Reject if another Exam record already links this assessment (OneToOne constraint).
        instance = self.instance  # None on create, set on update
        qs = Exam.objects.filter(assessment=assessment)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "An exam record already exists for this assessment."
            )
        return assessment
