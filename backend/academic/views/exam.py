# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.core.exceptions import ValidationError
from django.db import models
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from academic.models import Assessment, Exam, ExamSeating, Student
from academic.models.parent import Parent
from academic.models.teacher import Teacher
from academic.serializers.exam import ExamSeatingSerializer, ExamSerializer
from academic.services.exam_service import ExamService


def _role(user) -> str:
    return (getattr(user, "role", "") or "").lower()


def _is_exam_manager(user) -> bool:
    return _role(user) in {
        "teacher",
        "admin",
        "staff",
        "saas_admin",
        "management",
        "school_admin",
    }


def _is_admin_manager(user) -> bool:
    return _role(user) in {"admin", "staff", "saas_admin", "management", "school_admin"}


def _teacher_profile(user):
    return (
        Teacher.objects.prefetch_related("assigned_classes").filter(user=user).first()
    )


def _teacher_exam_visibility_q(user, prefix: str = ""):
    teacher = _teacher_profile(user)
    if not teacher:
        return models.Q(pk__in=[])
    class_ids = [
        cid for cid in teacher.assigned_classes.values_list("id", flat=True) if cid
    ]
    pre = f"{prefix}__" if prefix else ""
    return (
        models.Q(**{f"{pre}assessment__subject__teacher": teacher})
        | models.Q(**{f"{pre}assessment__subject__additional_teachers": teacher})
        | models.Q(**{f"{pre}assessment__subject__academic_class_id__in": class_ids})
    )


def _teacher_can_manage_exam(user, exam: Exam) -> bool:
    teacher = _teacher_profile(user)
    if not teacher:
        return False
    subject = getattr(getattr(exam, "assessment", None), "subject", None)
    if not subject:
        return False
    if teacher.teacher_id == getattr(subject, "teacher_id", None):
        return True
    if subject.additional_teachers.filter(teacher_id=teacher.teacher_id).exists():
        return True
    class_id = getattr(subject, "academic_class_id", None)
    return bool(class_id and teacher.assigned_classes.filter(id=class_id).exists())


class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {
            "create",
            "update",
            "partial_update",
            "destroy",
            "allocate_seating",
            "publish",
            "generate_hall_tickets",
        } and not _is_exam_manager(request.user):
            raise PermissionDenied("Only teachers/admin/staff can manage exams.")

    def get_queryset(self):
        queryset = Exam.objects.select_related(
            "assessment", "assessment__subject", "assessment__section"
        ).order_by("-updated_at", "-created_at")
        role = _role(self.request.user)

        if _is_admin_manager(self.request.user):
            return queryset
        if role == "teacher":
            return queryset.filter(
                _teacher_exam_visibility_q(self.request.user)
            ).distinct()
        if role == "student":
            student = (
                Student.objects.select_related("section")
                .filter(user=self.request.user)
                .first()
            )
            if not student or not student.academic_class_id:
                return queryset.none()
            queryset = queryset.filter(
                assessment__subject__academic_class_id=student.academic_class_id,
                is_published=True,
            )
            if student.section_id:
                queryset = queryset.filter(
                    models.Q(assessment__section_id=student.section_id)
                    | models.Q(assessment__section__isnull=True)
                )
            else:
                queryset = queryset.filter(assessment__section__isnull=True)
            return queryset
        if role == "parent":
            parent = (
                Parent.objects.prefetch_related("students")
                .filter(user=self.request.user)
                .first()
            )
            if not parent:
                return queryset.none()
            class_ids = [
                cid
                for cid in parent.students.values_list("academic_class_id", flat=True)
                if cid
            ]
            if not class_ids:
                return queryset.none()
            section_ids = [
                sid
                for sid in parent.students.values_list("section_id", flat=True)
                if sid
            ]
            queryset = queryset.filter(
                assessment__subject__academic_class_id__in=class_ids, is_published=True
            )
            if section_ids:
                queryset = queryset.filter(
                    models.Q(assessment__section_id__in=section_ids)
                    | models.Q(assessment__section__isnull=True)
                )
            else:
                queryset = queryset.filter(assessment__section__isnull=True)
            return queryset

        return queryset.none()

    def perform_create(self, serializer):
        assessment = serializer.validated_data.get("assessment")
        if _role(self.request.user) == "teacher":
            exam_proxy = Exam(assessment=assessment)
            if not _teacher_can_manage_exam(self.request.user, exam_proxy):
                raise PermissionDenied(
                    "You can only create exams for your assigned classes/subjects."
                )
        serializer.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        assessment = serializer.validated_data.get("assessment", instance.assessment)
        if _role(self.request.user) == "teacher":
            exam_proxy = instance
            exam_proxy.assessment = assessment
            if not _teacher_can_manage_exam(self.request.user, exam_proxy):
                raise PermissionDenied(
                    "You can only edit exams in your assigned classes/subjects."
                )
        serializer.save()

    @action(detail=True, methods=["post"])
    def allocate_seating(self, request, pk=None):
        """Triggers the automated seating allocation logic via ExamService"""
        exam = self.get_object()
        if _role(request.user) == "teacher" and not _teacher_can_manage_exam(
            request.user, exam
        ):
            return Response(
                {
                    "detail": "You can only allocate seating for your assigned classes/subjects."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            count = ExamService.allocate_seating(pk)
            return Response(
                {
                    "message": f"Successfully allocated seating for {count} students.",
                    "count": count,
                },
                status=status.HTTP_200_OK,
            )
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Allocation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publishes the exam, making it visible to students and triggering notifications"""
        exam = self.get_object()
        if _role(request.user) == "teacher" and not _teacher_can_manage_exam(
            request.user, exam
        ):
            return Response(
                {
                    "detail": "You can only publish exams for your assigned classes/subjects."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if ExamService.publish_exam(pk):
            return Response(
                {"message": "Exam published successfully."}, status=status.HTTP_200_OK
            )
        return Response(
            {"message": "Exam is already published."}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"])
    def generate_hall_tickets(self, request, pk=None):
        """Legacy alias for allocate_seating (for backward compatibility)"""
        return self.allocate_seating(request, pk)


class ExamSeatingViewSet(viewsets.ModelViewSet):
    queryset = ExamSeating.objects.all()
    serializer_class = ExamSeatingSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {
            "create",
            "update",
            "partial_update",
            "destroy",
        } and not _is_exam_manager(request.user):
            raise PermissionDenied("Only teachers/admin/staff can manage exam seating.")

    def get_queryset(self):
        queryset = ExamSeating.objects.select_related(
            "exam",
            "exam__assessment",
            "exam__assessment__subject",
            "exam__assessment__section",
            "student",
            "student__user",
        ).order_by("exam_id", "seat_number")
        role = _role(self.request.user)
        if _is_admin_manager(self.request.user):
            return queryset
        if role == "teacher":
            return queryset.filter(
                _teacher_exam_visibility_q(self.request.user, prefix="exam")
            ).distinct()
        if role == "student":
            student = Student.objects.filter(user=self.request.user).first()
            return queryset.filter(student=student) if student else queryset.none()
        if role == "parent":
            parent = (
                Parent.objects.prefetch_related("students")
                .filter(user=self.request.user)
                .first()
            )
            return (
                queryset.filter(student__in=parent.students.all())
                if parent
                else queryset.none()
            )
        return queryset.none()

    def perform_create(self, serializer):
        exam = serializer.validated_data.get("exam")
        if _role(self.request.user) == "teacher" and not _teacher_can_manage_exam(
            self.request.user, exam
        ):
            raise PermissionDenied(
                "You can only create seating for your assigned classes/subjects."
            )
        serializer.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        exam = serializer.validated_data.get("exam", instance.exam)
        if _role(self.request.user) == "teacher" and not _teacher_can_manage_exam(
            self.request.user, exam
        ):
            raise PermissionDenied(
                "You can only update seating for your assigned classes/subjects."
            )
        serializer.save()
