# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import models
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from academic.models.lesson import Chapter, Lesson, LessonMaterial, LessonProgress
from academic.models.parent import Parent
from academic.models.student import Student
from academic.models.teacher import Teacher
from academic.serializers.lesson import (
    ChapterSerializer,
    LessonDetailSerializer,
    LessonMaterialSerializer,
    LessonProgressSerializer,
    LessonSummarySerializer,
)
from academic.services.academic_year_service import ensure_current_academic_year


def _role(user) -> str:
    return (getattr(user, "role", "") or "").lower()


def _is_content_manager(user) -> bool:
    return _role(user) in {"teacher", "admin", "staff", "saas_admin"}


def _parent_class_ids(user):
    parent_profile = (
        Parent.objects.prefetch_related("students").filter(user=user).first()
    )
    if not parent_profile:
        return []
    return [
        cid
        for cid in parent_profile.students.values_list("academic_class_id", flat=True)
        if cid
    ]


def _teacher_visibility_q(user, prefix: str = ""):
    teacher_profile = (
        Teacher.objects.prefetch_related("assigned_classes").filter(user=user).first()
    )
    if not teacher_profile:
        return models.Q(pk__in=[])

    class_ids = [
        cid
        for cid in teacher_profile.assigned_classes.values_list("id", flat=True)
        if cid
    ]
    pre = f"{prefix}__" if prefix else ""
    return (
        models.Q(**{f"{pre}chapter__subject__teacher": teacher_profile})
        | models.Q(**{f"{pre}chapter__subject__additional_teachers": teacher_profile})
        | models.Q(**{f"{pre}chapter__subject__academic_class_id__in": class_ids})
    )


class ChapterViewSet(viewsets.ModelViewSet):
    queryset = Chapter.objects.all()
    serializer_class = ChapterSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {
            "create",
            "update",
            "partial_update",
            "destroy",
            "reorder",
        } and not _is_content_manager(request.user):
            raise PermissionDenied("Only teachers/admin/staff can manage chapters.")

    def get_queryset(self):
        queryset = super().get_queryset()
        role = _role(self.request.user)

        academic_year_param = self.request.query_params.get("academic_year")
        if academic_year_param:
            if str(academic_year_param).isdigit():
                queryset = queryset.filter(
                    subject__academic_year_id=academic_year_param
                )
            else:
                queryset = queryset.filter(
                    subject__academic_year__name=academic_year_param
                )
        elif role != "teacher":
            current_year = ensure_current_academic_year()
            if current_year:
                queryset = queryset.filter(subject__academic_year=current_year)

        # Role-based visibility
        if role == "student":
            queryset = queryset.filter(is_published=True)
            student_profile = getattr(self.request.user, "student_profile", None)
            if student_profile and student_profile.academic_class_id:
                queryset = queryset.filter(
                    subject__academic_class_id=student_profile.academic_class_id
                )
            else:
                queryset = queryset.none()
        elif role == "parent":
            class_ids = _parent_class_ids(self.request.user)
            queryset = (
                queryset.filter(
                    is_published=True, subject__academic_class_id__in=class_ids
                )
                if class_ids
                else queryset.none()
            )
        elif role == "teacher":
            teacher_profile = (
                Teacher.objects.prefetch_related("assigned_classes")
                .filter(user=self.request.user)
                .first()
            )
            if not teacher_profile:
                queryset = queryset.none()
            else:
                class_ids = [
                    cid
                    for cid in teacher_profile.assigned_classes.values_list(
                        "id", flat=True
                    )
                    if cid
                ]
                queryset = queryset.filter(
                    models.Q(subject__teacher=teacher_profile)
                    | models.Q(subject__additional_teachers=teacher_profile)
                    | models.Q(subject__academic_class_id__in=class_ids)
                ).distinct()

        subject_id = self.request.query_params.get("subject")
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        return queryset.order_by("order")

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """
        Reorder chapters. Expects { orders: [ { id: 1, order: 1 }, ... ] }
        """
        orders = request.data.get("orders", [])
        for item in orders:
            try:
                chapter = self.get_queryset().get(id=item["id"])
                chapter.order = item["order"]
                chapter.save()
            except Chapter.DoesNotExist:
                continue
        return Response({"status": "reordered"})


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return LessonSummarySerializer
        return LessonDetailSerializer

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {
            "create",
            "update",
            "partial_update",
            "destroy",
            "reorder",
        } and not _is_content_manager(request.user):
            raise PermissionDenied("Only teachers/admin/staff can manage lessons.")
        if (
            self.action in {"toggle_progress", "update_progress"}
            and _role(request.user) != "student"
        ):
            raise PermissionDenied("Only students can update lesson progress.")

    def get_queryset(self):
        queryset = super().get_queryset()
        role = _role(self.request.user)

        academic_year_param = self.request.query_params.get("academic_year")
        if academic_year_param:
            if str(academic_year_param).isdigit():
                queryset = queryset.filter(
                    chapter__subject__academic_year_id=academic_year_param
                )
            else:
                queryset = queryset.filter(
                    chapter__subject__academic_year__name=academic_year_param
                )
        elif role != "teacher":
            current_year = ensure_current_academic_year()
            if current_year:
                queryset = queryset.filter(chapter__subject__academic_year=current_year)

        # Role-based visibility
        if role == "student":
            queryset = queryset.filter(is_published=True, chapter__is_published=True)
            student_profile = getattr(self.request.user, "student_profile", None)
            if student_profile and student_profile.academic_class_id:
                queryset = queryset.filter(
                    chapter__subject__academic_class_id=student_profile.academic_class_id
                )
            else:
                queryset = queryset.none()
        elif role == "parent":
            class_ids = _parent_class_ids(self.request.user)
            queryset = (
                queryset.filter(
                    is_published=True,
                    chapter__is_published=True,
                    chapter__subject__academic_class_id__in=class_ids,
                )
                if class_ids
                else queryset.none()
            )
        elif role == "teacher":
            queryset = queryset.filter(
                _teacher_visibility_q(self.request.user)
            ).distinct()

        chapter_id = self.request.query_params.get("chapter")
        if chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)

        subject_id = self.request.query_params.get("subject")
        if subject_id:
            queryset = queryset.filter(chapter__subject_id=subject_id)

        return queryset.order_by("chapter__order", "order")

    def _award_lesson_rewards_if_needed(self, student, lesson, progress):
        if not progress.completed or progress.xp_awarded:
            return
        try:
            from gamification.services.gamification_service import GamificationService

            GamificationService.on_lesson_complete(student, lesson)
            progress.xp_awarded = True
            progress.save(update_fields=["xp_awarded"])
        except ImportError:
            # Gamification app may not be enabled in all environments.
            pass

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """
        Reorder lessons. Expects { orders: [ { id: 1, order: 1 }, ... ] }
        """
        orders = request.data.get("orders", [])
        for item in orders:
            try:
                lesson = self.get_queryset().get(id=item["id"])
                lesson.order = item["order"]
                lesson.save()
            except Lesson.DoesNotExist:
                continue
        return Response({"status": "reordered"})

    @action(detail=True, methods=["post"])
    def toggle_progress(self, request, pk=None):
        """
        Toggle completion status for the current student.
        """
        lesson = self.get_object()

        try:
            student = Student.objects.get(user=request.user)
            progress, _ = LessonProgress.objects.get_or_create(
                student=student, lesson=lesson
            )

            # Toggle logic
            progress.completed = not progress.completed
            if progress.completed:
                progress.completed_at = timezone.now()
                progress.progress_percent = 100
                if progress.video_duration_seconds > 0:
                    progress.video_watched_seconds = max(
                        float(progress.video_watched_seconds or 0),
                        float(progress.video_duration_seconds or 0),
                    )
            else:
                progress.completed_at = None
                if float(progress.progress_percent or 0) >= 100:
                    progress.progress_percent = 99.0

            progress.save()
            self._award_lesson_rewards_if_needed(student, lesson, progress)

            return Response(
                {
                    "completed": progress.completed,
                    "progress_percent": round(float(progress.progress_percent or 0), 2),
                    "user_progress": LessonProgressSerializer(progress).data,
                }
            )
        except Student.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=404)

    @action(detail=True, methods=["post"])
    def update_progress(self, request, pk=None):
        """
        Update lesson progress with partial progress support for video watch tracking.
        Expects one or more of:
        - watched_seconds (number)
        - duration_seconds (number)
        - progress_percent (number 0-100)
        """
        lesson = self.get_object()

        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=404)

        progress, _ = LessonProgress.objects.get_or_create(
            student=student, lesson=lesson
        )

        def to_float(value):
            if value is None or value == "":
                return None
            try:
                return float(value)
            except (TypeError, ValueError):
                return None

        watched_seconds = to_float(request.data.get("watched_seconds"))
        duration_seconds = to_float(request.data.get("duration_seconds"))
        reported_percent = to_float(request.data.get("progress_percent"))

        if (
            watched_seconds is None
            and duration_seconds is None
            and reported_percent is None
        ):
            return Response(
                {
                    "error": "Provide at least one of watched_seconds, duration_seconds, or progress_percent."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if duration_seconds is not None and duration_seconds > 0:
            progress.video_duration_seconds = max(
                float(progress.video_duration_seconds or 0), duration_seconds
            )

        if watched_seconds is not None and watched_seconds >= 0:
            progress.video_watched_seconds = max(
                float(progress.video_watched_seconds or 0), watched_seconds
            )
            progress.last_watched_at = timezone.now()

        candidate_percentages = [float(progress.progress_percent or 0)]
        if reported_percent is not None:
            candidate_percentages.append(reported_percent)
        if progress.video_duration_seconds > 0:
            candidate_percentages.append(
                (
                    float(progress.video_watched_seconds or 0)
                    / float(progress.video_duration_seconds)
                )
                * 100
            )

        next_percent = max(candidate_percentages)
        next_percent = max(0.0, min(100.0, next_percent))
        progress.progress_percent = next_percent

        newly_completed = False
        if next_percent >= 95 and not progress.completed:
            progress.completed = True
            progress.completed_at = timezone.now()
            newly_completed = True
        elif progress.completed and next_percent < 95:
            # Do not auto-uncomplete once completed.
            progress.progress_percent = max(progress.progress_percent, 100.0)

        if progress.completed and float(progress.progress_percent or 0) < 100:
            progress.progress_percent = 100.0

        progress.save()
        if newly_completed:
            self._award_lesson_rewards_if_needed(student, lesson, progress)

        return Response(
            {
                "completed": progress.completed,
                "progress_percent": round(float(progress.progress_percent or 0), 2),
                "user_progress": LessonProgressSerializer(progress).data,
            }
        )


class LessonMaterialViewSet(viewsets.ModelViewSet):
    queryset = LessonMaterial.objects.all()
    serializer_class = LessonMaterialSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {
            "create",
            "update",
            "partial_update",
            "destroy",
        } and not _is_content_manager(request.user):
            raise PermissionDenied(
                "Only teachers/admin/staff can manage lesson materials."
            )

    def get_queryset(self):
        queryset = super().get_queryset().select_related("lesson__chapter__subject")
        role = _role(self.request.user)

        if role == "student":
            student_profile = getattr(self.request.user, "student_profile", None)
            if student_profile and student_profile.academic_class_id:
                queryset = queryset.filter(
                    lesson__is_published=True,
                    lesson__chapter__is_published=True,
                    lesson__chapter__subject__academic_class_id=student_profile.academic_class_id,
                )
            else:
                queryset = queryset.none()
        elif role == "parent":
            class_ids = _parent_class_ids(self.request.user)
            queryset = (
                queryset.filter(
                    lesson__is_published=True,
                    lesson__chapter__is_published=True,
                    lesson__chapter__subject__academic_class_id__in=class_ids,
                )
                if class_ids
                else queryset.none()
            )
        elif role == "teacher":
            queryset = queryset.filter(
                _teacher_visibility_q(self.request.user, prefix="lesson")
            ).distinct()

        lesson_id = self.request.query_params.get("lesson")
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)
        return queryset
