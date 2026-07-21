# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import serializers

from academic.models.assessment import Assessment, Result
from academic.models.question import Question
from academic.models.submission import Submission


class QuestionSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="question_id", read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "question_id",
            "assessment",
            "text",
            "type",
            "options",
            "correct_answer",
            "points",
            "order",
            "tags",
            "difficulty",
        ]


class AssessmentSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    id = serializers.UUIDField(source="assessment_id", read_only=True)

    subject_name = serializers.CharField(source="subject.name", read_only=True)
    academic_year_name = serializers.CharField(
        source="academic_year.name", read_only=True
    )

    class Meta:
        model = Assessment
        fields = [
            "id",
            "assessment_id",
            "academic_year",
            "academic_year_name",
            "subject",
            "subject_name",
            "section",
            "title",
            "description",
            "type",
            "total_marks",
            "passing_marks",
            "scheduled_at",
            "due_date",
            "duration_minutes",
            "blooms_level",
            "is_final_assessment",
            "results_published",
            "results_published_at",
            "questions",
        ]


class SubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="student.user.get_full_name", read_only=True
    )
    id = serializers.UUIDField(source="submission_id", read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id",
            "submission_id",
            "assessment",
            "student",
            "student_name",
            "content",
            "file_url",
            "submitted_at",
            "status",
            "is_graded",
        ]


class ResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="student.user.get_full_name", read_only=True
    )
    assessment_title = serializers.CharField(source="assessment.title", read_only=True)
    id = serializers.UUIDField(source="result_id", read_only=True)

    class Meta:
        model = Result
        fields = [
            "id",
            "result_id",
            "assessment",
            "assessment_title",
            "student",
            "student_name",
            "score",
            "time_taken_minutes",
            "submitted_at",
            "ai_feedback",
            "teacher_feedback",
            "graded_by",
            "answers_data",
        ]
