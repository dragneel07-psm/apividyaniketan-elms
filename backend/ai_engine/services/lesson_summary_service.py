# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import json
import re
from typing import Any

from django.conf import settings
from django.db.models import Q

from academic.models import Lesson
from ai_engine.models import AiGeneratedArtifact, ContentChunk
from ai_engine.services.rag_tutor_service import RAGTutorService


class LessonSummaryService:
    VALID_LANGS = {"en", "ne"}
    VALID_TYPES = {"summary", "exam_notes"}

    def __init__(self, *, tenant, user=None):
        self.tenant = tenant
        self.user = user
        self.rag = RAGTutorService(tenant=tenant)
        self.top_k = max(3, int(getattr(settings, "AI_TUTOR_TOP_K", 5)))

    @classmethod
    def normalize_lang(cls, lang: str | None) -> str:
        candidate = str(lang or "en").strip().lower()
        return candidate if candidate in cls.VALID_LANGS else "en"

    @staticmethod
    def _normalize_content(
        payload: dict[str, Any] | None,
    ) -> dict[str, list[str] | str]:
        data = payload if isinstance(payload, dict) else {}
        summary = str(data.get("summary") or "").strip()
        if not summary:
            summary = "I’m not sure from the indexed lesson chunks."

        def _list(key: str, limit: int) -> list[str]:
            raw = data.get(key)
            if not isinstance(raw, list):
                return []
            return [str(item).strip() for item in raw if str(item).strip()][:limit]

        return {
            "summary": summary,
            "bullets": _list("bullets", 8),
            "key_terms": _list("key_terms", 12),
            "practice_questions": _list("practice_questions", 8),
        }

    def _cached_artifact(
        self, *, artifact_type: str, source_type: str, source_id: str, lang: str
    ) -> AiGeneratedArtifact | None:
        return (
            AiGeneratedArtifact.objects.filter(
                tenant=self.tenant,
                artifact_type=artifact_type,
                source_type=source_type,
                source_id=source_id,
                lang=lang,
            )
            .order_by("-created_at")
            .first()
        )

    def _lesson_chunks(self, lesson: Lesson) -> list[ContentChunk]:
        lesson_id = str(lesson.id)
        queryset = ContentChunk.objects.filter(tenant=self.tenant).filter(
            Q(source_type="lesson", source_id=lesson_id)
            | Q(source_type="material", metadata__lesson_id=lesson.id)
            | Q(source_type="material", metadata__lesson_id=lesson_id)
        )
        return list(queryset.order_by("-created_at")[: max(self.top_k, 6)])

    @staticmethod
    def _extract_json(text: str) -> dict[str, Any] | None:
        if not isinstance(text, str):
            return None
        candidate = text.strip()
        if not candidate:
            return None

        fence_match = re.search(
            r"```(?:json)?\s*(\{.*\})\s*```", candidate, flags=re.DOTALL | re.IGNORECASE
        )
        if fence_match:
            candidate = fence_match.group(1).strip()

        try:
            payload = json.loads(candidate)
            return payload if isinstance(payload, dict) else None
        except Exception:
            return None

    def _fallback_payload(
        self, lang: str, chunks: list[ContentChunk]
    ) -> dict[str, Any]:
        if lang == "ne":
            if not chunks:
                return {
                    "summary": "उपलब्ध पाठ सामग्रीबाट विश्वसनीय सारांश बनाउन पर्याप्त जानकारी छैन।",
                    "bullets": ["पहिले lesson सामग्री index गर्नुहोस्।"],
                    "key_terms": [],
                    "practice_questions": [],
                }
            return {
                "summary": "तलको बुँदाहरू पाठको मुख्य सार हुन्।",
                "bullets": [chunk.text[:140] for chunk in chunks[:4]],
                "key_terms": [],
                "practice_questions": [
                    "यस पाठको मुख्य अवधारणा आफ्नै शब्दमा लेख्नुहोस्।"
                ],
            }

        if not chunks:
            return {
                "summary": "I’m not sure from the available lesson chunks.",
                "bullets": ["Please index lesson content first."],
                "key_terms": [],
                "practice_questions": [],
            }
        return {
            "summary": "Here is a grounded summary based on indexed lesson chunks.",
            "bullets": [chunk.text[:140] for chunk in chunks[:4]],
            "key_terms": [],
            "practice_questions": [
                "Explain the main concept from this lesson in your own words."
            ],
        }

    def _build_messages(
        self,
        *,
        lesson: Lesson,
        artifact_type: str,
        lang: str,
        chunks: list[ContentChunk],
    ) -> list[dict[str, str]]:
        if artifact_type == "exam_notes":
            task_label = "exam preparation notes"
        else:
            task_label = "lesson summary"

        if lang == "ne":
            language_instruction = "Write in clear Nepali. You may keep technical terms in English inside parentheses when needed."
        else:
            language_instruction = "Write in clear English suitable for students."

        snippets = "\n\n".join(
            f"[Chunk {idx + 1}] type={chunk.source_type} id={chunk.source_id}\n{chunk.text[:900]}"
            for idx, chunk in enumerate(chunks[: self.top_k])
        )

        return [
            {
                "role": "system",
                "content": (
                    "You are an accurate school assistant. Use only provided snippets. "
                    "Do not hallucinate. Return strict JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Task: Create {task_label} for lesson '{lesson.title}'.\n"
                    f"{language_instruction}\n\n"
                    "Return STRICT JSON object with keys exactly:\n"
                    "- summary: string\n"
                    "- bullets: string[]\n"
                    "- key_terms: string[]\n"
                    "- practice_questions: string[]\n\n"
                    "Grounding snippets:\n"
                    f"{snippets}"
                ),
            },
        ]

    def _call_model(self, messages: list[dict[str, str]]) -> tuple[str, dict[str, Any]]:
        return self.rag._call_chat_model(messages)

    def generate(
        self, *, lesson_id: int, artifact_type: str, lang: str = "en"
    ) -> dict[str, Any]:
        normalized_type = str(artifact_type or "").strip().lower()
        if normalized_type not in self.VALID_TYPES:
            raise ValueError("Unsupported artifact type.")

        normalized_lang = self.normalize_lang(lang)
        lesson = Lesson.objects.filter(pk=lesson_id).first()
        if lesson is None:
            raise Lesson.DoesNotExist()

        source_id = str(lesson.id)
        cached = self._cached_artifact(
            artifact_type=normalized_type,
            source_type="lesson",
            source_id=source_id,
            lang=normalized_lang,
        )
        if cached:
            return self._normalize_content(cached.content)

        chunks = self._lesson_chunks(lesson)
        if not chunks:
            payload = self._fallback_payload(normalized_lang, chunks)
        else:
            messages = self._build_messages(
                lesson=lesson,
                artifact_type=normalized_type,
                lang=normalized_lang,
                chunks=chunks,
            )
            text, _usage = self._call_model(messages)
            parsed = self._extract_json(text) or self._fallback_payload(
                normalized_lang, chunks
            )
            payload = self._normalize_content(parsed)

        AiGeneratedArtifact.objects.create(
            tenant=self.tenant,
            artifact_type=normalized_type,
            source_type="lesson",
            source_id=source_id,
            lang=normalized_lang,
            content=payload,
            created_by=(
                self.user if getattr(self.user, "is_authenticated", False) else None
            ),
        )
        return payload
