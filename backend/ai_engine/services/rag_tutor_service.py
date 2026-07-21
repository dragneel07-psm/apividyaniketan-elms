# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import hashlib
import logging
import math
import random
from typing import Any

from django.conf import settings
from django.db import DatabaseError
from django.db.models import Q, QuerySet
from openai import OpenAI

from ai_engine.models import ContentChunk
from ai_engine.services.ai_client import chat_with_fallback, stream_with_fallback
from ai_engine.services.lang_utils import get_lang_instruction
from ai_engine.services.provider_config import get_ai_provider_config
from core.vector import PGVECTOR_AVAILABLE

try:
    from pgvector.django import CosineDistance
except Exception:
    CosineDistance = None


logger = logging.getLogger(__name__)


class RAGTutorService:
    # Adaptive similarity bounds — low-mastery students get broader retrieval
    _SIMILARITY_LOW_MASTERY = 0.45  # avg BKT mastery < 0.4
    _SIMILARITY_HIGH_MASTERY = 0.70  # avg BKT mastery >= 0.75

    def __init__(self, *, tenant):
        self.tenant = tenant
        self.config = get_ai_provider_config()
        self.model = str(
            self.config.get("model") or getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
        )
        self.embedding_model = str(
            getattr(settings, "AI_EMBEDDING_MODEL", "text-embedding-3-small")
        )
        self.top_k = int(getattr(settings, "AI_TUTOR_TOP_K", 5))
        self.min_similarity = float(getattr(settings, "AI_TUTOR_MIN_SIMILARITY", 0.58))
        self.embedding_dimensions = int(
            getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536)
        )

    def get_adaptive_min_similarity(self, student=None, using="default") -> float:
        """
        Compute a dynamic similarity threshold based on the student's average BKT
        mastery across all skills.

        Low average mastery (<0.4) → lower threshold (0.45): retrieve more content,
          including foundational material, to help fill knowledge gaps.
        High average mastery (>=0.75) → higher threshold (0.70): only retrieve
          highly specific advanced content.
        Between → linearly interpolate.

        Falls back to `self.min_similarity` (settings default) when student is None
        or mastery data is unavailable.
        """
        if student is None:
            return self.min_similarity
        try:
            from ai_engine.models import SkillMastery

            masteries = list(
                SkillMastery.objects.using(using)
                .filter(student=student)
                .values_list("p_mastery", flat=True)
            )
            if not masteries:
                return self.min_similarity
            avg_mastery = sum(masteries) / len(masteries)

            low_bound = self._SIMILARITY_LOW_MASTERY
            high_bound = self._SIMILARITY_HIGH_MASTERY
            if avg_mastery < 0.4:
                return low_bound
            if avg_mastery >= 0.75:
                return high_bound
            # Linear interpolation between low and high
            t = (avg_mastery - 0.4) / (0.75 - 0.4)
            return round(low_bound + t * (high_bound - low_bound), 3)
        except Exception as exc:
            logger.debug("Adaptive similarity fallback: %s", exc)
            return self.min_similarity

    def _openai_client(self):
        if not (self.config.get("enabled") and self.config.get("configured")):
            return None
        try:
            return OpenAI(
                api_key=self.config.get("api_key"),
                base_url=self.config.get("base_url"),
                default_headers=self.config.get("request_headers") or None,
                timeout=float(getattr(settings, "OPENAI_TIMEOUT_SECONDS", 30)),
            )
        except Exception as exc:
            logger.warning("Failed to initialize OpenAI client for tutor chat: %s", exc)
            return None

    def _normalize_vector(self, vector: list[float]) -> list[float]:
        if len(vector) > self.embedding_dimensions:
            return vector[: self.embedding_dimensions]
        if len(vector) < self.embedding_dimensions:
            return vector + [0.0] * (self.embedding_dimensions - len(vector))
        return vector

    def _stub_embedding(self, text: str) -> list[float]:
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], 16)
        rng = random.Random(seed)
        return [
            round(rng.uniform(-1.0, 1.0), 6) for _ in range(self.embedding_dimensions)
        ]

    def _embed_query(self, message: str) -> list[float]:
        client = self._openai_client()
        if client:
            try:
                response = client.embeddings.create(
                    model=self.embedding_model, input=message
                )
                embedding = list(response.data[0].embedding)
                return self._normalize_vector(embedding)
            except Exception as exc:
                logger.warning(
                    "Embedding generation failed; using stub embedding. Error: %s", exc
                )
        return self._stub_embedding(message)

    @staticmethod
    def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
        if not vec_a or not vec_b:
            return -1.0
        n = min(len(vec_a), len(vec_b))
        if n == 0:
            return -1.0
        dot = sum(float(vec_a[i]) * float(vec_b[i]) for i in range(n))
        norm_a = math.sqrt(sum(float(vec_a[i]) ** 2 for i in range(n)))
        norm_b = math.sqrt(sum(float(vec_b[i]) ** 2 for i in range(n)))
        if norm_a == 0 or norm_b == 0:
            return -1.0
        return dot / (norm_a * norm_b)

    def _base_queryset(
        self, context: dict[str, Any] | None = None
    ) -> QuerySet[ContentChunk]:
        queryset = ContentChunk.objects.filter(tenant=self.tenant)
        payload = context or {}

        lesson_id = payload.get("lesson_id")
        chapter_id = payload.get("chapter_id")
        source_type = str(payload.get("source_type") or "").strip().lower()
        source_id = payload.get("source_id")

        filters = Q()
        if lesson_id not in (None, ""):
            filters |= Q(source_type="lesson", source_id=str(lesson_id))
            filters |= Q(source_type="material", metadata__lesson_id=lesson_id)
        if chapter_id not in (None, ""):
            filters |= Q(source_type="chapter", source_id=str(chapter_id))
            filters |= Q(source_type="lesson", metadata__chapter_id=chapter_id)

        if filters:
            queryset = queryset.filter(filters)
        if source_type in {"lesson", "chapter", "material"}:
            queryset = queryset.filter(source_type=source_type)
        if source_id not in (None, ""):
            queryset = queryset.filter(source_id=str(source_id))
        return queryset

    def _retrieve_python(
        self, queryset: QuerySet[ContentChunk], query_vector: list[float]
    ) -> list[tuple[ContentChunk, float]]:
        scored: list[tuple[ContentChunk, float]] = []
        for chunk in queryset[:500]:
            embedding = chunk.embedding
            if not isinstance(embedding, list) or not embedding:
                continue
            try:
                vector = [float(value) for value in embedding]
            except Exception:
                continue
            similarity = self._cosine_similarity(query_vector, vector)
            scored.append((chunk, similarity))
        return scored

    def _expand_query(self, message: str) -> list[str]:
        """
        Generate up to 2 alternative phrasings of the query via LLM.
        Falls back to [message] alone if LLM is unavailable.
        This increases recall by covering different vocabulary the student might use.
        """
        from ai_engine.services.ai_client import provider_ready

        if not provider_ready():
            return [message]
        prompt = (
            "You are a search query optimizer for a school learning platform.\n"
            "Rephrase the following student question into 2 alternative queries that "
            "express the same intent with different vocabulary. "
            "Return only the 2 queries, one per line, no numbering, no extra text.\n\n"
            f"Original: {message}"
        )
        try:
            response = chat_with_fallback(
                [{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=120,
            )
            raw = (response.choices[0].message.content or "").strip()
            variants = [line.strip() for line in raw.splitlines() if line.strip()][:2]
            return [message] + variants
        except Exception as exc:
            logger.warning("Query expansion failed; using original only: %s", exc)
            return [message]

    def _retrieve_for_query(
        self, queryset, query_vector: list[float]
    ) -> list[tuple[ContentChunk, float]]:
        """Run vector retrieval for a single query vector."""
        if PGVECTOR_AVAILABLE and CosineDistance is not None:
            try:
                candidates = list(
                    queryset.annotate(
                        distance=CosineDistance("embedding", query_vector)
                    ).order_by("distance")[: max(self.top_k * 4, self.top_k)]
                )
                return [
                    (row, 1.0 - float(getattr(row, "distance", 1.0) or 1.0))
                    for row in candidates
                ]
            except Exception as exc:
                logger.warning(
                    "pgvector lookup failed; falling back to Python: %s", exc
                )
        return self._retrieve_python(queryset, query_vector)

    def _merge_and_rerank(
        self, scored_lists: list[list[tuple[ContentChunk, float]]]
    ) -> list[dict[str, Any]]:
        """
        Merge results from multiple queries (Reciprocal Rank Fusion) and deduplicate.
        RRF score: sum(1 / (rank + 60)) across all query result lists.
        """
        RRF_K = 60
        rrf_scores: dict[str, float] = {}
        chunk_map: dict[str, ContentChunk] = {}

        for scored in scored_lists:
            # Sort descending by similarity, then assign rank
            sorted_scored = sorted(scored, key=lambda x: x[1], reverse=True)
            for rank, (chunk, _) in enumerate(sorted_scored):
                cid = str(chunk.id)
                rrf_scores[cid] = rrf_scores.get(cid, 0.0) + 1.0 / (rank + RRF_K)
                chunk_map[cid] = chunk

        ranked = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        return [
            {"chunk": chunk_map[cid], "similarity": score}
            for cid, score in ranked[: self.top_k]
        ]

    def retrieve_relevant_chunks(
        self, message: str, context: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        try:
            queries = self._expand_query(message)
            queryset = self._base_queryset(context)

            all_scored: list[list[tuple[ContentChunk, float]]] = []
            for query in queries:
                query_vector = self._embed_query(query)
                scored = self._retrieve_for_query(queryset, query_vector)
                all_scored.append(scored)

            if len(all_scored) == 1:
                # No expansion — use simple sort (faster)
                scored_flat = all_scored[0]
                scored_flat.sort(key=lambda item: item[1], reverse=True)
                return [
                    {"chunk": chunk, "similarity": similarity}
                    for chunk, similarity in scored_flat[: self.top_k]
                ]

            return self._merge_and_rerank(all_scored)
        except DatabaseError as exc:
            # The most common cause is the embedding column / pgvector extension
            # missing on this tenant's schema (migration not yet applied). Fall
            # back to ungrounded chat so the tutor still responds instead of 500.
            logger.warning(
                "RAG retrieval skipped due to DatabaseError (likely missing migration "
                "or pgvector extension on this tenant): %s",
                exc,
            )
            return []

    def _build_messages(
        self, message: str, snippets: list[dict[str, Any]]
    ) -> list[dict[str, str]]:
        tenant_name = getattr(self.tenant, "name", "the school")
        rules = (
            "You are a careful school tutor assistant.\n"
            "Rules:\n"
            "1) Use only the provided snippets as factual grounding.\n"
            '2) If snippets are insufficient, explicitly say "I’m not sure".\n'
            "3) Be concise, clear, and teacher-friendly.\n"
            "4) Do not invent sources, facts, or citations.\n"
            f"5) Keep tone appropriate for {tenant_name} classroom culture."
        )
        context_block = "\n\n".join(
            [
                (
                    f"[Source {idx + 1}] type={item['chunk'].source_type} id={item['chunk'].source_id}\n"
                    f"{item['chunk'].text[:900]}"
                )
                for idx, item in enumerate(snippets)
            ]
        )
        user_prompt = (
            f"Question:\n{message}\n\n"
            f"Grounding snippets:\n{context_block}\n\n"
            'Answer using only the snippets. If uncertain, say "I’m not sure" and suggest what to ask next.'
        )
        return [
            {"role": "system", "content": rules},
            {"role": "user", "content": user_prompt},
        ]

    @staticmethod
    def _sanitize_history(
        conversation_history: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, str]]:
        cleaned: list[dict[str, str]] = []
        for item in conversation_history or []:
            if not isinstance(item, dict):
                continue
            role = str(item.get("role") or "").strip().lower()
            if role == "ai":
                role = "assistant"
            if role not in {"user", "assistant"}:
                continue
            content = item.get("content")
            if not isinstance(content, str):
                continue
            content_text = content.strip()
            if not content_text:
                continue
            cleaned.append({"role": role, "content": content_text})
        return cleaned[-6:]

    @staticmethod
    def _compute_confidence(grounded: list[dict[str, Any]]) -> float:
        """
        Confidence score (0.0–1.0) based on the mean cosine similarity of grounded chunks.
        Interpretation:
          >= 0.85 → High confidence (very relevant sources)
          0.70–0.85 → Moderate confidence
          < 0.70 → Low confidence (answer may be imprecise)
        """
        if not grounded:
            return 0.0
        similarities = [float(item.get("similarity", 0.0)) for item in grounded]
        mean_sim = sum(similarities) / len(similarities)
        # Clamp to [0, 1] — RRF scores can be small floats outside cosine range
        return round(max(0.0, min(1.0, mean_sim)), 4)

    @staticmethod
    def _confidence_label(confidence: float) -> str:
        if confidence >= 0.85:
            return "high"
        if confidence >= 0.70:
            return "moderate"
        return "low"

    def _build_context_block(self, snippets: list[dict[str, Any]]) -> str:
        parts = []
        for idx, item in enumerate(snippets):
            chunk = item["chunk"]
            parts.append(
                f"[Source {idx + 1}] type={chunk.source_type} id={chunk.source_id}\n{chunk.text[:900]}"
            )
        return "\n\n".join(parts)

    def _build_grounded_messages(
        self,
        message: str,
        snippets: list[dict[str, Any]],
        *,
        conversation_history: list[dict[str, Any]] | None = None,
        context: dict[str, Any] | None = None,
    ) -> list[dict[str, str]]:
        tenant_name = getattr(self.tenant, "name", "the school")
        user_role = str((context or {}).get("user_role") or "").strip().lower()
        mode = str((context or {}).get("mode") or "direct").strip().lower()
        lang = str((context or {}).get("lang") or "en")
        lang_instruction = get_lang_instruction(lang)
        audience = "teacher-friendly" if user_role == "teacher" else "student-friendly"
        context_block = self._build_context_block(snippets)

        if mode == "socratic":
            rules = (
                "You are a Socratic school tutor. Your role is to guide the student to discover "
                "the answer themselves — do NOT give the answer directly.\n"
                "Rules:\n"
                "1) Ask 1–2 focused questions that lead the student closer to the answer.\n"
                "2) Use only the provided snippets as your factual foundation.\n"
                "3) Acknowledge what the student already seems to understand.\n"
                "4) If snippets are insufficient, say so and suggest a better question to ask.\n"
                f"5) Keep a warm, encouraging tone appropriate for {tenant_name}."
            )
            user_prompt = (
                f"Student’s question:\n{message}\n\n"
                f"Grounding snippets:\n{context_block}\n\n"
                "Guide the student with questions — do not give the answer away."
            )
        else:
            rules = (
                "You are a careful school tutor assistant.\n"
                "Rules:\n"
                "1) Use only the provided snippets as factual grounding.\n"
                '2) If snippets are insufficient, explicitly say "I’m not sure".\n'
                f"3) Be concise, clear, and {audience}.\n"
                "4) Do not invent sources, facts, or citations.\n"
                f"5) Keep tone appropriate for {tenant_name} classroom culture."
            )
            user_prompt = (
                f"Question:\n{message}\n\n"
                f"Grounding snippets:\n{context_block}\n\n"
                'Answer using only the snippets. If uncertain, say "I’m not sure" and suggest what to ask next.'
            )

        if lang_instruction:
            rules = f"{rules}\n{lang_instruction}"

        messages = [{"role": "system", "content": rules}]
        messages.extend(self._sanitize_history(conversation_history))
        messages.append({"role": "user", "content": user_prompt})
        return messages

    def _build_general_messages(
        self,
        message: str,
        *,
        conversation_history: list[dict[str, Any]] | None = None,
        context: dict[str, Any] | None = None,
    ) -> list[dict[str, str]]:
        tenant_name = getattr(self.tenant, "name", "the school")
        user_role = str((context or {}).get("user_role") or "").strip().lower()
        lang = str((context or {}).get("lang") or "en")
        lang_instruction = get_lang_instruction(lang)
        if user_role == "teacher":
            rules = (
                "You are an AI teaching assistant for school teachers.\n"
                "Help with quizzes, homework, lesson planning, examples, summaries, and classroom strategies.\n"
                "If school-specific records, lesson text, or chapter material are missing, give a practical general answer "
                "and state what context would improve it.\n"
                "Do not claim to have accessed internal school data unless it was provided.\n"
                f"Keep responses classroom-ready and appropriate for {tenant_name}."
            )
        else:
            rules = (
                "You are a helpful school tutor assistant.\n"
                "Explain concepts clearly, give examples, and keep answers practical.\n"
                "If lesson-specific material is missing, give a general answer and say what context would improve it.\n"
                "Do not claim to have seen materials that were not provided.\n"
                f"Keep responses appropriate for {tenant_name}."
            )
        if lang_instruction:
            rules = f"{rules}\n{lang_instruction}"
        messages = [{"role": "system", "content": rules}]
        messages.extend(self._sanitize_history(conversation_history))
        messages.append({"role": "user", "content": message})
        return messages

    @staticmethod
    def _requires_grounding(context: dict[str, Any] | None = None) -> bool:
        payload = context or {}
        return any(
            payload.get(key) not in (None, "")
            for key in ("lesson_id", "chapter_id", "source_id", "source_type")
        )

    @staticmethod
    def _demo_general_response(
        message: str, context: dict[str, Any] | None = None
    ) -> str:
        prompt = str(message or "").strip()
        lowered = prompt.lower()
        user_role = str((context or {}).get("user_role") or "").strip().lower()

        if "quiz" in lowered or "multiple choice" in lowered:
            return (
                "I can help draft that. Share the subject, grade, and topic for a tailored version. "
                "A solid starting format is 5 multiple-choice questions, 2 short answers, and a brief answer key."
            )
        if "homework" in lowered or "assignment" in lowered:
            return (
                "I can help build that. Share the class level, topic, and difficulty you want. "
                "A useful homework structure is: 1 recap question, 3 practice questions, 1 application task, and 1 reflection prompt."
            )
        if "summary" in lowered or "summarize" in lowered:
            return (
                "I can summarize it once you share the lesson title or text. "
                "A good class summary usually covers the key idea, 2 to 3 supporting points, and one example."
            )
        if user_role == "teacher" and (
            "weak" in lowered or "support" in lowered or "struggling" in lowered
        ):
            return (
                "A practical next step is to group struggling students by the specific skill gap, reteach one concept briefly, "
                "use one worked example, then check understanding with a short exit question."
            )
        return "I can help with that. Share the subject, grade, topic, or lesson text, and I can give a more targeted answer."

    def _general_fallback_metadata(self) -> tuple[str | None, str | None]:
        if not self.config.get("enabled"):
            return "disabled", "AI features are disabled in SaaS settings."
        if not self.config.get("configured"):
            return (
                "not_configured",
                "AI provider is not configured. Please add a valid API key in SaaS settings.",
            )
        return "provider_error", "AI provider is unavailable right now."

    def answer_without_grounding(
        self,
        message: str,
        *,
        context: dict[str, Any] | None = None,
        conversation_history: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        messages = self._build_general_messages(
            message,
            conversation_history=conversation_history,
            context=context,
        )
        answer, usage = self._call_chat_model(messages)
        if answer:
            return {
                "answer": answer,
                "sources": [],
                "usage": usage,
                "is_demo": False,
                "fallback_reason": "general_llm",
            }

        fallback_reason, error = self._general_fallback_metadata()
        return {
            "answer": self._demo_general_response(message, context=context),
            "sources": [],
            "usage": {
                "model": "fallback-demo",
                "prompt_tokens": 0,
                "completion_tokens": 0,
            },
            "is_demo": True,
            "fallback_reason": fallback_reason,
            "error": error,
        }

    def _call_chat_model(
        self, messages: list[dict[str, str]]
    ) -> tuple[str, dict[str, Any]]:
        client = self._openai_client()
        if not client:
            return (
                "",
                {
                    "model": "fallback",
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                },
            )

        try:
            response = chat_with_fallback(
                messages=messages,
                temperature=0.2,
                max_tokens=500,
            )
            content = response.choices[0].message.content or ""
            usage = getattr(response, "usage", None)
            return (
                content.strip(),
                {
                    "model": self.model,
                    "prompt_tokens": int(getattr(usage, "prompt_tokens", 0) or 0),
                    "completion_tokens": int(
                        getattr(usage, "completion_tokens", 0) or 0
                    ),
                },
            )
        except Exception as exc:
            logger.warning("Tutor chat model call failed: %s", exc)
            return (
                "",
                {
                    "model": self.model,
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                },
            )

    @staticmethod
    def _no_context_response(context: dict[str, Any] | None = None) -> str:
        payload = context or {}
        suggestions = []
        if payload.get("lesson_id"):
            suggestions.append("Ask about a specific concept from your lesson text")
        if payload.get("chapter_id"):
            suggestions.append("Ask about chapter definitions or worked examples")
        if not suggestions:
            suggestions.append(
                "Ask with lesson or chapter context, e.g. key concept, summary, or example question"
            )
        return f"I’m not sure from the available context. {suggestions[0]}."

    def stream_answer(
        self,
        message: str,
        context: dict[str, Any] | None = None,
        conversation_history: list[dict[str, Any]] | None = None,
        student=None,
        using: str = "default",
    ):
        """
        Generator that yields streaming chunks for WebSocket delivery.

        Yields dicts with shape:
          {"type": "token",  "content": "<partial text>"}
          {"type": "done",   "answer": "<full answer>", "sources": [...],
                             "confidence": 0.87, "confidence_label": "high",
                             "mode": "direct", "usage": {...}}
          {"type": "error",  "detail": "<message>"}         (on failure)
          {"type": "no_context"}                             (no grounded chunks)

        Falls back to non-streaming if the OpenAI client is unavailable.
        Pass `student` to enable adaptive similarity threshold based on BKT mastery.
        """
        effective_min_similarity = self.get_adaptive_min_similarity(
            student=student, using=using
        )
        retrieved = self.retrieve_relevant_chunks(message, context=context)
        grounded = [
            item
            for item in retrieved
            if float(item["similarity"]) >= effective_min_similarity
        ]

        if not grounded:
            if not self._requires_grounding(context):
                # General LLM — stream if possible, else demo
                yield from self._stream_general(
                    message, context=context, conversation_history=conversation_history
                )
                return
            yield {"type": "no_context", "detail": self._no_context_response(context)}
            return

        messages = self._build_grounded_messages(
            message,
            grounded,
            conversation_history=conversation_history,
            context=context,
        )
        client = self._openai_client()
        confidence = self._compute_confidence(grounded)
        citations = self._build_citations(grounded)
        mode = str((context or {}).get("mode") or "direct")

        if not client:
            # Fallback: non-streaming answer
            answer = self._no_context_response(context)
            yield {"type": "token", "content": answer}
            yield {
                "type": "done",
                "answer": answer,
                "sources": citations,
                "confidence": confidence,
                "confidence_label": self._confidence_label(confidence),
                "mode": mode,
                "usage": {
                    "model": "fallback",
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                },
                "is_demo": True,
            }
            return

        try:
            stream = stream_with_fallback(
                messages=messages,
                temperature=0.2,
                max_tokens=500,
            )
            full_answer = ""
            prompt_tokens = 0
            completion_tokens = 0
            for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    full_answer += delta.content
                    yield {"type": "token", "content": delta.content}
                # Capture usage from final chunk (OpenAI sends it on last chunk)
                if hasattr(chunk, "usage") and chunk.usage:
                    prompt_tokens = int(getattr(chunk.usage, "prompt_tokens", 0) or 0)
                    completion_tokens = int(
                        getattr(chunk.usage, "completion_tokens", 0) or 0
                    )

            yield {
                "type": "done",
                "answer": full_answer,
                "sources": citations,
                "confidence": confidence,
                "confidence_label": self._confidence_label(confidence),
                "mode": mode,
                "usage": {
                    "model": self.model,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                },
                "is_demo": False,
            }
        except Exception as exc:
            logger.warning("Streaming tutor chat failed: %s", exc)
            yield {"type": "error", "detail": "AI provider error. Please try again."}

    def _stream_general(
        self,
        message: str,
        context: dict[str, Any] | None = None,
        conversation_history: list[dict[str, Any]] | None = None,
    ):
        """Streaming path for general (non-grounded) LLM responses."""
        messages = self._build_general_messages(
            message, conversation_history=conversation_history, context=context
        )
        client = self._openai_client()
        if not client:
            demo = self._demo_general_response(message, context=context)
            yield {"type": "token", "content": demo}
            yield {
                "type": "done",
                "answer": demo,
                "sources": [],
                "confidence": 0.0,
                "confidence_label": "low",
                "mode": "direct",
                "usage": {
                    "model": "fallback-demo",
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                },
                "is_demo": True,
            }
            return
        try:
            stream = stream_with_fallback(
                messages=messages,
                temperature=0.3,
                max_tokens=500,
            )
            full_answer = ""
            for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    full_answer += delta.content
                    yield {"type": "token", "content": delta.content}
            yield {
                "type": "done",
                "answer": full_answer,
                "sources": [],
                "confidence": 0.0,
                "confidence_label": "low",
                "mode": "direct",
                "usage": {
                    "model": self.model,
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                },
                "is_demo": False,
                "fallback_reason": "general_llm",
            }
        except Exception as exc:
            logger.warning("Streaming general chat failed: %s", exc)
            yield {"type": "error", "detail": "AI provider error. Please try again."}

    @staticmethod
    def _build_citations(grounded: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Build full citation objects for each grounded chunk.

        Each citation includes:
          source_type  — 'lesson', 'chapter', or 'material'
          source_id    — ID of the source object
          text_span    — full text of the chunk (for exact citation anchoring)
          snippet      — first 220 chars (for preview display)
          similarity   — cosine similarity score (for debugging / UI confidence bars)
          metadata     — chunk metadata dict (may contain lesson_id, chapter_id, title, etc.)
        """
        return [
            {
                "source_type": item["chunk"].source_type,
                "source_id": str(item["chunk"].source_id),
                "text_span": item["chunk"].text,
                "snippet": item["chunk"].text[:220],
                "similarity": round(float(item.get("similarity", 0.0)), 4),
                "metadata": (
                    item["chunk"].metadata
                    if isinstance(item["chunk"].metadata, dict)
                    else {}
                ),
            }
            for item in grounded
        ]

    def answer_question(
        self,
        message: str,
        context: dict[str, Any] | None = None,
        conversation_history: list[dict[str, Any]] | None = None,
        student=None,
        using: str = "default",
    ) -> dict[str, Any]:
        effective_min_similarity = self.get_adaptive_min_similarity(
            student=student, using=using
        )
        retrieved = self.retrieve_relevant_chunks(message, context=context)
        grounded = [
            item
            for item in retrieved
            if float(item["similarity"]) >= effective_min_similarity
        ]

        if not grounded:
            if not self._requires_grounding(context):
                return self.answer_without_grounding(
                    message,
                    context=context,
                    conversation_history=conversation_history,
                )
            return {
                "answer": self._no_context_response(context),
                "sources": [],
                "confidence": 0.0,
                "confidence_label": "low",
                "usage": {
                    "model": "fallback-no-context",
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                },
                "is_demo": False,
                "fallback_reason": "no_context",
            }

        messages = self._build_grounded_messages(
            message,
            grounded,
            conversation_history=conversation_history,
            context=context,
        )
        answer, usage = self._call_chat_model(messages)
        if not answer:
            answer = self._no_context_response(context)

        confidence = self._compute_confidence(grounded)
        return {
            "answer": answer,
            "sources": self._build_citations(grounded),
            "confidence": confidence,
            "confidence_label": self._confidence_label(confidence),
            "usage": usage,
            "is_demo": False,
            "mode": str((context or {}).get("mode") or "direct"),
        }
