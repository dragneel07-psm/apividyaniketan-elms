# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
MisconceptionDetectionService — Analyses wrong answers from MCQ assessments to
identify recurring misconceptions per student per subject.

Data source: Result.answers_data (JSON) stored when a student submits an MCQ
assessment. Expected format per answer item:
  {
    "question": "What is the formula for velocity?",
    "student_answer": "acceleration / time",
    "correct_answer": "displacement / time",
    "is_correct": false,
    "options": ["...", "...", "...", "..."]      # optional
  }

The service groups wrong answers by subject, batches them, and prompts the LLM
to identify patterns and name the underlying misconception. Results are cached
in AiGeneratedArtifact (artifact_type="misconception_report").
"""

from __future__ import annotations

import json
import logging
from typing import Any

from django.utils import timezone

from academic.models.assessment import Assessment, Result
from academic.models.subject import Subject
from ai_engine.models import AiGeneratedArtifact, AIInteractionLog
from ai_engine.services.provider_config import get_ai_provider_config

logger = logging.getLogger(__name__)

# Cache TTL in days — re-analyse after this many days
CACHE_DAYS = 3
# Maximum wrong answers to send to LLM per subject (keeps prompt manageable)
MAX_WRONG_PER_SUBJECT = 20


class MisconceptionDetectionService:
    def __init__(self, *, tenant, user=None):
        self.tenant = tenant
        self.user = user
        self.config = get_ai_provider_config()

    # ------------------------------------------------------------------ #
    #  Public API
    # ------------------------------------------------------------------ #

    def analyse_student(self, student, using="default", force=False) -> dict[str, Any]:
        """
        Return misconception report for a student across all subjects.

        Returns:
          {
            "cached": bool,
            "generated_at": iso-datetime,
            "subjects": [
              {
                "subject_id": str,
                "subject_name": str,
                "misconceptions": [
                  {
                    "label": "Confuses velocity with acceleration",
                    "description": "Student consistently ...",
                    "example_question": "...",
                    "wrong_answer_given": "...",
                    "correct_answer": "...",
                    "severity": "high|medium|low",
                  }
                ],
                "wrong_answer_count": int,
              }
            ]
          }
        """
        cache_key = str(student.student_id)
        if not force:
            cached = self._load_cache(cache_key, using=using)
            if cached:
                return {**cached.content, "cached": True}

        wrong_by_subject = self._collect_wrong_answers(student, using=using)
        subjects_data = []

        for subject_id, entry in wrong_by_subject.items():
            wrong_answers = entry["wrong_answers"][:MAX_WRONG_PER_SUBJECT]
            misconceptions = self._detect_misconceptions(
                subject_name=entry["subject_name"],
                wrong_answers=wrong_answers,
                student=student,
                using=using,
            )
            subjects_data.append(
                {
                    "subject_id": subject_id,
                    "subject_name": entry["subject_name"],
                    "misconceptions": misconceptions,
                    "wrong_answer_count": len(entry["wrong_answers"]),
                }
            )

        report = {
            "cached": False,
            "generated_at": timezone.now().isoformat(),
            "subjects": subjects_data,
        }

        self._save_cache(cache_key, report, using=using)
        return report

    # ------------------------------------------------------------------ #
    #  Internals
    # ------------------------------------------------------------------ #

    def _collect_wrong_answers(self, student, using="default") -> dict:
        """
        Pull all results with answers_data and extract wrong answer entries.
        Returns: { subject_id: { subject_name, wrong_answers: [...] } }
        """
        results = (
            Result.objects.using(using)
            .filter(student=student)
            .exclude(answers_data={})
            .select_related("assessment__subject")
            .order_by("-submitted_at")
        )

        by_subject: dict[str, dict] = {}
        for result in results:
            subj = result.assessment.subject
            if subj is None:
                continue
            key = str(subj.id)
            if key not in by_subject:
                by_subject[key] = {"subject_name": subj.name, "wrong_answers": []}

            answers = result.answers_data
            if not isinstance(answers, list):
                continue

            for item in answers:
                if not isinstance(item, dict):
                    continue
                if item.get("is_correct") is False or item.get("correct") is False:
                    by_subject[key]["wrong_answers"].append(
                        {
                            "question": str(
                                item.get("question") or item.get("prompt") or ""
                            ),
                            "student_answer": str(
                                item.get("student_answer")
                                or item.get("given_answer")
                                or ""
                            ),
                            "correct_answer": str(
                                item.get("correct_answer") or item.get("answer") or ""
                            ),
                        }
                    )

        return by_subject

    def _detect_misconceptions(
        self,
        *,
        subject_name: str,
        wrong_answers: list[dict],
        student,
        using: str,
    ) -> list[dict]:
        """
        Call LLM to identify misconception patterns. Falls back to a rule-based
        summary when LLM is unavailable.
        """
        if not wrong_answers:
            return []

        from ai_engine.services.ai_client import (
            parse_json_content,
            provider_ready,
            structured_chat,
        )

        if not provider_ready():
            return self._rule_based_fallback(wrong_answers)

        formatted = "\n".join(
            f"{i+1}. Q: {w['question']}\n   Student: {w['student_answer']}\n   Correct: {w['correct_answer']}"
            for i, w in enumerate(wrong_answers)
        )

        system_prompt = (
            "You are an expert educational psychologist specialising in identifying "
            "student misconceptions from wrong answers. Analyse the wrong answers and "
            "identify distinct recurring misconceptions. "
            'Respond with JSON: {"misconceptions": [{"label": ..., "description": ..., '
            '"example_question": ..., "wrong_answer_given": ..., "correct_answer": ..., '
            '"severity": "high"|"medium"|"low"}]}.'
        )
        user_prompt = (
            f"Subject: {subject_name}\n\n"
            f"Wrong answers from student:\n{formatted}\n\n"
            "Identify distinct misconceptions (max 5). "
            "Group similar errors under one misconception."
        )

        misconception_schema = {
            "type": "object",
            "properties": {
                "misconceptions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "label": {"type": "string"},
                            "description": {"type": "string"},
                            "example_question": {"type": "string"},
                            "wrong_answer_given": {"type": "string"},
                            "correct_answer": {"type": "string"},
                            "severity": {
                                "type": "string",
                                "enum": ["high", "medium", "low"],
                            },
                        },
                        "required": [
                            "label",
                            "description",
                            "example_question",
                            "wrong_answer_given",
                            "correct_answer",
                            "severity",
                        ],
                        "additionalProperties": False,
                    },
                }
            },
            "required": ["misconceptions"],
            "additionalProperties": False,
        }

        try:
            response = structured_chat(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                schema=misconception_schema,
                schema_name="misconceptions",
                temperature=0.3,
                max_tokens=800,
            )
            pt = getattr(response.usage, "prompt_tokens", 0)
            ct = getattr(response.usage, "completion_tokens", 0)

            AIInteractionLog.objects.using(using).create(
                tenant=self.tenant,
                user=self.user,
                feature_used="misconception_detection",
                prompt_tokens=pt,
                completion_tokens=ct,
                total_tokens=pt + ct,
            )

            parsed = parse_json_content(response)
            if isinstance(parsed, dict):
                parsed = parsed.get("misconceptions", [])
            if isinstance(parsed, list):
                return [m for m in parsed if isinstance(m, dict)]
        except Exception as exc:
            logger.warning("MisconceptionService: LLM call failed: %s", exc)

        return self._rule_based_fallback(wrong_answers)

    def _rule_based_fallback(self, wrong_answers: list[dict]) -> list[dict]:
        """
        When LLM is unavailable, return a simple list of wrong answer patterns
        without analysis.
        """
        return [
            {
                "label": "Recurring error pattern",
                "description": "Student made multiple mistakes in this topic area.",
                "example_question": (
                    wrong_answers[0]["question"] if wrong_answers else ""
                ),
                "wrong_answer_given": (
                    wrong_answers[0]["student_answer"] if wrong_answers else ""
                ),
                "correct_answer": (
                    wrong_answers[0]["correct_answer"] if wrong_answers else ""
                ),
                "severity": "medium",
            }
        ]

    def _load_cache(self, student_id_str: str, using: str):
        cutoff = timezone.now() - __import__("datetime").timedelta(days=CACHE_DAYS)
        return (
            AiGeneratedArtifact.objects.using(using)
            .filter(
                tenant=self.tenant,
                artifact_type="misconception_report",
                source_type="student",
                source_id=student_id_str,
                created_at__gte=cutoff,
            )
            .order_by("-created_at")
            .first()
        )

    def _save_cache(self, student_id_str: str, content: dict, using: str):
        # Delete old cache entries for this student
        AiGeneratedArtifact.objects.using(using).filter(
            tenant=self.tenant,
            artifact_type="misconception_report",
            source_type="student",
            source_id=student_id_str,
        ).delete()

        AiGeneratedArtifact.objects.using(using).create(
            tenant=self.tenant,
            artifact_type="misconception_report",
            source_type="student",
            source_id=student_id_str,
            lang="en",
            content=content,
            created_by=self.user,
        )
