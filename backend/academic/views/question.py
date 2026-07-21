# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
QuestionViewSet — CRUD for assessment questions.
"""

import logging

from django.db import models
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from academic.models.parent import Parent
from academic.models.question import Question
from academic.models.student import Student
from academic.serializers.assessment import QuestionSerializer

from ._assessment_helpers import (
    _is_content_manager,
    _resolve_request_year,
    _role,
    _teacher_assessment_visibility_q,
    _teacher_can_manage_assessment,
)

logger = logging.getLogger(__name__)


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {
            "create",
            "update",
            "partial_update",
            "destroy",
        } and not _is_content_manager(request.user):
            raise PermissionDenied("Only teachers/admin/staff can manage questions.")

    def get_queryset(self):
        queryset = Question.objects.select_related(
            "assessment", "assessment__academic_year"
        ).all()
        requested_year, has_year_filter = _resolve_request_year(self.request)
        if has_year_filter and not requested_year:
            return queryset.none()
        if requested_year:
            queryset = queryset.filter(assessment__academic_year=requested_year)

        assessment_id = self.request.query_params.get("assessment")
        if assessment_id:
            queryset = queryset.filter(assessment_id=assessment_id)

        role = _role(self.request.user)
        if role == "student":
            student = (
                Student.objects.select_related("section")
                .filter(user=self.request.user)
                .first()
            )
            if not student or not student.academic_class_id:
                return queryset.none()
            queryset = queryset.filter(
                assessment__subject__academic_class_id=student.academic_class_id
            )
            if student.section_id:
                queryset = queryset.filter(
                    models.Q(assessment__section_id=student.section_id)
                    | models.Q(assessment__section__isnull=True)
                )
            else:
                queryset = queryset.filter(assessment__section__isnull=True)
        elif role == "parent":
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
                assessment__subject__academic_class_id__in=class_ids
            )
            if section_ids:
                queryset = queryset.filter(
                    models.Q(assessment__section_id__in=section_ids)
                    | models.Q(assessment__section__isnull=True)
                )
            else:
                queryset = queryset.filter(assessment__section__isnull=True)
        elif role == "teacher":
            queryset = queryset.filter(
                _teacher_assessment_visibility_q(self.request.user, prefix="assessment")
            ).distinct()

        return queryset.order_by("order")

    def perform_create(self, serializer):
        assessment = serializer.validated_data.get("assessment")
        if _role(self.request.user) == "teacher" and not _teacher_can_manage_assessment(
            self.request.user, assessment
        ):
            raise PermissionDenied(
                "You can only add questions to your assigned classes/subjects."
            )
        serializer.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        assessment = serializer.validated_data.get("assessment", instance.assessment)
        if _role(self.request.user) == "teacher" and not _teacher_can_manage_assessment(
            self.request.user, assessment
        ):
            raise PermissionDenied(
                "You can only edit questions in your assigned classes/subjects."
            )
        serializer.save()
