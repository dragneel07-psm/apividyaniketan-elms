# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import serializers

from .models import (
    AiGeneratedArtifact,
    AIGradingDraft,
    AIInteractionLog,
    AITokenBudget,
    GradingRubric,
    LearningNode,
    LearningPath,
    SkillMastery,
    SkillPracticeEvent,
    SkillTag,
    StudentAIReport,
    StudyEvent,
    TutorConversation,
    TutorMessage,
)


class SkillTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillTag
        fields = ["id", "name", "description", "subject", "created_at"]
        read_only_fields = ["id", "created_at"]


class SkillMasterySerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill_tag.name", read_only=True)
    subject_name = serializers.SerializerMethodField()
    is_mastered = serializers.SerializerMethodField()

    class Meta:
        model = SkillMastery
        fields = [
            "id",
            "skill_tag",
            "skill_name",
            "subject_name",
            "p_mastery",
            "observations",
            "is_mastered",
            "updated_at",
        ]
        read_only_fields = fields

    def get_subject_name(self, obj) -> str:
        subject = getattr(obj.skill_tag, "subject", None)
        return subject.name if subject else ""

    def get_is_mastered(self, obj) -> bool:
        from ai_engine.services.bkt_service import BKTService

        return BKTService().is_mastered(obj.p_mastery)


class SkillPracticeEventSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill_tag.name", read_only=True)

    class Meta:
        model = SkillPracticeEvent
        fields = [
            "id",
            "skill_tag",
            "skill_name",
            "correct",
            "score_pct",
            "source_type",
            "source_id",
            "mastery_before",
            "mastery_after",
            "created_at",
        ]
        read_only_fields = fields


class SkillPracticeUpdateSerializer(serializers.Serializer):
    skill_tag_id = serializers.UUIDField()
    correct = serializers.BooleanField()
    score_pct = serializers.FloatField(min_value=0, max_value=100, default=0.0)
    source_type = serializers.ChoiceField(
        choices=["assessment", "lesson", "tutor"], default="assessment"
    )
    source_id = serializers.CharField(max_length=64, default="", allow_blank=True)


class TutorMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorMessage
        fields = [
            "id",
            "role",
            "content",
            "sources",
            "prompt_tokens",
            "completion_tokens",
            "is_demo",
            "confidence",
            "confidence_label",
            "mode",
            "created_at",
        ]
        read_only_fields = fields


class TutorConversationSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = TutorConversation
        fields = [
            "id",
            "subject",
            "lesson",
            "title",
            "created_at",
            "updated_at",
            "message_count",
        ]
        read_only_fields = fields

    def get_message_count(self, obj) -> int:
        return obj.messages.count()


class TutorConversationDetailSerializer(serializers.ModelSerializer):
    messages = TutorMessageSerializer(many=True, read_only=True)

    class Meta:
        model = TutorConversation
        fields = [
            "id",
            "subject",
            "lesson",
            "title",
            "created_at",
            "updated_at",
            "messages",
        ]
        read_only_fields = fields


class StudyEventSerializer(serializers.ModelSerializer):
    subject_name = serializers.SerializerMethodField()

    class Meta:
        model = StudyEvent
        fields = [
            "id",
            "title",
            "description",
            "event_type",
            "subject",
            "subject_name",
            "start_time",
            "end_time",
            "estimated_minutes",
            "is_completed",
            "node_id",
            "skill_tag_id",
            "tenant",
            "student",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "subject_name"]

    def get_subject_name(self, obj) -> str | None:
        return obj.subject.name if obj.subject else None


class AIInteractionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIInteractionLog
        fields = "__all__"


class StudentAIReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAIReport
        fields = "__all__"


class LearningNodeSerializer(serializers.ModelSerializer):
    is_due_for_review = serializers.SerializerMethodField()

    class Meta:
        model = LearningNode
        fields = "__all__"
        read_only_fields = [
            "id",
            "learning_path",
            "ease_factor",
            "interval_days",
            "repetitions",
            "next_review_at",
            "last_quality",
            "is_due_for_review",
        ]

    def get_is_due_for_review(self, obj) -> bool:
        from django.utils import timezone

        if obj.status != "completed" or obj.next_review_at is None:
            return False
        return obj.next_review_at <= timezone.now()


class LearningPathSerializer(serializers.ModelSerializer):
    nodes = LearningNodeSerializer(many=True, read_only=True)

    class Meta:
        model = LearningPath
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class AiGeneratedArtifactSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiGeneratedArtifact
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class LessonArtifactResponseSerializer(serializers.Serializer):
    summary = serializers.CharField()
    bullets = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    key_terms = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    practice_questions = serializers.ListField(
        child=serializers.CharField(), allow_empty=True
    )


class QuizGenerationRequestSerializer(serializers.Serializer):
    source_type = serializers.ChoiceField(choices=["lesson", "chapter"])
    source_id = serializers.CharField()
    difficulty = serializers.ChoiceField(choices=["easy", "medium", "hard"])
    count = serializers.IntegerField(min_value=1, max_value=30)


class QuizGenerationQuestionSerializer(serializers.Serializer):
    question_id = serializers.CharField(required=False)
    type = serializers.ChoiceField(choices=["mcq"])
    prompt = serializers.CharField()
    options = serializers.ListField(child=serializers.CharField(), min_length=2)
    correct_index = serializers.IntegerField(min_value=0)
    explanation = serializers.CharField(allow_blank=True, required=False)


class QuizGenerationResponseSerializer(serializers.Serializer):
    quiz_id = serializers.CharField()
    questions = QuizGenerationQuestionSerializer(many=True)


class ExamDifficultyMixSerializer(serializers.Serializer):
    easy = serializers.IntegerField(min_value=0, max_value=100)
    medium = serializers.IntegerField(min_value=0, max_value=100)
    hard = serializers.IntegerField(min_value=0, max_value=100)

    def validate(self, attrs):
        if int(attrs["easy"]) + int(attrs["medium"]) + int(attrs["hard"]) != 100:
            raise serializers.ValidationError(
                "difficulty_mix percentages must sum to 100."
            )
        return attrs


class ExamPaperGenerateRequestSerializer(serializers.Serializer):
    class_id = serializers.CharField()
    subject_id = serializers.CharField()
    units = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
        required=False,
        default=list,
    )
    marks = serializers.IntegerField(min_value=10, max_value=300)
    difficulty_mix = ExamDifficultyMixSerializer()


class ExamPaperQuestionSerializer(serializers.Serializer):
    type = serializers.CharField()
    prompt = serializers.CharField()
    marks = serializers.IntegerField(min_value=1)
    options = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True
    )


class ExamPaperSectionSerializer(serializers.Serializer):
    title = serializers.CharField()
    instructions = serializers.CharField(allow_blank=True, required=False)
    marks = serializers.IntegerField(min_value=1)
    questions = ExamPaperQuestionSerializer(many=True)


class ExamPaperSerializer(serializers.Serializer):
    title = serializers.CharField()
    total_marks = serializers.IntegerField(min_value=1)
    sections = ExamPaperSectionSerializer(many=True)


class ExamPaperGenerateResponseSerializer(serializers.Serializer):
    paper = ExamPaperSerializer()
    answer_key = serializers.JSONField()
    marking_scheme = serializers.JSONField()


class GradingRubricSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradingRubric
        fields = [
            "id",
            "title",
            "criteria",
            "total_points",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class CreateGradingRubricSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    criteria = serializers.JSONField(required=False)
    total_points = serializers.IntegerField(min_value=1, max_value=1000)

    def validate_criteria(self, value):
        if value is None:
            return []
        if not isinstance(value, (list, dict)):
            raise serializers.ValidationError("criteria must be a list or object.")
        return value


class GradeSubmissionRequestSerializer(serializers.Serializer):
    submission_id = serializers.CharField()
    rubric_id = serializers.CharField()


class ApproveGradingDraftRequestSerializer(serializers.Serializer):
    draft_id = serializers.CharField()


class AIGradingDraftSerializer(serializers.ModelSerializer):
    submission_id = serializers.UUIDField(
        source="submission.submission_id", read_only=True
    )
    rubric_id = serializers.UUIDField(source="rubric.id", read_only=True)

    class Meta:
        model = AIGradingDraft
        fields = [
            "id",
            "submission_id",
            "rubric_id",
            "score",
            "feedback",
            "criteria_breakdown",
            "status",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]


class GradeSubmissionDraftResponseSerializer(serializers.Serializer):
    draft_id = serializers.CharField()
    score = serializers.FloatField()
    feedback = serializers.CharField()
    criteria_breakdown = serializers.ListField(
        child=serializers.DictField(), allow_empty=True
    )
    status = serializers.CharField()


class AdminAssistantQueryRequestSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=2000)


class AdminAssistantQueryResponseSerializer(serializers.Serializer):
    answer = serializers.CharField()
    data = serializers.JSONField()
    query_type = serializers.ChoiceField(
        choices=["attendance", "fees", "students", "performance", "overview"]
    )


class ContentChunkSearchRequestSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=4000)
    top_k = serializers.IntegerField(
        min_value=1, max_value=20, required=False, default=5
    )
    min_similarity = serializers.FloatField(required=False, allow_null=True)
    context = serializers.DictField(required=False)
    source_type = serializers.ChoiceField(
        choices=["lesson", "chapter", "material"],
        required=False,
        allow_null=True,
    )
    source_id = serializers.CharField(required=False, allow_blank=False)

    def validate_context(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("context must be an object.")
        return value


class ContentChunkSearchResultSerializer(serializers.Serializer):
    chunk_id = serializers.UUIDField()
    source_type = serializers.ChoiceField(choices=["lesson", "chapter", "material"])
    source_id = serializers.CharField()
    text = serializers.CharField()
    metadata = serializers.JSONField()
    similarity = serializers.FloatField()


class ContentChunkSearchResponseSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = ContentChunkSearchResultSerializer(many=True)


class AITokenBudgetSerializer(serializers.ModelSerializer):
    remaining = serializers.SerializerMethodField()
    scope = serializers.SerializerMethodField()

    class Meta:
        model = AITokenBudget
        fields = [
            "id",
            "student",
            "daily_limit_tokens",
            "used_today",
            "remaining",
            "reset_at",
            "is_active",
            "scope",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "used_today", "created_at", "updated_at"]

    def get_remaining(self, obj) -> int | None:
        if obj.daily_limit_tokens == 0:
            return None
        return max(0, obj.daily_limit_tokens - obj.used_today)

    def get_scope(self, obj) -> str:
        return "student" if obj.student_id else "tenant"


class AITokenBudgetCreateSerializer(serializers.Serializer):
    daily_limit_tokens = serializers.IntegerField(min_value=0)
    student_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    is_active = serializers.BooleanField(default=True)
