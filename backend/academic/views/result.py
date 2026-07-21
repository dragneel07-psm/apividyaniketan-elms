# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
ResultViewSet — assessment results CRUD and AI feedback.
"""

import json
import logging

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from academic.models.assessment import Result
from academic.models.parent import Parent
from academic.models.student import Student
from academic.serializers.assessment import ResultSerializer
from core.utils.audit import record_audit_event

from ._assessment_helpers import (
    _is_admin_manager,
    _is_content_manager,
    _resolve_request_year,
    _role,
    _teacher_assessment_visibility_q,
    _teacher_can_manage_assessment,
)

logger = logging.getLogger(__name__)


class ResultViewSet(viewsets.ModelViewSet):
    queryset = Result.objects.all()
    serializer_class = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {
            "create",
            "update",
            "partial_update",
            "destroy",
        } and not _is_content_manager(request.user):
            raise PermissionDenied("Only teachers/admin/staff can manage results.")

    def get_queryset(self):
        queryset = Result.objects.select_related(
            "assessment", "assessment__academic_year", "student", "student__user"
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
        if _is_admin_manager(self.request.user):
            return queryset
        if role == "teacher":
            return queryset.filter(
                _teacher_assessment_visibility_q(self.request.user, prefix="assessment")
            ).distinct()
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

        student = Student.objects.filter(user=self.request.user).first()
        return queryset.filter(student=student) if student else queryset.none()

    def perform_update(self, serializer):
        assessment = serializer.validated_data.get(
            "assessment", serializer.instance.assessment
        )
        if _role(self.request.user) == "teacher" and not _teacher_can_manage_assessment(
            self.request.user, assessment
        ):
            raise PermissionDenied(
                "You can only edit results in your assigned classes/subjects."
            )
        before = serializer.instance
        previous_score = before.score
        previous_feedback = before.teacher_feedback

        if _role(self.request.user) in {
            "teacher",
            "admin",
            "staff",
            "saas_admin",
            "management",
            "school_admin",
        }:
            updated = serializer.save(graded_by=self.request.user)
        else:
            updated = serializer.save()

        record_audit_event(
            action="academic.result_updated",
            user=self.request.user,
            request=self.request,
            details={
                "result_id": str(updated.result_id),
                "assessment_id": str(updated.assessment_id),
                "student_id": str(updated.student_id),
                "before": {
                    "score": previous_score,
                    "teacher_feedback": previous_feedback,
                },
                "after": {
                    "score": updated.score,
                    "teacher_feedback": updated.teacher_feedback,
                },
            },
        )

    def perform_create(self, serializer):
        assessment = serializer.validated_data.get("assessment")
        if _role(self.request.user) == "teacher" and not _teacher_can_manage_assessment(
            self.request.user, assessment
        ):
            raise PermissionDenied(
                "You can only create results in your assigned classes/subjects."
            )
        if _role(self.request.user) in {
            "teacher",
            "admin",
            "staff",
            "saas_admin",
            "management",
            "school_admin",
        }:
            result = serializer.save(graded_by=self.request.user)
        else:
            result = serializer.save()
        record_audit_event(
            action="academic.result_created",
            user=self.request.user,
            request=self.request,
            details={
                "result_id": str(result.result_id),
                "assessment_id": str(result.assessment_id),
                "student_id": str(result.student_id),
                "score": result.score,
            },
        )

    @action(detail=True, methods=["post"])
    def generate_ai_feedback(self, request, pk=None):
        """Generates qualitative AI feedback for this result."""
        result = self.get_object()

        try:
            from ai_engine.services.tutor_service import ai_tutor_service

            prompt = f"""
            Analyze the following student performance and provide a constructive summary.
            Student: {result.student.user.get_full_name()}
            Assessment: {result.assessment.title}
            Score: {result.score} / {result.assessment.total_marks}
            Time Taken: {result.time_taken_minutes} minutes

            Answer Breakdown:
            {json.dumps(result.answers_data, indent=2)}

            Provide:
            1. What they did well.
            2. Areas for improvement.
            3. A supportive general comment.
            Keep it encouraging and professional.
            """

            ai_response = ai_tutor_service.get_chat_response(
                [{"role": "user", "content": prompt}]
            )
            result.ai_feedback = ai_response
            result.save()

            return Response({"ai_feedback": ai_response})
        except Exception as e:
            try:
                percent = 0
                if result.assessment.total_marks:
                    percent = (
                        float(result.score or 0)
                        / float(result.assessment.total_marks)
                        * 100
                    )
                if percent >= 85:
                    message = "Strong performance. Keep practicing advanced questions to maintain this level."
                elif percent >= 60:
                    message = "Good progress. Review missed concepts and reattempt similar questions for better retention."
                else:
                    message = "Keep going. Revisit foundational concepts first, then practice short, focused question sets."
                result.ai_feedback = message
            except Exception:
                result.ai_feedback = "Good effort. Review core concepts and practice similar questions to improve your next attempt."
            result.save()
            return Response({"ai_feedback": result.ai_feedback, "error": str(e)})
