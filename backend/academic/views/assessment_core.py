# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
AssessmentViewSet — CRUD, queryset filtering, gradebook, and inline grading.
"""

import logging

from django.db import models
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from academic.models import AcademicYear
from academic.models.assessment import Assessment
from academic.models.parent import Parent
from academic.models.student import Student
from academic.serializers.assessment import AssessmentSerializer
from academic.services.academic_year_service import ensure_current_academic_year

from ._assessment_helpers import (
    _is_admin_manager,
    _is_content_manager,
    _resolve_request_year,
    _role,
    _teacher_assessment_visibility_q,
    _teacher_can_manage_assessment,
    _teacher_can_manage_subject,
    _to_bool,
)
from ._assessment_promotion_mixin import AssessmentPromotionMixin
from ._assessment_publishing_mixin import AssessmentPublishingMixin

logger = logging.getLogger(__name__)


class AssessmentViewSet(
    AssessmentPublishingMixin, AssessmentPromotionMixin, viewsets.ModelViewSet
):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {
            "create",
            "update",
            "partial_update",
            "destroy",
        } and not _is_content_manager(request.user):
            raise PermissionDenied("Only teachers/admin/staff can manage assessments.")
        if self.action == "gradebook" and not _is_content_manager(request.user):
            raise PermissionDenied("Only teachers/admin/staff can access gradebook.")

    def _can_manage_assessment(self, user, assessment: Assessment) -> bool:
        if _is_admin_manager(user):
            return True
        if _role(user) == "teacher":
            return _teacher_can_manage_assessment(user, assessment)
        return False

    def get_queryset(self):
        queryset = Assessment.objects.select_related(
            "academic_year", "subject", "subject__academic_class", "section"
        ).all()
        role = _role(self.request.user)
        requested_year, has_year_filter = _resolve_request_year(self.request)
        if has_year_filter and not requested_year:
            return queryset.none()
        # Teachers see assessments for all their assigned years unless an explicit year is requested;
        # other roles default-filter to the current academic year.
        if requested_year and (has_year_filter or role != "teacher"):
            queryset = queryset.filter(academic_year=requested_year)

        subject_id = self.request.query_params.get("subject")
        section_id = self.request.query_params.get("section")
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        if role == "student":
            student = (
                Student.objects.select_related("section")
                .filter(user=self.request.user)
                .first()
            )
            if not student or not student.academic_class_id:
                return queryset.none()
            queryset = queryset.filter(
                subject__academic_class_id=student.academic_class_id
            )
            if student.section_id:
                queryset = queryset.filter(
                    models.Q(section_id=student.section_id)
                    | models.Q(section__isnull=True)
                )
            else:
                queryset = queryset.filter(section__isnull=True)
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
            queryset = queryset.filter(subject__academic_class_id__in=class_ids)
            if section_ids:
                queryset = queryset.filter(
                    models.Q(section_id__in=section_ids)
                    | models.Q(section__isnull=True)
                )
            else:
                queryset = queryset.filter(section__isnull=True)
        elif role == "teacher":
            queryset = queryset.filter(
                _teacher_assessment_visibility_q(self.request.user)
            ).distinct()

        return queryset

    def perform_create(self, serializer):
        academic_year = (
            serializer.validated_data.get("academic_year")
            or ensure_current_academic_year()
        )
        if _role(self.request.user) == "teacher":
            subject = serializer.validated_data.get("subject")
            if not _teacher_can_manage_subject(self.request.user, subject):
                raise PermissionDenied(
                    "You can only create assessments for your assigned classes/subjects."
                )
        serializer.save(academic_year=academic_year)

    def perform_update(self, serializer):
        instance = self.get_object()
        if _role(self.request.user) == "teacher" and not self._can_manage_assessment(
            self.request.user, instance
        ):
            raise PermissionDenied(
                "You can only edit assessments for your assigned classes/subjects."
            )
        subject = serializer.validated_data.get("subject", instance.subject)
        if _role(self.request.user) == "teacher" and not _teacher_can_manage_subject(
            self.request.user, subject
        ):
            raise PermissionDenied(
                "You can only move assessments to your assigned classes/subjects."
            )
        was_published = bool(instance.results_published)
        serializer.save()
        updated = serializer.instance

        if (
            not was_published
            and updated.results_published
            and updated.is_final_assessment
            and _to_bool(self.request.data.get("auto_upgrade_students"), True)
        ):
            from academic.services.academic_year_service import (
                promote_students_to_next_class,
            )

            promote_students_to_next_class(
                academic_year=updated.academic_year,
                rules=self._promotion_rules_from_request(self.request, updated),
                **self._promotion_scope_for_assessment(updated),
            )

    @action(detail=False, methods=["get"])
    def gradebook(self, request):
        """Returns a matrix of students and their assessment scores for a subject."""
        subject_id = request.query_params.get("subject")
        if not subject_id:
            return Response(
                {"error": "subject_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        assessments = (
            self.get_queryset()
            .filter(subject_id=subject_id)
            .order_by("scheduled_at", "created_at")
        )

        from academic.models.assessment import Result
        from academic.models.subject import Subject

        try:
            subject_qs = Subject.objects.filter(id=subject_id)
            requested_year, has_year_filter = _resolve_request_year(request)
            if has_year_filter and not requested_year:
                return Response({"error": "Academic year not found"}, status=404)
            if requested_year:
                subject_qs = subject_qs.filter(academic_year=requested_year)
            subject = subject_qs.get()
            if _role(request.user) == "teacher" and not _teacher_can_manage_subject(
                request.user, subject
            ):
                return Response(
                    {
                        "detail": "You can only view gradebook for your assigned classes/subjects."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            academic_class = subject.academic_class
            section_id = request.query_params.get("section")
            students = Student.objects.filter(academic_class=academic_class)
            if section_id:
                students = students.filter(section_id=section_id)
        except Subject.DoesNotExist:
            return Response({"error": "Subject not found"}, status=404)

        results = Result.objects.filter(
            assessment__in=assessments, student__in=students
        )
        results_map = {}
        for r in results:
            results_map[(r.student_id, r.assessment_id)] = r

        response_data = {
            "assessments": [
                {
                    "id": a.assessment_id,
                    "title": a.title,
                    "total_marks": a.total_marks,
                    "type": a.type,
                }
                for a in assessments
            ],
            "students": [],
        }
        for s in students:
            student_results = {}
            for a in assessments:
                result = results_map.get((s.id, a.assessment_id))
                student_results[str(a.assessment_id)] = {
                    "score": result.score if result else None,
                    "result_id": result.result_id if result else None,
                    "submitted_at": result.submitted_at if result else None,
                }
            response_data["students"].append(
                {
                    "id": s.id,
                    "name": s.user.get_full_name(),
                    "email": s.user.email,
                    "section_id": s.section_id,
                    "section_name": s.section.name if s.section else None,
                    "results": student_results,
                }
            )

        return Response(response_data)
