# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
from rest_framework import serializers

from academic.models.nepal_result import (
    AnswerPaperCode,
    ExamSubject,
    ExamTerm,
    MarkEntry,
    NepalGradingProfile,
    StudentTermResult,
)


class NepalGradingProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = NepalGradingProfile
        exclude = []
        read_only_fields = ["profile_id", "is_system_default", "created_at", "updated_at"]


class ExamTermSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True)
    grading_profile_name = serializers.CharField(source="grading_profile.name", read_only=True)
    subject_count = serializers.IntegerField(source="exam_subjects.count", read_only=True)

    class Meta:
        model = ExamTerm
        exclude = []
        read_only_fields = ["term_id", "status", "published_at", "published_by", "created_by", "created_at", "updated_at"]
        extra_kwargs = {"grading_profile": {"required": False}}

    def validate(self, attrs):
        attrs = super().validate(attrs)
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date cannot be before start date."})
        return attrs


class ExamSubjectSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    class_name = serializers.CharField(source="section.academic_class.name", read_only=True)
    section_name = serializers.CharField(source="section.name", read_only=True)
    examiner_name = serializers.CharField(source="examiner.user.get_full_name", read_only=True)
    full_marks = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    paper_count = serializers.IntegerField(source="papers.count", read_only=True)

    class Meta:
        model = ExamSubject
        fields = "__all__"
        read_only_fields = ["exam_subject_id", "marking_status", "submitted_at", "verified_at", "verified_by"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        subject = attrs.get("subject", getattr(self.instance, "subject", None))
        section = attrs.get("section", getattr(self.instance, "section", None))
        if subject and section and subject.academic_class_id != section.academic_class_id:
            raise serializers.ValidationError({"section": "Section must belong to the subject's class."})
        total = sum(attrs.get(field, getattr(self.instance, field, 0) if self.instance else 0) or 0 for field in (
            "theory_full_marks", "internal_full_marks", "practical_full_marks"
        ))
        if total <= 0:
            raise serializers.ValidationError({"theory_full_marks": "At least one marks component must be greater than zero."})
        return attrs


class PaperCodeSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="exam_subject.subject.name", read_only=True)
    class_name = serializers.CharField(source="exam_subject.section.academic_class.name", read_only=True)
    section_name = serializers.CharField(source="exam_subject.section.name", read_only=True)
    has_marks = serializers.SerializerMethodField()

    class Meta:
        model = AnswerPaperCode
        fields = ["paper_id", "exam_subject", "code_hint", "subject_name", "class_name", "section_name", "has_marks", "is_void"]

    def get_has_marks(self, obj):
        try:
            obj.mark_entry
            return True
        except MarkEntry.DoesNotExist:
            return False


class MarkEntrySerializer(serializers.ModelSerializer):
    total_obtained = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    paper_hint = serializers.CharField(source="paper.code_hint", read_only=True)

    class Meta:
        model = MarkEntry
        fields = "__all__"
        read_only_fields = ["entry_id", "paper", "status", "version", "entered_by", "updated_at"]


class StudentTermResultSerializer(serializers.ModelSerializer):
    term_name = serializers.CharField(source="term.name", read_only=True)
    academic_year = serializers.CharField(source="term.academic_year.name", read_only=True)
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)

    class Meta:
        model = StudentTermResult
        fields = "__all__"
        read_only_fields = [field.name for field in StudentTermResult._meta.fields]
