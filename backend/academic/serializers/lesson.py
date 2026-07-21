# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import serializers

from academic.models.lesson import Chapter, Lesson, LessonMaterial, LessonProgress


class LessonMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonMaterial
        fields = [
            "id",
            "lesson",
            "title",
            "file",
            "link",
            "material_type",
            "created_at",
        ]


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = [
            "id",
            "student",
            "lesson",
            "completed",
            "progress_percent",
            "video_watched_seconds",
            "video_duration_seconds",
            "last_accessed",
            "last_watched_at",
            "completed_at",
        ]


class LessonSummarySerializer(serializers.ModelSerializer):
    completed = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id",
            "chapter",
            "title",
            "content_type",
            "order",
            "is_published",
            "duration_minutes",
            "updated_at",
            "completed",
            "progress_percent",
        ]

    def _get_student(self, request):
        from academic.models.student import Student

        student = getattr(request.user, "student_profile", None)
        if student:
            return student
        return Student.objects.filter(user=request.user).first()

    def _get_progress(self, obj):
        cache = getattr(self, "_progress_cache", None)
        if cache is None:
            cache = {}
            setattr(self, "_progress_cache", cache)
        if obj.id in cache:
            return cache[obj.id]

        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            cache[obj.id] = None
            return None
        try:
            from academic.models.lesson import LessonProgress

            student = self._get_student(request)
            if not student:
                cache[obj.id] = None
                return None
            progress = LessonProgress.objects.filter(
                student=student, lesson=obj
            ).first()
            cache[obj.id] = progress
            return progress
        except Exception:
            cache[obj.id] = None
            return None

    def get_completed(self, obj):
        progress = self._get_progress(obj)
        return bool(progress.completed) if progress else False

    def get_progress_percent(self, obj):
        progress = self._get_progress(obj)
        if not progress:
            return 0
        if progress.completed:
            return 100
        return round(max(0, min(100, float(progress.progress_percent or 0))), 2)


class LessonDetailSerializer(serializers.ModelSerializer):
    materials = LessonMaterialSerializer(many=True, read_only=True)
    user_progress = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id",
            "chapter",
            "title",
            "content_type",
            "content",
            "video_url",
            "interactive_data",
            "assessment",
            "order",
            "is_published",
            "duration_minutes",
            "materials",
            "user_progress",
            "created_at",
            "updated_at",
        ]

    def get_user_progress(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            try:
                from academic.models.student import Student

                student = Student.objects.get(user=request.user)
                progress, _ = LessonProgress.objects.get_or_create(
                    student=student, lesson=obj
                )
                return LessonProgressSerializer(progress).data
            except Student.DoesNotExist:
                return None
        return None


class ChapterSerializer(serializers.ModelSerializer):
    lessons = LessonSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Chapter
        fields = [
            "id",
            "subject",
            "title",
            "description",
            "order",
            "is_published",
            "lessons",
            "created_at",
        ]
