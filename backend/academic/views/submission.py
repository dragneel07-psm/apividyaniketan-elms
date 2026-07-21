# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
SubmissionViewSet — student exam submissions and grading.
"""

import logging

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from academic.models.assessment import Assessment, Result
from academic.models.parent import Parent
from academic.models.student import Student
from academic.models.submission import Submission
from academic.serializers.assessment import SubmissionSerializer
from academic.services.grading_service import GradingService
from core.utils.audit import record_audit_event

from ._assessment_helpers import (
    _is_content_manager,
    _resolve_request_year,
    _role,
    _teacher_assessment_visibility_q,
    _teacher_can_manage_assessment,
)

logger = logging.getLogger(__name__)


class SubmissionViewSet(viewsets.ModelViewSet):
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {
            "create",
            "update",
            "partial_update",
            "destroy",
        } and not _is_content_manager(request.user):
            raise PermissionDenied("Only teachers/admin/staff can manage submissions.")

    def get_queryset(self):
        queryset = Submission.objects.select_related(
            "assessment", "assessment__academic_year", "student"
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
            student = Student.objects.filter(user=self.request.user).first()
            queryset = queryset.filter(student=student) if student else queryset.none()
        elif role == "parent":
            parent = (
                Parent.objects.prefetch_related("students")
                .filter(user=self.request.user)
                .first()
            )
            queryset = (
                queryset.filter(student__in=parent.students.all())
                if parent
                else queryset.none()
            )
        elif role == "teacher":
            queryset = queryset.filter(
                _teacher_assessment_visibility_q(self.request.user, prefix="assessment")
            ).distinct()

        return queryset

    @action(detail=False, methods=["post"])
    def submit_exam(self, request):
        """Submit a quiz/exam. Handles automatic grading for MCQs."""
        if _role(request.user) != "student":
            return Response(
                {"detail": "Only students can submit assessments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        assessment_id = request.data.get("assessment")
        answers = request.data.get("answers", {})
        time_taken = request.data.get("time_taken", 0)

        try:
            assessment_qs = Assessment.objects.filter(assessment_id=assessment_id)
            requested_year, has_year_filter = _resolve_request_year(request)
            if has_year_filter and not requested_year:
                return Response(
                    {"error": "Academic year not found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if requested_year:
                assessment_qs = assessment_qs.filter(academic_year=requested_year)
            assessment = assessment_qs.select_related("subject").get()
            student = Student.objects.get(user=request.user)
        except (Assessment.DoesNotExist, Student.DoesNotExist):
            return Response(
                {"error": "Invalid assessment or student"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            not student.academic_class_id
            or student.academic_class_id != assessment.subject.academic_class_id
        ):
            return Response(
                {"detail": "Assessment is outside your class scope."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if assessment.section_id and assessment.section_id != student.section_id:
            return Response(
                {"detail": "Assessment is outside your section scope."},
                status=status.HTTP_403_FORBIDDEN,
            )

        submission, _ = Submission.objects.update_or_create(
            assessment=assessment,
            student=student,
            defaults={"status": "submitted"},
        )

        total_score, max_possible, graded_answers = GradingService.grade_submission(
            assessment, answers
        )

        result, _ = Result.objects.update_or_create(
            assessment=assessment,
            student=student,
            defaults={
                "score": total_score,
                "time_taken_minutes": time_taken,
                "answers_data": graded_answers,
            },
        )

        try:
            from gamification.services.gamification_service import GamificationService

            GamificationService.on_assessment_complete(student, result)
        except ImportError:
            pass

        return Response(
            {
                "score": total_score,
                "max_score": max_possible,
                "result_id": result.result_id,
            }
        )

    @action(detail=True, methods=["post"])
    def grade(self, request, pk=None):
        """Manually grade a submission (Teacher only)."""
        submission = self.get_object()
        role = _role(request.user)
        if role not in {
            "teacher",
            "admin",
            "staff",
            "saas_admin",
            "management",
            "school_admin",
        }:
            return Response(
                {"detail": "You do not have permission to grade submissions."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if role == "teacher" and not _teacher_can_manage_assessment(
            request.user, submission.assessment
        ):
            return Response(
                {
                    "detail": "You can only grade submissions in your assigned classes/subjects."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        score = request.data.get("score")
        feedback = request.data.get("feedback")
        status_val = request.data.get("status", "graded")

        result = Result.objects.filter(
            assessment=submission.assessment, student=submission.student
        ).first()
        if not result:
            result = Result.objects.create(
                assessment=submission.assessment,
                student=submission.student,
                score=score or 0,
            )

        if score is not None:
            result.score = int(score)
        if feedback:
            result.teacher_feedback = feedback
        result.save()

        if hasattr(submission, "status"):
            submission.status = status_val
            submission.save()

        try:
            from gamification.services.gamification_service import GamificationService

            GamificationService.on_assessment_complete(submission.student, result)
        except ImportError:
            pass

        record_audit_event(
            action="academic.result_graded",
            user=request.user,
            request=request,
            details={
                "result_id": str(result.result_id),
                "assessment_id": str(submission.assessment_id),
                "student_id": str(submission.student_id),
                "score": result.score,
                "status": status_val,
            },
        )

        return Response({"status": "graded", "score": result.score})

    @action(detail=True, methods=["post"])
    def ai_grade(self, request, pk=None):
        """Trigger AI grading for a submission."""
        submission = self.get_object()
        role = _role(request.user)
        if role not in {
            "teacher",
            "admin",
            "staff",
            "saas_admin",
            "management",
            "school_admin",
        }:
            return Response(
                {"detail": "You do not have permission to AI-grade submissions."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if role == "teacher" and not _teacher_can_manage_assessment(
            request.user, submission.assessment
        ):
            return Response(
                {
                    "detail": "You can only grade submissions in your assigned classes/subjects."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        assessment = submission.assessment

        result = Result.objects.filter(
            assessment=assessment, student=submission.student
        ).first()
        answers = {}
        if result and result.answers_data:
            for q_id, data in result.answers_data.items():
                answers[q_id] = data.get("answer")

        total_score, max_possible, graded_answers = GradingService.grade_submission(
            assessment, answers
        )

        if not result:
            result = Result.objects.create(
                assessment=assessment,
                student=submission.student,
                score=total_score,
                answers_data=graded_answers,
            )
        else:
            result.score = total_score
            result.answers_data = graded_answers
            result.save()

        try:
            from gamification.services.gamification_service import GamificationService

            GamificationService.on_assessment_complete(submission.student, result)
        except ImportError:
            pass

        record_audit_event(
            action="academic.result_ai_graded",
            user=request.user,
            request=request,
            details={
                "result_id": str(result.result_id),
                "assessment_id": str(submission.assessment_id),
                "student_id": str(submission.student_id),
                "score": result.score,
            },
        )

        return Response(
            {
                "score": total_score,
                "max_score": max_possible,
                "graded_answers": graded_answers,
            }
        )
