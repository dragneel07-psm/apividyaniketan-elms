# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import hashlib
import logging
import random
from dataclasses import dataclass
from typing import Any

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django_tenants.utils import schema_context
from openai import OpenAI

from academic.models import Chapter, Lesson, LessonMaterial
from ai_engine.models import ContentChunk
from ai_engine.services.provider_config import get_ai_provider_config
from core.models.tenant import Domain, Tenant

logger = logging.getLogger(__name__)


@dataclass
class IndexingSummary:
    tenant_schema: str
    source_documents: int = 0
    chunks_indexed: int = 0
    provider: str = "stub"


def _embedding_dimensions() -> int:
    value = getattr(settings, "AI_EMBEDDING_DIMENSIONS", 3072)
    try:
        return max(1, int(value))
    except (TypeError, ValueError):
        return 3072


def _chunk_words() -> int:
    value = getattr(settings, "AI_CONTENT_CHUNK_WORDS", 180)
    try:
        return max(40, int(value))
    except (TypeError, ValueError):
        return 180


def _chunk_overlap_words() -> int:
    value = getattr(settings, "AI_CONTENT_CHUNK_OVERLAP_WORDS", 30)
    try:
        overlap = max(0, int(value))
    except (TypeError, ValueError):
        overlap = 30
    return min(overlap, _chunk_words() - 1)


def _resolve_tenant(tenant_identifier: str) -> Tenant | None:
    value = str(tenant_identifier or "").strip().lower()
    if not value:
        return None

    with schema_context("public"):
        by_schema = Tenant.objects.filter(schema_name__iexact=value).first()
        if by_schema:
            return by_schema
        by_subdomain = Tenant.objects.filter(subdomain__iexact=value).first()
        if by_subdomain:
            return by_subdomain
        domain_hit = (
            Domain.objects.select_related("tenant")
            .filter(Q(domain__iexact=value) | Q(domain__istartswith=f"{value}."))
            .first()
        )
        return getattr(domain_hit, "tenant", None)


def _normalize_text(raw: str | None) -> str:
    text = " ".join(str(raw or "").split())
    return text.strip()


def _chunk_text(text: str) -> list[str]:
    normalized = _normalize_text(text)
    if not normalized:
        return []

    words = normalized.split(" ")
    chunk_size = _chunk_words()
    overlap = _chunk_overlap_words()
    step = max(1, chunk_size - overlap)

    chunks: list[str] = []
    for start in range(0, len(words), step):
        chunk_words = words[start : start + chunk_size]
        if not chunk_words:
            break
        chunk = " ".join(chunk_words).strip()
        if chunk:
            chunks.append(chunk)
        if start + chunk_size >= len(words):
            break
    return chunks


def _deterministic_stub_embedding(text: str, dimensions: int) -> list[float]:
    seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], 16)
    rng = random.Random(seed)
    return [round(rng.uniform(-1.0, 1.0), 6) for _ in range(dimensions)]


def _generate_embeddings(chunks: list[str]) -> tuple[list[list[float]], str]:
    dimensions = _embedding_dimensions()
    config = get_ai_provider_config()
    model = str(
        getattr(settings, "AI_EMBEDDING_MODEL", "text-embedding-3-small")
        or "text-embedding-3-small"
    )

    if config.get("enabled") and config.get("configured"):
        try:
            client = OpenAI(
                api_key=config.get("api_key"),
                base_url=config.get("base_url"),
                default_headers=config.get("request_headers") or None,
                timeout=float(getattr(settings, "OPENAI_TIMEOUT_SECONDS", 30)),
            )
            response = client.embeddings.create(model=model, input=chunks)
            vectors = []
            for item in response.data:
                embedding = list(getattr(item, "embedding", []) or [])
                if len(embedding) > dimensions:
                    embedding = embedding[:dimensions]
                elif len(embedding) < dimensions:
                    embedding = embedding + [0.0] * (dimensions - len(embedding))
                vectors.append(embedding)
            if len(vectors) == len(chunks):
                return vectors, "openai"
        except Exception as exc:
            logger.warning(
                "Embedding provider unavailable; falling back to stub vectors: %s", exc
            )

    return (
        [_deterministic_stub_embedding(chunk, dimensions) for chunk in chunks],
        "stub",
    )


def _source_documents() -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = []

    for chapter in Chapter.objects.select_related("subject").all():
        text = _normalize_text(
            f"{chapter.title}\n{chapter.description or ''}\nSubject: {getattr(chapter.subject, 'name', '')}"
        )
        if text:
            docs.append(
                {
                    "source_type": "chapter",
                    "source_id": str(chapter.id),
                    "text": text,
                    "metadata": {
                        "chapter_id": chapter.id,
                        "subject_id": chapter.subject_id,
                        "title": chapter.title,
                    },
                }
            )

    for lesson in Lesson.objects.select_related("chapter", "chapter__subject").all():
        text = _normalize_text(
            (
                f"{lesson.title}\n"
                f"{lesson.content or ''}\n"
                f"{getattr(lesson, 'video_transcript', None) or ''}\n"
                f"Chapter: {getattr(lesson.chapter, 'title', '')}\n"
                f"Subject: {getattr(getattr(lesson.chapter, 'subject', None), 'name', '')}"
            )
        )
        if text:
            docs.append(
                {
                    "source_type": "lesson",
                    "source_id": str(lesson.id),
                    "text": text,
                    "metadata": {
                        "lesson_id": lesson.id,
                        "chapter_id": lesson.chapter_id,
                        "subject_id": getattr(lesson.chapter, "subject_id", None),
                        "title": lesson.title,
                        "content_type": lesson.content_type,
                    },
                }
            )

    for material in LessonMaterial.objects.select_related(
        "lesson", "lesson__chapter"
    ).all():
        file_name = ""
        try:
            file_name = getattr(material.file, "name", "") or ""
        except Exception:
            file_name = ""
        text = _normalize_text(
            (
                f"{material.title}\n"
                f"{material.link or ''}\n"
                f"{file_name}\n"
                f"Lesson: {getattr(material.lesson, 'title', '')}"
            )
        )
        if text:
            docs.append(
                {
                    "source_type": "material",
                    "source_id": str(material.id),
                    "text": text,
                    "metadata": {
                        "material_id": material.id,
                        "lesson_id": material.lesson_id,
                        "title": material.title,
                        "material_type": material.material_type,
                    },
                }
            )

    return docs


def index_content_for_tenant(tenant_identifier: str) -> IndexingSummary:
    tenant = _resolve_tenant(tenant_identifier)
    if not tenant:
        raise ValueError("Tenant not found.")

    summary = IndexingSummary(tenant_schema=tenant.schema_name)

    with schema_context(tenant.schema_name):
        documents = _source_documents()
        summary.source_documents = len(documents)

        with transaction.atomic():
            for document in documents:
                source_type = document["source_type"]
                source_id = str(document["source_id"])
                chunks = _chunk_text(document["text"])
                if not chunks:
                    ContentChunk.objects.filter(
                        tenant_id=tenant.id,
                        source_type=source_type,
                        source_id=source_id,
                    ).delete()
                    continue

                vectors, provider = _generate_embeddings(chunks)
                summary.provider = provider

                ContentChunk.objects.filter(
                    tenant_id=tenant.id,
                    source_type=source_type,
                    source_id=source_id,
                ).delete()

                rows = []
                for idx, chunk in enumerate(chunks):
                    chunk_metadata = dict(document.get("metadata") or {})
                    chunk_metadata["chunk_index"] = idx
                    rows.append(
                        ContentChunk(
                            tenant_id=tenant.id,
                            source_type=source_type,
                            source_id=source_id,
                            text=chunk,
                            metadata=chunk_metadata,
                            embedding=vectors[idx],
                        )
                    )
                ContentChunk.objects.bulk_create(rows, batch_size=200)
                summary.chunks_indexed += len(rows)

    return summary


def index_raw_content(
    *,
    tenant_schema: str,
    source_type: str,
    source_id: str,
    text: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    tenant = _resolve_tenant(tenant_schema)
    if not tenant:
        raise ValueError("Tenant not found.")

    normalized_source_type = str(source_type or "").strip().lower()
    if normalized_source_type not in {"lesson", "chapter", "material"}:
        raise ValueError("source_type must be one of lesson/chapter/material.")

    normalized_source_id = str(source_id or "").strip()
    if not normalized_source_id:
        raise ValueError("source_id is required.")

    chunks = _chunk_text(text)
    with schema_context(tenant.schema_name):
        ContentChunk.objects.filter(
            tenant_id=tenant.id,
            source_type=normalized_source_type,
            source_id=normalized_source_id,
        ).delete()

        if not chunks:
            return {
                "indexed": False,
                "chunks_indexed": 0,
                "provider": "stub",
            }

        vectors, provider = _generate_embeddings(chunks)
        rows = []
        for idx, chunk in enumerate(chunks):
            chunk_metadata = dict(metadata or {})
            chunk_metadata["chunk_index"] = idx
            rows.append(
                ContentChunk(
                    tenant_id=tenant.id,
                    source_type=normalized_source_type,
                    source_id=normalized_source_id,
                    text=chunk,
                    metadata=chunk_metadata,
                    embedding=vectors[idx],
                )
            )
        ContentChunk.objects.bulk_create(rows, batch_size=200)
    return {
        "indexed": True,
        "chunks_indexed": len(chunks),
        "provider": provider,
    }
