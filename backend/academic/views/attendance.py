# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import models
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.mixins import TenantScopedQuerysetMixin

from ..models import Attendance, Parent, Student, Teacher
from ..serializers.academic import AttendanceSerializer


class AttendanceViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = "student__user__tenant"

    def _role(self):
        return (getattr(self.request.user, "role", "") or "").lower()

    def _can_edit(self):
        return self._role() in {"teacher", "admin", "staff", "saas_admin"}

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if (
            self.action in {"create", "update", "partial_update", "destroy"}
            and not self._can_edit()
        ):
            raise PermissionDenied("You do not have permission to modify attendance.")

    def _teacher_scope_queryset(self, queryset):
        teacher_profile = (
            Teacher.objects.prefetch_related("assigned_classes")
            .filter(user=self.request.user)
            .first()
        )
        if not teacher_profile:
            return queryset.none()

        class_ids = list(teacher_profile.assigned_classes.values_list("id", flat=True))
        taught_subject_filter = models.Q(subject__teacher=teacher_profile) | models.Q(
            subject__additional_teachers=teacher_profile
        )
        class_filter = (
            models.Q(student__academic_class_id__in=class_ids)
            if class_ids
            else models.Q(pk__in=[])
        )
        return queryset.filter(taught_subject_filter | class_filter).distinct()

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self._role()

        if role == "student":
            student_profile = getattr(self.request.user, "student_profile", None)
            queryset = (
                queryset.filter(student=student_profile)
                if student_profile
                else queryset.none()
            )
        elif role == "parent":
            parent_profile = (
                Parent.objects.prefetch_related("students")
                .filter(user=self.request.user)
                .first()
            )
            if not parent_profile:
                queryset = queryset.none()
            else:
                queryset = queryset.filter(student__in=parent_profile.students.all())
        elif role == "teacher":
            queryset = self._teacher_scope_queryset(queryset)

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset

    def _ensure_teacher_can_modify(self, student, subject):
        if self._role() != "teacher":
            return
        teacher_profile = (
            Teacher.objects.prefetch_related("assigned_classes")
            .filter(user=self.request.user)
            .first()
        )
        if not teacher_profile:
            raise PermissionDenied("Teacher profile not found.")

        manages_subject = (
            subject.teacher_id == teacher_profile.teacher_id
            or subject.additional_teachers.filter(
                teacher_id=teacher_profile.teacher_id
            ).exists()
        )
        manages_class = (
            teacher_profile.assigned_classes.filter(
                id=student.academic_class_id
            ).exists()
            if student.academic_class_id
            else False
        )
        if not (manages_subject or manages_class):
            raise PermissionDenied(
                "You can only mark attendance for your assigned subjects/classes."
            )

    def perform_create(self, serializer):
        student = serializer.validated_data.get("student")
        subject = serializer.validated_data.get("subject")
        student_tenant = getattr(getattr(student, "user", None), "tenant", None)
        user_tenant = getattr(self.request.user, "tenant", None)
        if user_tenant and student_tenant and user_tenant != student_tenant:
            raise PermissionDenied("Cross-tenant attendance update denied.")
        self._ensure_teacher_can_modify(student, subject)
        serializer.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        student = serializer.validated_data.get("student", instance.student)
        subject = serializer.validated_data.get("subject", instance.subject)
        self._ensure_teacher_can_modify(student, subject)
        serializer.save()

    @action(detail=False, methods=["get"])
    def my_attendance(self, request):
        """Get the current student's attendance records"""
        try:
            student = Student.objects.get(user=request.user)
            records = self.get_queryset().filter(student=student).order_by("-date")
            serializer = self.get_serializer(records, many=True)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response(
                {"error": "Student profile not found"}, status=status.HTTP_404_NOT_FOUND
            )
