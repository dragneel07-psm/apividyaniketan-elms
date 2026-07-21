# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Mixin providing result publish/reopen actions for AssessmentViewSet.
"""

import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from academic.models.assessment import Assessment, AssessmentResultPublicationAudit
from academic.services.academic_year_service import promote_students_to_next_class
from core.utils.audit import record_audit_event

from ._assessment_helpers import _is_admin_manager, _is_content_manager, _to_bool

logger = logging.getLogger(__name__)


class AssessmentPublishingMixin:
    """Actions and helpers for publishing/unpublishing/reopening assessment results."""

    def _can_publish_results(self, user):
        return bool(user and user.is_authenticated and _is_content_manager(user))

    def _can_reopen_results(self, user):
        return bool(user and user.is_authenticated and _is_admin_manager(user))

    def _publication_reason_from_request(self, request) -> str:
        return str(request.data.get("reason") or "").strip()

    def _record_publication_audit(
        self,
        *,
        assessment: Assessment,
        action: str,
        was_published: bool,
        is_published: bool,
        published_at_before,
        published_at_after,
        reason: str,
        user,
    ) -> None:
        AssessmentResultPublicationAudit.objects.create(
            assessment=assessment,
            action=action,
            was_published=was_published,
            is_published=is_published,
            published_at_before=published_at_before,
            published_at_after=published_at_after,
            reason=reason,
            performed_by=user,
        )
        record_audit_event(
            action="academic.results_publish_state_changed",
            user=user,
            request=getattr(self, "request", None),
            details={
                "assessment_id": str(assessment.assessment_id),
                "action": action,
                "was_published": was_published,
                "is_published": is_published,
                "published_at_before": published_at_before,
                "published_at_after": published_at_after,
                "reason": reason,
            },
        )

    @action(detail=True, methods=["post"])
    def publish_results(self, request, pk=None):
        if not self._can_publish_results(request.user):
            return Response(
                {"detail": "You do not have permission to publish results."},
                status=status.HTTP_403_FORBIDDEN,
            )

        assessment = self.get_object()
        if not self._can_manage_assessment(request.user, assessment):
            return Response(
                {
                    "detail": "You do not have permission to publish results for this assessment."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        publish = _to_bool(request.data.get("publish"), True)
        was_published = bool(assessment.results_published)
        published_at_before = assessment.results_published_at
        publication_reason = self._publication_reason_from_request(request)

        if publish:
            assessment.results_published = True
            assessment.results_published_at = timezone.now()
        else:
            assessment.results_published = False
            assessment.results_published_at = None
        assessment.save(update_fields=["results_published", "results_published_at"])
        self._record_publication_audit(
            assessment=assessment,
            action="publish" if publish else "unpublish",
            was_published=was_published,
            is_published=bool(assessment.results_published),
            published_at_before=published_at_before,
            published_at_after=assessment.results_published_at,
            reason=publication_reason,
            user=request.user,
        )

        promotion_summary = None
        if (
            publish
            and not was_published
            and assessment.is_final_assessment
            and _to_bool(request.data.get("auto_upgrade_students"), True)
        ):
            promotion_summary = promote_students_to_next_class(
                academic_year=assessment.academic_year,
                rules=self._promotion_rules_from_request(request, assessment),
                **self._promotion_scope_for_assessment(assessment),
            )

        return Response(
            {
                "assessment_id": str(assessment.assessment_id),
                "results_published": assessment.results_published,
                "results_published_at": assessment.results_published_at,
                "is_final_assessment": assessment.is_final_assessment,
                "student_promotion": promotion_summary,
            }
        )

    @action(detail=True, methods=["post"])
    def reopen_results(self, request, pk=None):
        if not self._can_reopen_results(request.user):
            return Response(
                {"detail": "You do not have permission to reopen results."},
                status=status.HTTP_403_FORBIDDEN,
            )

        assessment = self.get_object()
        if not self._can_manage_assessment(request.user, assessment):
            return Response(
                {
                    "detail": "You do not have permission to reopen results for this assessment."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if not assessment.is_final_assessment:
            return Response(
                {"detail": "Reopen is only available for final assessments."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not assessment.results_published:
            return Response(
                {"detail": "Results are already open for edits."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = self._publication_reason_from_request(request)
        if not reason:
            return Response(
                {"detail": "reason is required to reopen results."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        was_published = bool(assessment.results_published)
        published_at_before = assessment.results_published_at
        assessment.results_published = False
        assessment.results_published_at = None
        assessment.save(update_fields=["results_published", "results_published_at"])

        self._record_publication_audit(
            assessment=assessment,
            action="reopen",
            was_published=was_published,
            is_published=False,
            published_at_before=published_at_before,
            published_at_after=assessment.results_published_at,
            reason=reason,
            user=request.user,
        )

        return Response(
            {
                "assessment_id": str(assessment.assessment_id),
                "results_published": assessment.results_published,
                "results_published_at": assessment.results_published_at,
                "reopened": True,
            }
        )
