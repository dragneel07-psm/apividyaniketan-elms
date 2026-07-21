# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import serializers

from .models import (
    Project,
    ProjectAttachment,
    ProjectMember,
    ProjectSubmission,
    ProjectTask,
    ProjectUpdate,
    RubricTemplate,
)

# --- Light summary serializers used as nested read-only fields ---


class _UserBriefSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    username = serializers.CharField()
    full_name = serializers.SerializerMethodField()
    role = serializers.CharField()

    def get_full_name(self, obj):
        first = getattr(obj, "first_name", "") or ""
        last = getattr(obj, "last_name", "") or ""
        full = f"{first} {last}".strip()
        return full or obj.username


class _StudentBriefSerializer(serializers.Serializer):
    student_id = serializers.UUIDField()
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        user = getattr(obj, "user", None)
        if user is None:
            return ""
        first = getattr(user, "first_name", "") or ""
        last = getattr(user, "last_name", "") or ""
        full = f"{first} {last}".strip()
        return full or user.username


class _SectionBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    academic_class_name = serializers.SerializerMethodField()

    def get_academic_class_name(self, obj):
        return getattr(getattr(obj, "academic_class", None), "name", "")


# --- Member ---


class ProjectMemberSerializer(serializers.ModelSerializer):
    student_detail = _StudentBriefSerializer(source="student", read_only=True)

    class Meta:
        model = ProjectMember
        fields = [
            "membership_id",
            "project",
            "student",
            "student_detail",
            "role",
            "joined_at",
        ]
        read_only_fields = ["membership_id", "joined_at", "student_detail"]


# --- Task ---


class ProjectTaskSerializer(serializers.ModelSerializer):
    assignee_detail = _StudentBriefSerializer(source="assignee", read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProjectTask
        fields = [
            "task_id",
            "project",
            "title",
            "description",
            "assignee",
            "assignee_detail",
            "weight",
            "status",
            "order",
            "due_date",
            "completed_at",
            "is_overdue",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "task_id",
            "assignee_detail",
            "completed_at",
            "is_overdue",
            "created_by",
            "created_at",
            "updated_at",
        ]


# --- Update / activity feed ---


class ProjectUpdateSerializer(serializers.ModelSerializer):
    author_detail = _UserBriefSerializer(source="author", read_only=True)

    class Meta:
        model = ProjectUpdate
        fields = [
            "update_id",
            "project",
            "task",
            "author",
            "author_detail",
            "kind",
            "body",
            "meta",
            "created_at",
        ]
        read_only_fields = ["update_id", "author", "author_detail", "created_at"]


# --- Submission ---


class ProjectSubmissionSerializer(serializers.ModelSerializer):
    submitted_by_detail = _UserBriefSerializer(source="submitted_by", read_only=True)

    class Meta:
        model = ProjectSubmission
        fields = [
            "submission_id",
            "project",
            "submitted_by",
            "submitted_by_detail",
            "notes",
            "is_final",
            "is_late",
            "submitted_at",
        ]
        read_only_fields = [
            "submission_id",
            "submitted_by",
            "submitted_by_detail",
            "is_late",
            "submitted_at",
        ]


# --- Attachment ---


class ProjectAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_detail = _UserBriefSerializer(source="uploaded_by", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ProjectAttachment
        fields = [
            "attachment_id",
            "project",
            "task",
            "update",
            "file",
            "file_url",
            "mime_type",
            "size_bytes",
            "uploaded_by",
            "uploaded_by_detail",
            "uploaded_at",
        ]
        read_only_fields = [
            "attachment_id",
            "uploaded_by",
            "uploaded_by_detail",
            "uploaded_at",
            "file_url",
        ]

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


# --- Project ---


class ProjectSerializer(serializers.ModelSerializer):
    mentor = serializers.PrimaryKeyRelatedField(
        queryset=Project._meta.get_field("mentor").related_model.objects.all(),
        required=False,
    )
    mentor_detail = _UserBriefSerializer(source="mentor", read_only=True)
    leader_detail = _StudentBriefSerializer(source="leader", read_only=True)
    section_detail = _SectionBriefSerializer(source="section", read_only=True)

    progress_percent = serializers.FloatField(read_only=True)
    progress_label = serializers.CharField(read_only=True)
    member_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "project_id",
            "title",
            "description",
            "subject",
            "section",
            "section_detail",
            "mentor",
            "mentor_detail",
            "leader",
            "leader_detail",
            "is_group",
            "min_group_size",
            "max_group_size",
            "start_date",
            "due_date",
            "status",
            "final_grade",
            "rubric_json",
            "progress_percent",
            "progress_label",
            "member_count",
            "task_count",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "project_id",
            "mentor_detail",
            "leader_detail",
            "section_detail",
            "progress_percent",
            "progress_label",
            "member_count",
            "task_count",
            "final_grade",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def get_member_count(self, obj):
        return obj.members.count()

    def get_task_count(self, obj):
        return obj.tasks.count()

    def validate(self, attrs):
        # Run model.clean() on a hypothetical instance for cross-field invariants.
        instance = self.instance or Project()
        for field, value in attrs.items():
            setattr(instance, field, value)
        instance.clean()
        return attrs


# --- Rubric Template ---


class RubricTemplateSerializer(serializers.ModelSerializer):
    owner_detail = _UserBriefSerializer(source="owner", read_only=True)
    is_shared = serializers.BooleanField(read_only=True)

    class Meta:
        model = RubricTemplate
        fields = [
            "template_id",
            "name",
            "description",
            "owner",
            "owner_detail",
            "subject",
            "criteria_json",
            "is_shared",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "template_id",
            "owner",
            "owner_detail",
            "is_shared",
            "created_at",
            "updated_at",
        ]

    def validate_criteria_json(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("criteria_json must be a list.")
        for i, entry in enumerate(value):
            if not isinstance(entry, dict):
                raise serializers.ValidationError(f"Entry {i} must be an object.")
            if not entry.get("criterion"):
                raise serializers.ValidationError(f"Entry {i} is missing 'criterion'.")
        return value
