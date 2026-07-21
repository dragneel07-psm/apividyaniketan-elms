# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import json
from typing import Any

try:
    from celery import shared_task
except Exception:
    from core.async_jobs import background_task as shared_task

from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context

from core.models import Tenant

from .models import AIInteractionLog
from .services.indexing_service import index_raw_content
from .services.tutor_service import AITutorService


def _tenant_schema(value: str | None) -> str:
    schema = str(value or "").strip().lower()
    return schema or "public"


def _resolve_tenant(schema_name: str) -> Tenant | None:
    with schema_context("public"):
        return Tenant.objects.filter(schema_name=schema_name).first()


def _resolve_user(user_id: str | None):
    if not user_id:
        return None
    user_model = get_user_model()
    return user_model.objects.filter(pk=user_id).first()


def _as_json_dict(text: str) -> dict[str, Any] | None:
    if not isinstance(text, str) or not text.strip():
        return None
    try:
        value = json.loads(text)
        return value if isinstance(value, dict) else None
    except Exception:
        return None


def _as_json_list(text: str) -> list[dict[str, Any]] | None:
    if not isinstance(text, str) or not text.strip():
        return None
    try:
        value = json.loads(text)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    except Exception:
        return None
    return None


def _fallback_quiz(content: str, question_count: int) -> list[dict[str, Any]]:
    sanitized = (content or "").strip()
    if not sanitized:
        sanitized = "the provided lesson"
    capped = max(1, min(int(question_count or 5), 10))
    return [
        {
            "question": f"What is a key concept from {sanitized[:80]}?",
            "options": ["Concept A", "Concept B", "Concept C", "Concept D"],
            "answer": "Concept A",
            "explanation": "Review the lesson summary and identify the main concept.",
        }
        for _ in range(capped)
    ]


@shared_task(
    name="ai.index_content",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3},
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def ai_index_content_task(
    self,
    *,
    tenant_schema: str,
    content: str,
    metadata: dict[str, Any] | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    schema_name = _tenant_schema(tenant_schema)
    payload = metadata or {}
    source_type = str(payload.get("source_type") or "material").strip().lower()
    source_id = str(payload.get("source_id") or "adhoc-content").strip()

    result = index_raw_content(
        tenant_schema=schema_name,
        source_type=source_type,
        source_id=source_id,
        text=content,
        metadata=payload,
    )

    with schema_context(schema_name):
        tenant = _resolve_tenant(schema_name)
        user = _resolve_user(user_id)
        if tenant:
            AIInteractionLog.objects.create(
                tenant=tenant,
                user=user,
                feature_used="content_index",
                total_tokens=0,
            )

    result["tenant_schema"] = schema_name
    return result


@shared_task(
    name="ai.generate_summary",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3},
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def generate_summary_task(
    self,
    *,
    tenant_schema: str,
    content: str,
    max_points: int = 5,
    user_id: str | None = None,
) -> dict[str, Any]:
    schema_name = _tenant_schema(tenant_schema)
    body = str(content or "").strip()
    capped_points = max(3, min(int(max_points or 5), 10))
    tutor = AITutorService()

    prompt = (
        "Summarize the following study content for a student. "
        f"Return strict JSON only with keys: summary (string), bullet_points (array of max {capped_points} strings). "
        f"Content: {body}"
    )
    response = tutor.generate_response(prompt)
    parsed = _as_json_dict(response) or {}
    bullet_points = parsed.get("bullet_points")
    if not isinstance(bullet_points, list):
        bullet_points = []

    if not parsed.get("summary"):
        parsed["summary"] = body[:320] if body else "No content provided."
    parsed["bullet_points"] = [str(item) for item in bullet_points[:capped_points]]
    parsed["model"] = tutor.model

    with schema_context(schema_name):
        tenant = _resolve_tenant(schema_name)
        user = _resolve_user(user_id)
        if tenant:
            AIInteractionLog.objects.create(
                tenant=tenant,
                user=user,
                feature_used="summary_generation",
                total_tokens=0,
            )

    return parsed


@shared_task(
    name="ai.generate_quiz",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3},
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def generate_quiz_task(
    self,
    *,
    tenant_schema: str,
    content: str,
    question_count: int = 5,
    user_id: str | None = None,
) -> dict[str, Any]:
    schema_name = _tenant_schema(tenant_schema)
    body = str(content or "").strip()
    capped_count = max(1, min(int(question_count or 5), 10))
    tutor = AITutorService()

    prompt = (
        "Generate a student quiz as strict JSON array. "
        "Each item must include keys: question, options (4 strings), answer, explanation. "
        f"Create {capped_count} questions from: {body}"
    )
    response = tutor.generate_response(prompt)
    questions = _as_json_list(response)
    if not questions:
        questions = _fallback_quiz(body, capped_count)
    if len(questions) > capped_count:
        questions = questions[:capped_count]

    with schema_context(schema_name):
        tenant = _resolve_tenant(schema_name)
        user = _resolve_user(user_id)
        if tenant:
            AIInteractionLog.objects.create(
                tenant=tenant,
                user=user,
                feature_used="quiz_generation",
                total_tokens=0,
            )

    return {
        "question_count": len(questions),
        "questions": questions,
        "model": tutor.model,
    }


@shared_task(
    name="ai.parent_digest",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3},
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def send_parent_digest_task(self, *, tenant_schema: str) -> dict[str, Any]:
    """
    Phase 14 — AI Parent Daily Digest.

    For every student in a tenant that has at least one linked parent, generate
    a 3-sentence plain-language digest and send it via the notification system.

    Schedule this task daily (e.g., 7 PM) using Celery Beat:
      CELERY_BEAT_SCHEDULE = {
          "daily-parent-digest": {
              "task": "ai.parent_digest",
              "schedule": crontab(hour=19, minute=0),
              "kwargs": {"tenant_schema": "<schema_name>"},
          }
      }
    """
    schema_name = _tenant_schema(tenant_schema)
    sent_count = 0
    skipped_count = 0

    with schema_context(schema_name):
        tenant = _resolve_tenant(schema_name)
        if tenant is None:
            return {"error": "Tenant not found", "schema": schema_name}

        from academic.models.parent import Parent
        from academic.models.student import Student
        from ai_engine.services.parent_digest_service import ParentDigestService
        from notifications.services import NotificationService

        service = ParentDigestService(tenant=tenant)

        students = Student.objects.filter(academic_class__isnull=False).select_related(
            "user"
        )

        for student in students:
            try:
                # Find parent linked to this student
                parents = Parent.objects.filter(student=student).select_related("user")
                if not parents.exists():
                    continue

                digest = service.generate_digest(student)
                if not digest:
                    skipped_count += 1
                    continue

                for parent in parents:
                    if parent.user:
                        NotificationService.create_notification(
                            recipient=parent.user,
                            title=f"Daily Update: {student.user.get_full_name() if student.user else 'Your child'}",
                            message=digest,
                            tenant=tenant,
                        )
                        sent_count += 1
            except Exception as exc:
                import logging

                logging.getLogger(__name__).warning(
                    "ParentDigest failed for student %s: %s", student.student_id, exc
                )
                skipped_count += 1

    return {"sent": sent_count, "skipped": skipped_count, "tenant": schema_name}


@shared_task(
    name="ai.transcribe_lesson",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3},
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def transcribe_lesson_task(
    self, *, tenant_schema: str, lesson_id: int
) -> dict[str, Any]:
    """
    Phase 11 — Video Transcript Indexing.

    Transcribes the video attached to a lesson via OpenAI Whisper, persists
    the transcript to Lesson.video_transcript, then re-indexes the lesson
    in the RAG vector store so the transcript becomes searchable.
    """
    import logging as _logging

    _log = _logging.getLogger(__name__)

    schema_name = _tenant_schema(tenant_schema)
    with schema_context(schema_name):
        tenant = _resolve_tenant(schema_name)
        if tenant is None:
            return {"error": "Tenant not found", "schema": schema_name}

        from academic.models.lesson import Lesson
        from ai_engine.services.indexing_service import index_raw_content
        from ai_engine.services.video_transcript_service import VideoTranscriptService

        lesson = Lesson.objects.filter(pk=lesson_id).first()
        if lesson is None:
            return {"error": f"Lesson {lesson_id} not found"}

        service = VideoTranscriptService(tenant=tenant)
        transcript = service.transcribe_lesson(lesson)

        if not transcript:
            return {
                "lesson_id": lesson_id,
                "status": "skipped",
                "reason": "no transcript generated",
            }

        # Re-index lesson so transcript is included in RAG retrieval
        full_text = " ".join(
            filter(
                None,
                [
                    lesson.title,
                    lesson.content or "",
                    transcript,
                ],
            )
        )
        try:
            index_raw_content(
                tenant_schema=schema_name,
                source_type="lesson",
                source_id=str(lesson_id),
                text=full_text,
                metadata={
                    "lesson_id": lesson_id,
                    "title": lesson.title,
                    "has_transcript": True,
                },
            )
        except Exception as exc:
            _log.warning(
                "transcribe_lesson_task: re-index failed for lesson %s: %s",
                lesson_id,
                exc,
            )

        return {
            "lesson_id": lesson_id,
            "status": "ok",
            "transcript_chars": len(transcript),
            "tenant": schema_name,
        }
