# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import json
import re
from typing import Any

from django.db.models import Q

from academic.models import Chapter, Subject
from ai_engine.models import AiGeneratedArtifact, AIInteractionLog, ContentChunk
from ai_engine.services.rag_tutor_service import RAGTutorService


class ExamPaperGenerationError(Exception):
    pass


class ExamPaperGeneratorService:
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
    def _normalize_difficulty_mix(difficulty_mix: dict[str, Any]) -> dict[str, int]:
        if not isinstance(difficulty_mix, dict):
            raise ExamPaperGenerationError("difficulty_mix must be an object.")

        try:
            easy = int(difficulty_mix.get("easy", 0))
            medium = int(difficulty_mix.get("medium", 0))
            hard = int(difficulty_mix.get("hard", 0))
        except (TypeError, ValueError):
            raise ExamPaperGenerationError("difficulty_mix values must be integers.")

        if min(easy, medium, hard) < 0:
            raise ExamPaperGenerationError("difficulty_mix values must be >= 0.")
        if easy + medium + hard != 100:
            raise ExamPaperGenerationError(
                "difficulty_mix percentages must sum to 100."
            )
        return {"easy": easy, "medium": medium, "hard": hard}

    @staticmethod
    def _parse_numeric_id(value: Any, *, field_name: str) -> int:
        try:
            return int(str(value).strip())
        except (TypeError, ValueError):
            raise ExamPaperGenerationError(f"{field_name} must be a numeric id.")

    def _resolve_subject(self, *, subject_id: Any, class_id: Any) -> Subject:
        parsed_subject_id = self._parse_numeric_id(subject_id, field_name="subject_id")
        parsed_class_id = self._parse_numeric_id(class_id, field_name="class_id")

        subject = (
            Subject.objects.select_related("academic_class")
            .prefetch_related("chapters", "chapters__lessons")
            .filter(pk=parsed_subject_id)
            .first()
        )
        if subject is None:
            raise ExamPaperGenerationError("subject not found.")
        if int(subject.academic_class_id) != parsed_class_id:
            raise ExamPaperGenerationError(
                "class_id does not match the selected subject."
            )
        return subject

    def _resolve_chapters(
        self, *, subject: Subject, units: list[Any] | None
    ) -> list[Chapter]:
        all_chapters = list(subject.chapters.all().order_by("order", "id"))
        if not all_chapters:
            raise ExamPaperGenerationError("No chapters found for this subject.")

        unit_ids: list[int] = []
        if units:
            for raw in units:
                if isinstance(raw, dict):
                    value = raw.get("id")
                else:
                    value = raw
                if value in (None, ""):
                    continue
                unit_ids.append(self._parse_numeric_id(value, field_name="units"))
            unit_ids = list(dict.fromkeys(unit_ids))

        if not unit_ids:
            return all_chapters

        selected = [
            chapter for chapter in all_chapters if int(chapter.id) in set(unit_ids)
        ]
        if len(selected) != len(set(unit_ids)):
            raise ExamPaperGenerationError(
                "One or more unit chapter ids are invalid for this subject."
            )
        return selected

    @staticmethod
    def _curriculum_text(subject: Subject, chapters: list[Chapter]) -> str:
        lines: list[str] = [
            f"Subject: {subject.name}",
            f"Class: {getattr(subject.academic_class, 'name', subject.academic_class_id)}",
            "Curriculum Units:",
        ]
        for chapter in chapters[:20]:
            lines.append(f"- Chapter {chapter.id}: {chapter.title}")
            if chapter.description:
                lines.append(f"  Description: {str(chapter.description).strip()[:280]}")
            lessons = list(chapter.lessons.all().order_by("order", "id")[:12])
            for lesson in lessons:
                lines.append(f"  - Lesson {lesson.id}: {lesson.title}")
                if lesson.content:
                    lines.append(
                        f"    Content snippet: {str(lesson.content).strip()[:260]}"
                    )
        return "\n".join(lines)

    def _chunks_for_chapters(self, chapters: list[Chapter]) -> list[ContentChunk]:
        chapter_ids = [int(ch.id) for ch in chapters]
        chapter_id_strings = [str(ch_id) for ch_id in chapter_ids]

        lesson_ids: list[int] = []
        for chapter in chapters:
            lesson_ids.extend([int(lesson.id) for lesson in chapter.lessons.all()])
        lesson_id_strings = [str(lesson_id) for lesson_id in lesson_ids]

        queryset = ContentChunk.objects.filter(tenant=self.tenant).filter(
            Q(source_type="chapter", source_id__in=chapter_id_strings)
            | Q(source_type="lesson", source_id__in=lesson_id_strings)
            | Q(source_type="lesson", metadata__chapter_id__in=chapter_ids)
            | Q(source_type="material", metadata__chapter_id__in=chapter_ids)
            | Q(source_type="material", metadata__lesson_id__in=lesson_ids)
        )
        return list(queryset.order_by("-created_at")[:24])

    @staticmethod
    def _build_messages(
        *,
        subject: Subject,
        chapters: list[Chapter],
        marks: int,
        difficulty_mix: dict[str, int],
        curriculum_text: str,
        chunk_snippets: list[str],
    ) -> list[dict[str, str]]:
        snippets = "\n\n".join(
            f"[Chunk {idx + 1}]\n{text}" for idx, text in enumerate(chunk_snippets[:10])
        )
        if not snippets:
            snippets = (
                "[Chunk 1]\nNo indexed chunks were found. Use curriculum text only."
            )

        chapter_ids = [chapter.id for chapter in chapters]
        return [
            {
                "role": "system",
                "content": (
                    "You are an exam paper generator for schools. "
                    "Use only the provided curriculum/chunks. "
                    "Return strict JSON only, no markdown."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Generate a complete exam paper for subject '{subject.name}' "
                    f"(class_id={subject.academic_class_id}, subject_id={subject.id}).\n"
                    f"Units chapter IDs: {chapter_ids}\n"
                    f"Total marks: {marks}\n"
                    f"Difficulty mix (%): easy={difficulty_mix['easy']}, medium={difficulty_mix['medium']}, hard={difficulty_mix['hard']}\n\n"
                    "STRICT JSON schema:\n"
                    "{\n"
                    '  "paper": {\n'
                    '    "title": "string",\n'
                    '    "total_marks": 100,\n'
                    '    "sections": [\n'
                    "      {\n"
                    '        "title": "string",\n'
                    '        "instructions": "string",\n'
                    '        "marks": 20,\n'
                    '        "questions": [\n'
                    "          {\n"
                    '            "type": "mcq|short_answer|long_answer",\n'
                    '            "prompt": "string",\n'
                    '            "marks": 2,\n'
                    '            "options": ["A", "B", "C", "D"]\n'
                    "          }\n"
                    "        ]\n"
                    "      }\n"
                    "    ]\n"
                    "  },\n"
                    '  "answer_key": {\n'
                    '    "1": "correct answer",\n'
                    '    "2": "correct answer"\n'
                    "  },\n"
                    '  "marking_scheme": {\n'
                    '    "guidelines": ["string"],\n'
                    '    "difficulty_mix": {"easy": 30, "medium": 50, "hard": 20}\n'
                    "  }\n"
                    "}\n\n"
                    "Rules:\n"
                    "1) paper.total_marks must exactly equal requested marks.\n"
                    "2) Sum of section marks must equal paper.total_marks.\n"
                    "3) Every question must have positive integer marks.\n"
                    "4) Return valid JSON object only.\n\n"
                    f"Curriculum data:\n{curriculum_text}\n\n"
                    f"Indexed chunk data:\n{snippets}"
                ),
            },
        ]

    @staticmethod
    def _json_fix_messages(
        raw_text: str, marks: int, difficulty_mix: dict[str, int]
    ) -> list[dict[str, str]]:
        return [
            {
                "role": "system",
                "content": "Fix invalid exam JSON. Return JSON only.",
            },
            {
                "role": "user",
                "content": (
                    "Fix this output into valid JSON following required schema with keys "
                    "'paper', 'answer_key', 'marking_scheme'.\n"
                    f"paper.total_marks must be exactly {marks}.\n"
                    f"marking_scheme.difficulty_mix must be easy={difficulty_mix['easy']}, "
                    f"medium={difficulty_mix['medium']}, hard={difficulty_mix['hard']}.\n\n"
                    f"Output to fix:\n{raw_text}"
                ),
            },
        ]

    @staticmethod
    def _normalize_question(raw: dict[str, Any]) -> dict[str, Any] | None:
        if not isinstance(raw, dict):
            return None
        prompt = str(raw.get("prompt") or "").strip()
        if not prompt:
            return None
        qtype = str(raw.get("type") or "short_answer").strip().lower()
        if qtype not in {"mcq", "short_answer", "long_answer"}:
            qtype = "short_answer"
        try:
            marks = int(raw.get("marks"))
        except (TypeError, ValueError):
            return None
        if marks <= 0:
            return None

        options: list[str] = []
        if isinstance(raw.get("options"), list):
            options = [
                str(option).strip() for option in raw["options"] if str(option).strip()
            ]
        if qtype == "mcq" and len(options) < 2:
            return None

        normalized = {
            "type": qtype,
            "prompt": prompt,
            "marks": marks,
        }
        if options:
            normalized["options"] = options
        return normalized

    @classmethod
    def _normalize_payload(
        cls,
        payload: dict[str, Any] | None,
        *,
        expected_marks: int,
        expected_difficulty_mix: dict[str, int],
    ) -> dict[str, Any] | None:
        if not isinstance(payload, dict):
            return None
        paper = payload.get("paper")
        answer_key = payload.get("answer_key")
        marking_scheme = payload.get("marking_scheme")

        if (
            not isinstance(paper, dict)
            or not isinstance(answer_key, dict)
            or not isinstance(marking_scheme, dict)
        ):
            return None

        raw_sections = paper.get("sections")
        if not isinstance(raw_sections, list) or not raw_sections:
            return None

        sections: list[dict[str, Any]] = []
        total_marks = 0
        for raw_section in raw_sections:
            if not isinstance(raw_section, dict):
                return None
            title = str(raw_section.get("title") or "").strip()
            if not title:
                return None

            raw_questions = raw_section.get("questions")
            if not isinstance(raw_questions, list) or not raw_questions:
                return None

            questions: list[dict[str, Any]] = []
            question_marks_total = 0
            for raw_question in raw_questions:
                normalized_question = cls._normalize_question(raw_question)
                if normalized_question is None:
                    return None
                question_marks_total += int(normalized_question["marks"])
                questions.append(normalized_question)

            section_marks = question_marks_total
            try:
                maybe_section_marks = int(raw_section.get("marks"))
                if maybe_section_marks > 0:
                    if maybe_section_marks != question_marks_total:
                        return None
                    section_marks = maybe_section_marks
            except (TypeError, ValueError):
                pass

            instructions = str(raw_section.get("instructions") or "").strip()
            normalized_section = {
                "title": title,
                "instructions": instructions,
                "marks": section_marks,
                "questions": questions,
            }
            sections.append(normalized_section)
            total_marks += section_marks

        if total_marks != expected_marks:
            return None

        title = str(paper.get("title") or "AI Generated Exam Paper").strip()
        normalized_marking_scheme = dict(marking_scheme)
        normalized_marking_scheme["difficulty_mix"] = expected_difficulty_mix

        return {
            "paper": {
                "title": title,
                "total_marks": total_marks,
                "sections": sections,
            },
            "answer_key": answer_key,
            "marking_scheme": normalized_marking_scheme,
        }

    def _call_model(self, messages: list[dict[str, str]]) -> tuple[str, dict[str, Any]]:
        return self.rag._call_chat_model(messages)

    def generate(
        self,
        *,
        class_id: Any,
        subject_id: Any,
        units: list[Any] | None,
        marks: int,
        difficulty_mix: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            total_marks = int(marks)
        except (TypeError, ValueError):
            raise ExamPaperGenerationError("marks must be an integer.")
        if total_marks < 10 or total_marks > 300:
            raise ExamPaperGenerationError("marks must be between 10 and 300.")

        normalized_mix = self._normalize_difficulty_mix(difficulty_mix)
        subject = self._resolve_subject(subject_id=subject_id, class_id=class_id)
        chapters = self._resolve_chapters(subject=subject, units=units)
        curriculum_text = self._curriculum_text(subject, chapters)
        chunks = self._chunks_for_chapters(chapters)
        chunk_snippets = [
            str(chunk.text or "").strip()[:900]
            for chunk in chunks
            if str(chunk.text or "").strip()
        ]

        messages = self._build_messages(
            subject=subject,
            chapters=chapters,
            marks=total_marks,
            difficulty_mix=normalized_mix,
            curriculum_text=curriculum_text,
            chunk_snippets=chunk_snippets,
        )
        raw_output, usage = self._call_model(messages)
        parsed = self._extract_json(raw_output)
        normalized_payload = self._normalize_payload(
            parsed,
            expected_marks=total_marks,
            expected_difficulty_mix=normalized_mix,
        )

        if normalized_payload is None:
            fix_messages = self._json_fix_messages(
                raw_output, total_marks, normalized_mix
            )
            fixed_output, fixed_usage = self._call_model(fix_messages)
            parsed = self._extract_json(fixed_output)
            normalized_payload = self._normalize_payload(
                parsed,
                expected_marks=total_marks,
                expected_difficulty_mix=normalized_mix,
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

        if normalized_payload is None:
            raise ExamPaperGenerationError(
                "Model returned invalid exam JSON after one retry."
            )

        artifact_content = dict(normalized_payload)
        artifact_content["_meta"] = {
            "class_id": int(subject.academic_class_id),
            "subject_id": int(subject.id),
            "units": [int(chapter.id) for chapter in chapters],
            "requested_marks": total_marks,
            "difficulty_mix": normalized_mix,
        }

        AiGeneratedArtifact.objects.create(
            tenant=self.tenant,
            artifact_type="exam_paper",
            source_type="subject",
            source_id=str(subject.id),
            lang="en",
            content=artifact_content,
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
                feature_used="exam_paper_generator_rag",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
            )
        except Exception:
            pass

        return normalized_payload
