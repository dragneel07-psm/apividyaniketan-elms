# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import json
import re
from typing import Any

from django.utils import timezone

from academic.models import Result
from academic.models.submission import Submission
from ai_engine.models import AIGradingDraft, AIInteractionLog, GradingRubric
from ai_engine.services.rag_tutor_service import RAGTutorService
from core.utils.audit import record_audit_event


class AssistedGradingError(Exception):
    pass


class AssistedGradingService:
    def __init__(self, *, tenant, user=None):
        self.tenant = tenant
        self.user = user
        self.rag = RAGTutorService(tenant=tenant)

    @staticmethod
    def _extract_json(raw_text: str) -> dict[str, Any] | None:
        if not isinstance(raw_text, str):
            return None
        candidate = raw_text.strip()
        if not candidate:
            return None

        fenced = re.search(
            r"```(?:json)?\s*(\{.*\}|\[.*\])\s*```",
            candidate,
            re.DOTALL | re.IGNORECASE,
        )
        if fenced:
            candidate = fenced.group(1).strip()

        try:
            payload = json.loads(candidate)
        except Exception:
            return None
        return payload if isinstance(payload, dict) else None

    @staticmethod
    def _normalize_criteria(criteria: Any, total_points: int) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []

        if isinstance(criteria, dict):
            raw_list = criteria.get("criteria")
            if isinstance(raw_list, list):
                criteria = raw_list

        if isinstance(criteria, list):
            for idx, item in enumerate(criteria, start=1):
                if isinstance(item, str):
                    normalized.append(
                        {
                            "name": item.strip() or f"Criterion {idx}",
                            "max_points": max(1, total_points // max(1, len(criteria))),
                            "description": "",
                        }
                    )
                    continue
                if isinstance(item, dict):
                    name = str(
                        item.get("name") or item.get("criterion") or f"Criterion {idx}"
                    ).strip()
                    if not name:
                        name = f"Criterion {idx}"
                    try:
                        max_points = int(
                            item.get("max_points") or item.get("points") or 0
                        )
                    except (TypeError, ValueError):
                        max_points = 0
                    if max_points <= 0:
                        max_points = max(1, total_points // max(1, len(criteria)))
                    description = str(item.get("description") or "").strip()
                    normalized.append(
                        {
                            "name": name,
                            "max_points": max_points,
                            "description": description,
                        }
                    )

        if not normalized:
            normalized = [
                {
                    "name": "Accuracy",
                    "max_points": max(1, int(round(total_points * 0.5))),
                    "description": "",
                },
                {
                    "name": "Clarity",
                    "max_points": max(1, int(round(total_points * 0.25))),
                    "description": "",
                },
                {
                    "name": "Completeness",
                    "max_points": max(1, int(round(total_points * 0.25))),
                    "description": "",
                },
            ]

        allocated = sum(int(item["max_points"]) for item in normalized)
        if allocated != total_points:
            diff = total_points - allocated
            normalized[0]["max_points"] = max(
                1, int(normalized[0]["max_points"]) + diff
            )

        return normalized

    @staticmethod
    def _fallback_grade(
        submission_text: str, criteria: list[dict[str, Any]], total_points: int
    ) -> dict[str, Any]:
        text = str(submission_text or "").strip()
        words = len(text.split())

        if words < 10:
            ratio = 0.35
            summary = "The submission is too short and misses key explanation."
        elif words < 60:
            ratio = 0.62
            summary = "The submission shows partial understanding but needs more depth and accuracy."
        else:
            ratio = 0.82
            summary = "The submission is reasonably complete with good clarity."

        score = round(total_points * ratio, 1)
        breakdown: list[dict[str, Any]] = []
        remaining = score
        for idx, criterion in enumerate(criteria):
            max_points = float(criterion["max_points"])
            if idx == len(criteria) - 1:
                points_awarded = round(max(0.0, remaining), 1)
            else:
                points_awarded = round(min(max_points, max_points * ratio), 1)
                remaining -= points_awarded
            breakdown.append(
                {
                    "criterion": criterion["name"],
                    "points_awarded": max(0.0, min(max_points, points_awarded)),
                    "max_points": max_points,
                    "feedback": "Fallback heuristic grading used.",
                }
            )

        return {
            "score": max(0.0, min(float(total_points), float(score))),
            "feedback": summary,
            "criteria_breakdown": breakdown,
        }

    @staticmethod
    def _build_messages(
        *, submission: Submission, rubric: GradingRubric, criteria: list[dict[str, Any]]
    ) -> list[dict[str, str]]:
        assessment = submission.assessment
        student_name = (
            submission.student.user.get_full_name()
            if getattr(submission.student, "user", None)
            else "Student"
        )
        submission_text = str(submission.content or "").strip()
        criteria_text = "\n".join(
            f"- {item['name']} (max {item['max_points']}): {item.get('description', '')}"
            for item in criteria
        )
        return [
            {
                "role": "system",
                "content": (
                    "You are a strict but fair school evaluator. "
                    "Produce only JSON. Do not include markdown."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Evaluate the subjective submission using rubric '{rubric.title}'.\n"
                    f"Assessment: {assessment.title}\n"
                    f"Total points: {rubric.total_points}\n"
                    f"Student: {student_name}\n\n"
                    "Rubric criteria:\n"
                    f"{criteria_text}\n\n"
                    "Student submission:\n"
                    f"{submission_text}\n\n"
                    "Return STRICT JSON object:\n"
                    "{\n"
                    '  "score": 72.5,\n'
                    '  "feedback": "string",\n'
                    '  "criteria_breakdown": [\n'
                    "    {\n"
                    '      "criterion": "Accuracy",\n'
                    '      "points_awarded": 25,\n'
                    '      "max_points": 30,\n'
                    '      "feedback": "string"\n'
                    "    }\n"
                    "  ]\n"
                    "}\n"
                    "Rules:\n"
                    f"1) score must be between 0 and {rubric.total_points}.\n"
                    "2) criteria_breakdown must include all rubric criteria.\n"
                    "3) points_awarded must not exceed max_points.\n"
                ),
            },
        ]

    @staticmethod
    def _json_fix_messages(raw_text: str, total_points: int) -> list[dict[str, str]]:
        return [
            {
                "role": "system",
                "content": "Fix invalid grading JSON and return JSON only.",
            },
            {
                "role": "user",
                "content": (
                    f"Fix the following output into valid JSON with keys score, feedback, criteria_breakdown. "
                    f"score must be numeric between 0 and {total_points}.\n\n"
                    f"{raw_text}"
                ),
            },
        ]

    @staticmethod
    def _normalize_payload(
        payload: dict[str, Any] | None,
        *,
        criteria: list[dict[str, Any]],
        total_points: int,
    ) -> dict[str, Any] | None:
        if not isinstance(payload, dict):
            return None
        try:
            score = float(payload.get("score"))
        except (TypeError, ValueError):
            return None

        score = max(0.0, min(float(total_points), score))
        feedback = str(payload.get("feedback") or "").strip()
        if not feedback:
            feedback = "Draft AI feedback generated."

        raw_breakdown = payload.get("criteria_breakdown")
        if not isinstance(raw_breakdown, list):
            return None

        by_name = {str(item.get("name")): item for item in criteria}
        normalized_breakdown: list[dict[str, Any]] = []
        for criterion in criteria:
            criterion_name = str(criterion["name"])
            match = None
            for row in raw_breakdown:
                if not isinstance(row, dict):
                    continue
                row_name = str(row.get("criterion") or row.get("name") or "").strip()
                if row_name.lower() == criterion_name.lower():
                    match = row
                    break
            try:
                max_points = (
                    float(match.get("max_points"))
                    if match
                    else float(criterion["max_points"])
                )
            except (TypeError, ValueError):
                max_points = float(criterion["max_points"])
            if max_points <= 0:
                max_points = float(criterion["max_points"])
            try:
                points_awarded = float(match.get("points_awarded")) if match else 0.0
            except (TypeError, ValueError):
                points_awarded = 0.0
            points_awarded = max(0.0, min(max_points, points_awarded))
            row_feedback = str(match.get("feedback") if match else "").strip()
            normalized_breakdown.append(
                {
                    "criterion": criterion_name,
                    "points_awarded": round(points_awarded, 2),
                    "max_points": round(max_points, 2),
                    "feedback": row_feedback,
                }
            )

        return {
            "score": round(score, 2),
            "feedback": feedback,
            "criteria_breakdown": normalized_breakdown,
        }

    def _call_model(self, messages: list[dict[str, str]]) -> tuple[str, dict[str, Any]]:
        return self.rag._call_chat_model(messages)

    def generate_draft(
        self, *, submission_id: str, rubric_id: str, request=None
    ) -> AIGradingDraft:
        submission = (
            Submission.objects.select_related(
                "assessment",
                "assessment__subject",
                "student",
                "student__user",
            )
            .filter(submission_id=submission_id)
            .first()
        )
        if submission is None:
            raise AssistedGradingError("submission not found.")

        rubric = GradingRubric.objects.filter(id=rubric_id, tenant=self.tenant).first()
        if rubric is None:
            raise AssistedGradingError("rubric not found.")

        criteria = self._normalize_criteria(rubric.criteria, int(rubric.total_points))
        if not str(submission.content or "").strip():
            fallback = self._fallback_grade("", criteria, int(rubric.total_points))
            draft = AIGradingDraft.objects.create(
                tenant=self.tenant,
                submission=submission,
                rubric=rubric,
                score=float(fallback["score"]),
                feedback=str(fallback["feedback"]),
                criteria_breakdown=fallback["criteria_breakdown"],
                status="draft",
                created_by=(
                    self.user if getattr(self.user, "is_authenticated", False) else None
                ),
            )
            return draft

        messages = self._build_messages(
            submission=submission, rubric=rubric, criteria=criteria
        )
        raw_output, usage = self._call_model(messages)
        parsed = self._extract_json(raw_output)
        normalized = self._normalize_payload(
            parsed, criteria=criteria, total_points=int(rubric.total_points)
        )

        if normalized is None:
            fix_messages = self._json_fix_messages(raw_output, int(rubric.total_points))
            fixed_output, fixed_usage = self._call_model(fix_messages)
            parsed = self._extract_json(fixed_output)
            normalized = self._normalize_payload(
                parsed, criteria=criteria, total_points=int(rubric.total_points)
            )
            usage = {
                "model": str(
                    fixed_usage.get("model") or usage.get("model") or "fallback"
                ),
                "prompt_tokens": int(usage.get("prompt_tokens") or 0)
                + int(fixed_usage.get("prompt_tokens") or 0),
                "completion_tokens": int(usage.get("completion_tokens") or 0)
                + int(fixed_usage.get("completion_tokens") or 0),
            }

        if normalized is None:
            normalized = self._fallback_grade(
                str(submission.content or ""), criteria, int(rubric.total_points)
            )
            usage = {"model": "fallback", "prompt_tokens": 0, "completion_tokens": 0}

        draft = AIGradingDraft.objects.create(
            tenant=self.tenant,
            submission=submission,
            rubric=rubric,
            score=float(normalized["score"]),
            feedback=str(normalized["feedback"]),
            criteria_breakdown=normalized["criteria_breakdown"],
            status="draft",
            created_by=(
                self.user if getattr(self.user, "is_authenticated", False) else None
            ),
        )

        try:
            prompt_tokens = int(usage.get("prompt_tokens") or 0)
            completion_tokens = int(usage.get("completion_tokens") or 0)
            AIInteractionLog.objects.create(
                tenant=self.tenant,
                user=self.user,
                feature_used="ai_subjective_grading_draft",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
            )
        except Exception:
            pass

        record_audit_event(
            action="ai.grading_draft_created",
            user=self.user,
            request=request,
            details={
                "draft_id": str(draft.id),
                "submission_id": str(submission.submission_id),
                "rubric_id": str(rubric.id),
                "score": float(draft.score),
                "status": draft.status,
            },
        )
        return draft

    def approve_draft(self, *, draft_id: str, request=None) -> AIGradingDraft:
        draft = (
            AIGradingDraft.objects.select_related(
                "submission",
                "submission__assessment",
                "submission__student",
            )
            .filter(id=draft_id, tenant=self.tenant)
            .first()
        )
        if draft is None:
            raise AssistedGradingError("draft not found.")
        if draft.status != "draft":
            raise AssistedGradingError("draft is already finalized.")

        submission = draft.submission
        result, _created = Result.objects.update_or_create(
            assessment=submission.assessment,
            student=submission.student,
            defaults={
                "score": int(round(float(draft.score))),
                "ai_feedback": draft.feedback,
                "graded_by": (
                    self.user if getattr(self.user, "is_authenticated", False) else None
                ),
            },
        )

        submission.status = "graded"
        submission.is_graded = True
        submission.save(update_fields=["status", "is_graded", "submitted_at"])

        draft.status = "approved"
        draft.approved_by = (
            self.user if getattr(self.user, "is_authenticated", False) else None
        )
        draft.approved_at = timezone.now()
        draft.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])

        record_audit_event(
            action="ai.grading_draft_approved",
            user=self.user,
            request=request,
            details={
                "draft_id": str(draft.id),
                "submission_id": str(submission.submission_id),
                "result_id": str(result.result_id),
                "score": int(result.score),
            },
        )
        return draft
