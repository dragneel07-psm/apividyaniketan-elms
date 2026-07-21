# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Mixin providing student promotion exception actions for AssessmentViewSet.
"""

import logging

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from academic.models.assessment import (
    Assessment,
    AssessmentResultPublicationAudit,
    StudentPromotionDecision,
    StudentPromotionDecisionHistory,
)
from academic.services.academic_year_service import (
    PROMOTION_HOLD_REASON_LABELS,
    PromotionRules,
    list_student_promotion_candidates,
)

from ._assessment_helpers import _to_bool

logger = logging.getLogger(__name__)


class AssessmentPromotionMixin:
    """Actions and helpers for managing student promotion exceptions."""

    def _promotion_scope_for_assessment(self, assessment):
        if getattr(assessment, "section_id", None):
            return {"section": assessment.section}
        if getattr(assessment, "subject_id", None) and getattr(
            assessment.subject, "academic_class_id", None
        ):
            return {"academic_class": assessment.subject.academic_class}
        return {}

    def _promotion_rules_from_request(self, request, assessment=None):
        payload = {}
        nested = request.data.get("promotion_rules")
        if isinstance(nested, dict):
            payload.update(nested)

        direct_fields = [
            "min_score_percentage",
            "min_attendance_percentage",
            "manual_promote_student_ids",
            "manual_hold_student_ids",
        ]
        for field_name in direct_fields:
            if field_name in request.data:
                payload[field_name] = request.data.get(field_name)
            elif field_name in request.query_params:
                payload[field_name] = request.query_params.get(field_name)

        rules = PromotionRules.from_payload(payload)
        if assessment is not None:
            return self._merge_stored_promotion_decisions(assessment, rules)
        return rules

    def _merge_stored_promotion_decisions(
        self, assessment: Assessment, rules: PromotionRules
    ) -> PromotionRules:
        promote_ids = {
            value.lower(): value for value in rules.manual_promote_student_ids
        }
        hold_ids = {value.lower(): value for value in rules.manual_hold_student_ids}

        stored_decisions = StudentPromotionDecision.objects.filter(
            assessment=assessment
        ).select_related("student")
        for decision in stored_decisions:
            student_id = str(decision.student_id)
            key = student_id.lower()
            if decision.decision == "promote":
                promote_ids[key] = student_id
                hold_ids.pop(key, None)
            elif decision.decision == "hold":
                hold_ids[key] = student_id
                promote_ids.pop(key, None)

        return PromotionRules(
            min_score_percentage=rules.min_score_percentage,
            min_attendance_percentage=rules.min_attendance_percentage,
            manual_promote_student_ids=tuple(promote_ids.values()),
            manual_hold_student_ids=tuple(hold_ids.values()),
        )

    def _decision_reason_from_request(self, request) -> str:
        return str(request.data.get("decision_reason") or "").strip()

    def _record_promotion_history(
        self,
        *,
        assessment: Assessment,
        student_id: str,
        action: str,
        previous_decision,
        new_decision,
        decision_reason: str,
        user,
    ) -> None:
        StudentPromotionDecisionHistory.objects.create(
            assessment=assessment,
            student_id=student_id,
            action=action,
            previous_decision=previous_decision,
            new_decision=new_decision,
            decision_reason=decision_reason,
            decided_by=user,
        )

    def _promotion_exception_rows(
        self, assessment: Assessment, request, rules: PromotionRules
    ):
        rows = list_student_promotion_candidates(
            academic_year=assessment.academic_year,
            rules=rules,
            include_unpublished_results=True,
            **self._promotion_scope_for_assessment(assessment),
        )
        decision_map = {
            str(item.student_id): item
            for item in StudentPromotionDecision.objects.filter(
                assessment=assessment
            ).select_related("decided_by")
        }
        history_map = {}
        history_rows = (
            StudentPromotionDecisionHistory.objects.filter(assessment=assessment)
            .select_related("decided_by")
            .order_by("-created_at")
        )
        for history_item in history_rows:
            key = str(history_item.student_id)
            if key not in history_map:
                history_map[key] = []
            if len(history_map[key]) >= 5:
                continue
            history_map[key].append(
                {
                    "action": history_item.action,
                    "previous_decision": history_item.previous_decision,
                    "new_decision": history_item.new_decision,
                    "decision_reason": history_item.decision_reason,
                    "decided_by": getattr(history_item.decided_by, "username", None),
                    "decided_by_name": (
                        f"{history_item.decided_by.first_name} {history_item.decided_by.last_name}".strip()
                        if getattr(history_item, "decided_by", None)
                        else ""
                    ),
                    "created_at": history_item.created_at,
                }
            )

        for row in rows:
            student_id = str(row.get("student_id"))
            saved_decision = decision_map.get(student_id)
            recommended = row.get("recommended_action")
            effective_action = recommended
            is_override = False
            decision_payload = None

            if saved_decision is not None:
                effective_action = saved_decision.decision
                is_override = saved_decision.decision != recommended
                decision_payload = {
                    "decision": saved_decision.decision,
                    "decision_reason": saved_decision.decision_reason,
                    "decided_by": getattr(saved_decision.decided_by, "username", None),
                    "decided_by_name": (
                        f"{saved_decision.decided_by.first_name} {saved_decision.decided_by.last_name}".strip()
                        if getattr(saved_decision, "decided_by", None)
                        else ""
                    ),
                    "updated_at": saved_decision.updated_at,
                }

            row["effective_action"] = effective_action
            row["is_override"] = bool(is_override)
            row["decision"] = decision_payload
            row["history"] = history_map.get(student_id, [])

        class_filter = request.query_params.get("class") or request.data.get("class")
        section_filter = request.query_params.get("section") or request.data.get(
            "section"
        )
        fail_reason_filter = request.query_params.get(
            "fail_reason"
        ) or request.data.get("fail_reason")

        if class_filter:
            rows = [
                row
                for row in rows
                if str(row.get("class_id") or "") == str(class_filter)
            ]
        if section_filter:
            rows = [
                row
                for row in rows
                if str(row.get("section_id") or "") == str(section_filter)
            ]
        if fail_reason_filter:
            if fail_reason_filter == "none":
                rows = [row for row in rows if not row.get("hold_reason")]
            else:
                rows = [
                    row for row in rows if row.get("hold_reason") == fail_reason_filter
                ]

        return rows

    def _promotion_exception_response(self, assessment: Assessment, request):
        rules = self._promotion_rules_from_request(request)
        rows = self._promotion_exception_rows(assessment, request, rules)
        locked = bool(assessment.results_published)

        recommended_promote = sum(
            1 for row in rows if row.get("recommended_action") == "promote"
        )
        recommended_hold = sum(
            1 for row in rows if row.get("recommended_action") == "hold"
        )
        decided_promote = sum(
            1 for row in rows if row.get("effective_action") == "promote"
        )
        decided_hold = sum(1 for row in rows if row.get("effective_action") == "hold")
        overrides = sum(1 for row in rows if row.get("is_override"))
        pending = sum(1 for row in rows if not row.get("decision"))

        class_counts = {}
        section_counts = {}
        fail_reason_counts = {}
        for row in rows:
            class_id = row.get("class_id")
            class_name = row.get("class_name") or "Unknown"
            if class_id is not None:
                key = str(class_id)
                item = class_counts.setdefault(
                    key, {"id": class_id, "name": class_name, "count": 0}
                )
                item["count"] += 1

            section_id = row.get("section_id")
            section_name = row.get("section_name") or "No Section"
            if section_id is not None:
                key = str(section_id)
                item = section_counts.setdefault(
                    key,
                    {
                        "id": section_id,
                        "class_id": class_id,
                        "name": section_name,
                        "count": 0,
                    },
                )
                item["count"] += 1

            reason_code = row.get("hold_reason") or "none"
            reason_item = fail_reason_counts.setdefault(
                reason_code,
                {
                    "code": reason_code,
                    "label": PROMOTION_HOLD_REASON_LABELS.get(
                        reason_code, "No hold reason"
                    ),
                    "count": 0,
                },
            )
            reason_item["count"] += 1

        summary = {
            "total_students": len(rows),
            "recommended_promote": recommended_promote,
            "recommended_hold": recommended_hold,
            "decided_promote": decided_promote,
            "decided_hold": decided_hold,
            "overrides": overrides,
            "pending_decisions": pending,
        }

        publication_audit = []
        for audit_item in (
            AssessmentResultPublicationAudit.objects.filter(assessment=assessment)
            .select_related("performed_by")
            .order_by("-created_at")[:5]
        ):
            publication_audit.append(
                {
                    "action": audit_item.action,
                    "was_published": audit_item.was_published,
                    "is_published": audit_item.is_published,
                    "reason": audit_item.reason,
                    "performed_by": getattr(audit_item.performed_by, "username", None),
                    "performed_by_name": (
                        f"{audit_item.performed_by.first_name} {audit_item.performed_by.last_name}".strip()
                        if getattr(audit_item, "performed_by", None)
                        else ""
                    ),
                    "created_at": audit_item.created_at,
                }
            )

        return {
            "assessment_id": str(assessment.assessment_id),
            "assessment_title": assessment.title,
            "is_final_assessment": bool(assessment.is_final_assessment),
            "locked": locked,
            "lock_reason": (
                "Promotion decisions are locked because final results are published. "
                "Unpublish/reopen results before editing exceptions."
                if locked
                else ""
            ),
            "rules": {
                "min_score_percentage": rules.min_score_percentage,
                "min_attendance_percentage": rules.min_attendance_percentage,
            },
            "summary": summary,
            "publication_audit": publication_audit,
            "students": rows,
            "available_filters": {
                "classes": list(class_counts.values()),
                "sections": list(section_counts.values()),
                "fail_reasons": list(fail_reason_counts.values()),
            },
        }

    @action(detail=True, methods=["get"])
    def promotion_exceptions(self, request, pk=None):
        if not self._can_publish_results(request.user):
            return Response(
                {
                    "detail": "You do not have permission to review promotion exceptions."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        assessment = self.get_object()
        if not self._can_manage_assessment(request.user, assessment):
            return Response(
                {
                    "detail": "You do not have permission to review promotion exceptions for this assessment."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if not assessment.is_final_assessment:
            return Response(
                {
                    "detail": "Promotion exceptions are only available for final assessments."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(self._promotion_exception_response(assessment, request))

    @action(detail=True, methods=["post"], url_path="promotion_exceptions/decide")
    def promotion_exceptions_decide(self, request, pk=None):
        if not self._can_publish_results(request.user):
            return Response(
                {
                    "detail": "You do not have permission to update promotion exceptions."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        assessment = self.get_object()
        if not self._can_manage_assessment(request.user, assessment):
            return Response(
                {
                    "detail": "You do not have permission to update promotion exceptions for this assessment."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if not assessment.is_final_assessment:
            return Response(
                {
                    "detail": "Promotion exceptions are only available for final assessments."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if assessment.results_published:
            return Response(
                {
                    "detail": (
                        "Promotion decisions are locked because final results are published. "
                        "Unpublish/reopen results before editing exceptions."
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )

        student_id = str(request.data.get("student_id") or "").strip()
        action_name = str(request.data.get("action") or "").strip().lower()
        if not student_id:
            return Response(
                {"detail": "student_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if action_name not in {"promote", "hold", "override", "clear"}:
            return Response(
                {"detail": "action must be one of: promote, hold, override, clear."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        decision_reason = self._decision_reason_from_request(request)
        if not decision_reason:
            return Response(
                {"detail": "decision_reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rules = self._promotion_rules_from_request(request)
        candidate_rows = list_student_promotion_candidates(
            academic_year=assessment.academic_year,
            rules=rules,
            include_unpublished_results=True,
            **self._promotion_scope_for_assessment(assessment),
        )
        row_map = {str(item.get("student_id")): item for item in candidate_rows}
        candidate = row_map.get(student_id)
        if candidate is None:
            return Response(
                {"detail": "Student is not part of this assessment promotion scope."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if action_name == "clear":
            existing_decision = StudentPromotionDecision.objects.filter(
                assessment=assessment,
                student_id=student_id,
            ).first()
            deleted_count, _ = StudentPromotionDecision.objects.filter(
                assessment=assessment,
                student_id=student_id,
            ).delete()
            if deleted_count and existing_decision is not None:
                self._record_promotion_history(
                    assessment=assessment,
                    student_id=student_id,
                    action="clear",
                    previous_decision=existing_decision.decision,
                    new_decision=None,
                    decision_reason=decision_reason,
                    user=request.user,
                )
            response_payload = self._promotion_exception_response(assessment, request)
            return Response(
                {
                    "updated": deleted_count > 0,
                    "cleared": bool(deleted_count),
                    "student_id": student_id,
                    "summary": response_payload.get("summary", {}),
                }
            )

        final_decision = action_name
        if action_name == "override":
            recommended = candidate.get("recommended_action")
            final_decision = "hold" if recommended == "promote" else "promote"

        existing_decision = StudentPromotionDecision.objects.filter(
            assessment=assessment,
            student_id=student_id,
        ).first()
        previous_decision = (
            existing_decision.decision if existing_decision is not None else None
        )

        StudentPromotionDecision.objects.update_or_create(
            assessment=assessment,
            student_id=student_id,
            defaults={
                "decision": final_decision,
                "decision_reason": decision_reason,
                "decided_by": request.user,
            },
        )
        self._record_promotion_history(
            assessment=assessment,
            student_id=student_id,
            action=action_name,
            previous_decision=previous_decision,
            new_decision=final_decision,
            decision_reason=decision_reason,
            user=request.user,
        )

        response_payload = self._promotion_exception_response(assessment, request)
        updated_row = next(
            (
                item
                for item in response_payload.get("students", [])
                if str(item.get("student_id")) == student_id
            ),
            None,
        )
        return Response(
            {
                "updated": True,
                "student_id": student_id,
                "decision": final_decision,
                "student": updated_row,
                "summary": response_payload.get("summary", {}),
            }
        )

    @action(detail=True, methods=["post"], url_path="promotion_exceptions/bulk")
    def promotion_exceptions_bulk(self, request, pk=None):
        if not self._can_publish_results(request.user):
            return Response(
                {
                    "detail": "You do not have permission to update promotion exceptions."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        assessment = self.get_object()
        if not self._can_manage_assessment(request.user, assessment):
            return Response(
                {
                    "detail": "You do not have permission to update promotion exceptions for this assessment."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if not assessment.is_final_assessment:
            return Response(
                {
                    "detail": "Promotion exceptions are only available for final assessments."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if assessment.results_published:
            return Response(
                {
                    "detail": (
                        "Promotion decisions are locked because final results are published. "
                        "Unpublish/reopen results before editing exceptions."
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )

        action_name = str(request.data.get("action") or "").strip().lower()
        if action_name not in {"promote", "hold", "override", "clear"}:
            return Response(
                {"detail": "action must be one of: promote, hold, override, clear."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        decision_reason = self._decision_reason_from_request(request)
        if not decision_reason:
            return Response(
                {"detail": "decision_reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rules = self._promotion_rules_from_request(request)
        rows = self._promotion_exception_rows(assessment, request, rules)
        if not rows:
            return Response(
                {
                    "updated": 0,
                    "matched_students": 0,
                    "summary": self._promotion_exception_response(
                        assessment, request
                    ).get("summary", {}),
                }
            )

        matched_student_ids = [str(item.get("student_id")) for item in rows]
        updated_count = 0

        with transaction.atomic():
            existing_map = {
                str(item.student_id): item
                for item in StudentPromotionDecision.objects.filter(
                    assessment=assessment,
                    student_id__in=matched_student_ids,
                )
            }
            if action_name == "clear":
                for student_id, existing_decision in existing_map.items():
                    self._record_promotion_history(
                        assessment=assessment,
                        student_id=student_id,
                        action="clear",
                        previous_decision=existing_decision.decision,
                        new_decision=None,
                        decision_reason=decision_reason,
                        user=request.user,
                    )
                    updated_count += 1
                if matched_student_ids:
                    StudentPromotionDecision.objects.filter(
                        assessment=assessment,
                        student_id__in=matched_student_ids,
                    ).delete()
            else:
                for row in rows:
                    student_id = str(row.get("student_id"))
                    if action_name == "override":
                        recommended = row.get("recommended_action")
                        decision = "hold" if recommended == "promote" else "promote"
                    else:
                        decision = action_name

                    previous_decision = (
                        existing_map.get(student_id).decision
                        if student_id in existing_map
                        else None
                    )
                    StudentPromotionDecision.objects.update_or_create(
                        assessment=assessment,
                        student_id=student_id,
                        defaults={
                            "decision": decision,
                            "decision_reason": decision_reason,
                            "decided_by": request.user,
                        },
                    )
                    self._record_promotion_history(
                        assessment=assessment,
                        student_id=student_id,
                        action=action_name,
                        previous_decision=previous_decision,
                        new_decision=decision,
                        decision_reason=decision_reason,
                        user=request.user,
                    )
                    updated_count += 1

        response_payload = self._promotion_exception_response(assessment, request)
        return Response(
            {
                "updated": updated_count,
                "matched_students": len(matched_student_ids),
                "action": action_name,
                "summary": response_payload.get("summary", {}),
            }
        )
