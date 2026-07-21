# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import json
import re
from typing import Any

from django.db import transaction

from academic.models import Assessment, Chapter, Lesson
from academic.models.question import Question
from academic.services.academic_year_service import ensure_current_academic_year
from ai_engine.models import AIInteractionLog
from ai_engine.services.rag_tutor_service import RAGTutorService


class QuizGenerationError(Exception):
    pass


class QuizGeneratorService:
    VALID_SOURCE_TYPES = {"lesson", "chapter"}
    VALID_DIFFICULTIES = {"easy", "medium", "hard"}

    def __init__(self, *, tenant, user):
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

        if isinstance(payload, list):
            return {"questions": payload}
        if isinstance(payload, dict):
            return payload
        return None

    @classmethod
    def _normalize_question(cls, item: dict[str, Any]) -> dict[str, Any] | None:
        if not isinstance(item, dict):
            return None

        prompt = str(item.get("prompt") or item.get("question") or "").strip()
        options = item.get("options")
        correct_index = item.get("correct_index")
        explanation = str(item.get("explanation") or "").strip()

        if not prompt:
            return None
        if not isinstance(options, list):
            return None
        clean_options = [
            str(option).strip() for option in options if str(option).strip()
        ]
        if len(clean_options) < 2:
            return None

        try:
            idx = int(correct_index)
        except (TypeError, ValueError):
            return None
        if idx < 0 or idx >= len(clean_options):
            return None

        return {
            "type": "mcq",
            "prompt": prompt,
            "options": clean_options,
            "correct_index": idx,
            "explanation": explanation,
        }

    def _validate_payload(
        self, payload: dict[str, Any] | None, *, expected_count: int
    ) -> list[dict[str, Any]] | None:
        if not isinstance(payload, dict):
            return None
        raw_questions = payload.get("questions")
        if not isinstance(raw_questions, list):
            return None
        if len(raw_questions) != expected_count:
            return None

        normalized: list[dict[str, Any]] = []
        for item in raw_questions:
            question = self._normalize_question(item)
            if question is None:
                return None
            normalized.append(question)
        return normalized

    def _resolve_source(
        self, *, source_type: str, source_id: str
    ) -> tuple[Lesson | Chapter, str]:
        normalized_type = str(source_type or "").strip().lower()
        if normalized_type not in self.VALID_SOURCE_TYPES:
            raise QuizGenerationError("source_type must be lesson or chapter.")

        try:
            numeric_id = int(str(source_id).strip())
        except (TypeError, ValueError):
            raise QuizGenerationError(
                "source_id must be a numeric id for lesson/chapter."
            )

        if normalized_type == "lesson":
            lesson = (
                Lesson.objects.select_related(
                    "chapter", "chapter__subject", "chapter__subject__academic_year"
                )
                .filter(pk=numeric_id)
                .first()
            )
            if lesson is None:
                raise QuizGenerationError("Lesson not found.")
            return lesson, normalized_type

        chapter = (
            Chapter.objects.select_related("subject", "subject__academic_year")
            .filter(pk=numeric_id)
            .first()
        )
        if chapter is None:
            raise QuizGenerationError("Chapter not found.")
        return chapter, normalized_type

    @staticmethod
    def _source_subject(source_obj: Lesson | Chapter):
        if isinstance(source_obj, Lesson):
            return source_obj.chapter.subject
        return source_obj.subject

    @staticmethod
    def _source_title(source_obj: Lesson | Chapter) -> str:
        if isinstance(source_obj, Lesson):
            return source_obj.title
        return source_obj.title

    @staticmethod
    def _source_fallback_text(source_obj: Lesson | Chapter) -> str:
        if isinstance(source_obj, Lesson):
            return str(source_obj.content or "").strip()[:1200]
        return str(source_obj.description or "").strip()[:1200]

    def _retrieved_snippets(
        self, *, source_type: str, source_id: str, difficulty: str, count: int
    ) -> list[str]:
        context: dict[str, Any]
        if source_type == "lesson":
            context = {"lesson_id": source_id}
        else:
            context = {"chapter_id": source_id}
        query = f"Create a {difficulty} quiz with {count} questions."
        retrieved = self.rag.retrieve_relevant_chunks(query, context=context)
        snippets: list[str] = []
        for item in retrieved:
            chunk = item.get("chunk")
            if chunk is None:
                continue
            text = str(getattr(chunk, "text", "") or "").strip()
            if text:
                snippets.append(text[:900])
        return snippets

    def _generation_messages(
        self,
        *,
        source_title: str,
        source_type: str,
        source_id: str,
        difficulty: str,
        count: int,
        snippets: list[str],
        fallback_text: str,
    ) -> list[dict[str, str]]:
        grounding = "\n\n".join(
            f"[Snippet {idx + 1}]\n{text}" for idx, text in enumerate(snippets[:8])
        )
        if not grounding:
            grounding = f"[Fallback Source Text]\n{fallback_text or 'No indexed chunks available.'}"

        return [
            {
                "role": "system",
                "content": (
                    "You generate academic quizzes from provided context only. "
                    "Do not output markdown. Return strict JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Generate quiz questions from source_type={source_type}, source_id={source_id}, title={source_title}.\n"
                    f"Difficulty: {difficulty}. Count: {count}.\n"
                    "STRICT schema:\n"
                    "{\n"
                    '  "questions": [\n'
                    "    {\n"
                    '      "type": "mcq",\n'
                    '      "prompt": "string",\n'
                    '      "options": ["string", "string", "string", "string"],\n'
                    '      "correct_index": 0,\n'
                    '      "explanation": "string"\n'
                    "    }\n"
                    "  ]\n"
                    "}\n"
                    f"Return exactly {count} questions.\n\n"
                    f"Grounding context:\n{grounding}"
                ),
            },
        ]

    @staticmethod
    def _json_fix_messages(raw_text: str, count: int) -> list[dict[str, str]]:
        return [
            {
                "role": "system",
                "content": "Fix invalid JSON into valid strict JSON. Return only JSON.",
            },
            {
                "role": "user",
                "content": (
                    f"Fix this output into strict JSON object with key 'questions' and exactly {count} items.\n"
                    "Each item keys: type='mcq', prompt, options, correct_index, explanation.\n"
                    "Output to fix:\n"
                    f"{raw_text}"
                ),
            },
        ]

    def _call_model(self, messages: list[dict[str, str]]) -> tuple[str, dict[str, Any]]:
        return self.rag._call_chat_model(messages)

    def _create_quiz_records(
        self,
        *,
        source_obj: Lesson | Chapter,
        source_type: str,
        difficulty: str,
        questions: list[dict[str, Any]],
    ) -> tuple[Assessment, list[dict[str, Any]]]:
        subject = self._source_subject(source_obj)
        academic_year = (
            getattr(subject, "academic_year", None) or ensure_current_academic_year()
        )
        total_marks = len(questions)
        passing_marks = max(1, int(round(total_marks * 0.4)))
        title = f"AI Quiz: {self._source_title(source_obj)}"

        with transaction.atomic():
            assessment = Assessment.objects.create(
                academic_year=academic_year,
                subject=subject,
                section=None,
                title=title,
                description=f"Auto-generated {difficulty} quiz from {source_type} content.",
                type="quiz",
                total_marks=total_marks,
                passing_marks=passing_marks,
                duration_minutes=max(10, total_marks * 2),
                blooms_level="understand",
            )

            created_questions: list[dict[str, Any]] = []
            for index, item in enumerate(questions, start=1):
                options = item["options"]
                correct_index = int(item["correct_index"])
                correct_answer = str(options[correct_index])
                question = Question.objects.create(
                    assessment=assessment,
                    text=item["prompt"],
                    type="mcq",
                    difficulty=difficulty,
                    options=options,
                    correct_answer=correct_answer,
                    points=1,
                    order=index,
                )
                created_questions.append(
                    {
                        "question_id": str(question.question_id),
                        "type": "mcq",
                        "prompt": question.text,
                        "options": options,
                        "correct_index": correct_index,
                        "explanation": item.get("explanation", ""),
                    }
                )

            if isinstance(source_obj, Lesson):
                source_obj.assessment = assessment
                source_obj.save(update_fields=["assessment"])

        return assessment, created_questions

    def generate(
        self, *, source_type: str, source_id: str, difficulty: str, count: int
    ) -> dict[str, Any]:
        normalized_difficulty = str(difficulty or "").strip().lower()
        if normalized_difficulty not in self.VALID_DIFFICULTIES:
            raise QuizGenerationError("difficulty must be easy, medium, or hard.")

        try:
            question_count = int(count)
        except (TypeError, ValueError):
            raise QuizGenerationError("count must be an integer.")
        if question_count < 1 or question_count > 30:
            raise QuizGenerationError("count must be between 1 and 30.")

        source_obj, normalized_source_type = self._resolve_source(
            source_type=source_type, source_id=source_id
        )
        normalized_source_id = str(getattr(source_obj, "id"))

        snippets = self._retrieved_snippets(
            source_type=normalized_source_type,
            source_id=normalized_source_id,
            difficulty=normalized_difficulty,
            count=question_count,
        )
        fallback_text = self._source_fallback_text(source_obj)
        messages = self._generation_messages(
            source_title=self._source_title(source_obj),
            source_type=normalized_source_type,
            source_id=normalized_source_id,
            difficulty=normalized_difficulty,
            count=question_count,
            snippets=snippets,
            fallback_text=fallback_text,
        )

        raw_output, usage = self._call_model(messages)
        parsed = self._extract_json(raw_output)
        normalized_questions = self._validate_payload(
            parsed, expected_count=question_count
        )

        if normalized_questions is None:
            fix_messages = self._json_fix_messages(raw_output, question_count)
            fixed_raw_output, fixed_usage = self._call_model(fix_messages)
            parsed = self._extract_json(fixed_raw_output)
            normalized_questions = self._validate_payload(
                parsed, expected_count=question_count
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

        if normalized_questions is None:
            raise QuizGenerationError(
                "Model returned invalid quiz JSON after one retry."
            )

        assessment, created_questions = self._create_quiz_records(
            source_obj=source_obj,
            source_type=normalized_source_type,
            difficulty=normalized_difficulty,
            questions=normalized_questions,
        )

        try:
            AIInteractionLog.objects.create(
                tenant=self.tenant,
                user=self.user,
                feature_used="quiz_generator_rag",
                prompt_tokens=int(usage.get("prompt_tokens") or 0),
                completion_tokens=int(usage.get("completion_tokens") or 0),
                total_tokens=int(usage.get("prompt_tokens") or 0)
                + int(usage.get("completion_tokens") or 0),
            )
        except Exception:
            pass

        return {
            "quiz_id": str(assessment.assessment_id),
            "questions": created_questions,
        }
