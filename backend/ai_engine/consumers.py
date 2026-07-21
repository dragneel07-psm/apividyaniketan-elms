# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
WebSocket consumers for the AI engine.

TutorStreamConsumer
  URL: ws://<host>/ws/tutor/chat/?token=<jwt>

  Protocol (JSON messages):

  Client → Server:
    { "type": "chat",
      "message": "Explain photosynthesis",
      "conversation_id": "<uuid | null>",
      "context": { "lesson_id": 42, "mode": "direct" }   // optional
    }

  Server → Client (streamed):
    { "type": "token",   "content": "Photosyn" }          // token chunk
    { "type": "token",   "content": "thesis is..." }
    ...
    { "type": "done",    "answer": "<full>",
      "conversation_id": "<uuid>",
      "sources": [...], "confidence": 0.87,
      "confidence_label": "high", "mode": "direct",
      "usage": {...}, "budget": {...} }

  Error frames:
    { "type": "error",   "detail": "<message>" }
    { "type": "auth_required" }
    { "type": "budget_exceeded", "detail": "...",
      "used_today": N, "daily_limit": N, "resets_at": "..." }
"""

from __future__ import annotations

import json
import logging

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class TutorStreamConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return
        await self.accept()
        logger.debug("WS tutor connect: user=%s", user.pk)

    async def disconnect(self, close_code):
        logger.debug("WS tutor disconnect: code=%s", close_code)

    async def receive(self, text_data=None, bytes_data=None):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.send_json({"type": "auth_required"})
            await self.close(code=4001)
            return

        try:
            data = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            await self.send_json({"type": "error", "detail": "Invalid JSON."})
            return

        if data.get("type") != "chat":
            await self.send_json({"type": "error", "detail": "Unknown message type."})
            return

        message = str(data.get("message") or "").strip()
        if not message:
            await self.send_json({"type": "error", "detail": "message is required."})
            return

        context_payload = data.get("context") or {}
        if not isinstance(context_payload, dict):
            context_payload = {}

        conversation_id = data.get("conversation_id")
        await self._handle_chat(user, message, context_payload, conversation_id)

    async def _handle_chat(self, user, message: str, context: dict, conversation_id):
        from ai_engine.models import AIInteractionLog, TutorConversation, TutorMessage
        from ai_engine.services.rag_tutor_service import RAGTutorService
        from ai_engine.services.token_budget_service import (
            TokenBudgetExceeded,
            TokenBudgetService,
        )

        tenant = getattr(user, "tenant", None)
        if tenant is None:
            await self.send_json(
                {"type": "error", "detail": "tenant context required."}
            )
            return

        db_alias = "default"  # WS consumers don't have request.db_alias; use default
        context.setdefault("user_role", str(getattr(user, "role", "") or "").lower())

        # --- Budget pre-flight ---
        student = await sync_to_async(lambda: getattr(user, "student_profile", None))()
        budget_service = TokenBudgetService()
        try:
            await sync_to_async(budget_service.check)(
                tenant=tenant, student=student, db_alias=db_alias
            )
        except TokenBudgetExceeded as exc:
            await self.send_json(
                {
                    "type": "budget_exceeded",
                    "detail": str(exc),
                    "used_today": exc.used,
                    "daily_limit": exc.limit,
                    "resets_at": exc.resets_at.isoformat(),
                }
            )
            return

        # --- Resolve / create conversation ---
        conversation = await self._get_or_create_conversation(
            user, tenant, conversation_id, message, context, db_alias
        )

        # --- Resolve teaching mode (persisted → auto-select → default) ---
        explicit_mode = str(context.get("mode") or "").strip().lower()
        if explicit_mode in ("direct", "socratic"):
            # Client sent an explicit mode — honour it and persist if different
            if explicit_mode != conversation.preferred_mode:
                await sync_to_async(
                    lambda: TutorConversation.objects.using(db_alias)
                    .filter(id=conversation.id)
                    .update(preferred_mode=explicit_mode)
                )()
                conversation.preferred_mode = explicit_mode
            context["mode"] = explicit_mode
        else:
            # No explicit mode — use persisted or auto-select based on BKT mastery
            resolved_mode = conversation.preferred_mode or "direct"
            if not conversation.preferred_mode and student:
                # Auto-select: low mastery students benefit more from Socratic
                from ai_engine.models import SkillMastery

                avg_mastery = await sync_to_async(
                    lambda: (
                        SkillMastery.objects.using(db_alias)
                        .filter(student=student)
                        .values_list("p_mastery", flat=True)
                    )
                )()
                avg_mastery = list(avg_mastery)
                if avg_mastery:
                    avg = sum(avg_mastery) / len(avg_mastery)
                    resolved_mode = "socratic" if avg < 0.45 else "direct"
            context["mode"] = resolved_mode

        # --- Persist student language preference into context ---
        if student and "lang" not in context:
            context["lang"] = getattr(student, "language_preference", "en") or "en"

        # --- Persist student message ---
        await sync_to_async(TutorMessage.objects.using(db_alias).create)(
            conversation=conversation,
            role="user",
            content=message,
        )

        # --- Load DB history for context ---
        history = await sync_to_async(
            lambda: list(
                TutorMessage.objects.using(db_alias)
                .filter(conversation=conversation)
                .order_by("created_at")
                .values("role", "content")
            )
        )()
        history = history[-6:]

        # --- Stream AI response ---
        service = RAGTutorService(tenant=tenant)
        full_answer = ""
        done_payload = {}

        # Run synchronous generator in thread pool, sending each chunk to client
        def _generate():
            from django.db import connection

            connection.set_tenant(tenant)
            return list(
                service.stream_answer(
                    message,
                    context=context,
                    conversation_history=history,
                    student=student,
                    using=db_alias,
                )
            )

        chunks = await sync_to_async(_generate)()

        for chunk in chunks:
            if chunk.get("type") == "token":
                full_answer += chunk.get("content", "")
                await self.send_json({"type": "token", "content": chunk["content"]})
            elif chunk.get("type") == "done":
                done_payload = chunk
            elif chunk.get("type") in ("error", "no_context"):
                await self.send_json(chunk)
                return

        usage = done_payload.get("usage") or {}
        prompt_tokens = int(usage.get("prompt_tokens") or 0)
        completion_tokens = int(usage.get("completion_tokens") or 0)
        total_tokens = prompt_tokens + completion_tokens

        # --- Persist assistant message ---
        await sync_to_async(TutorMessage.objects.using(db_alias).create)(
            conversation=conversation,
            role="assistant",
            content=full_answer,
            sources=done_payload.get("sources") or [],
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            is_demo=bool(done_payload.get("is_demo")),
            confidence=done_payload.get("confidence"),
            confidence_label=done_payload.get("confidence_label", ""),
            mode=done_payload.get("mode", "direct"),
        )

        # --- Deduct budget ---
        budget_status = await sync_to_async(budget_service.deduct)(
            tenant=tenant, student=student, tokens_used=total_tokens, db_alias=db_alias
        )

        # --- Log interaction ---
        try:
            await sync_to_async(AIInteractionLog.objects.using(db_alias).create)(
                tenant=tenant,
                user=user,
                feature_used="tutor_rag_ws",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
            )
        except Exception as exc:
            logger.warning("WS tutor log failed: %s", exc)

        # --- Final done frame ---
        await self.send_json(
            {
                "type": "done",
                "conversation_id": str(conversation.id),
                "answer": full_answer,
                "sources": done_payload.get("sources") or [],
                "confidence": done_payload.get("confidence", 0.0),
                "confidence_label": done_payload.get("confidence_label", "low"),
                "mode": done_payload.get("mode", "direct"),
                "usage": usage,
                "is_demo": bool(done_payload.get("is_demo")),
                "fallback_reason": done_payload.get("fallback_reason"),
                "error": done_payload.get("error"),
                "budget": budget_status,
            }
        )

    async def _get_or_create_conversation(
        self, user, tenant, conversation_id, message, context, db_alias
    ):
        from ai_engine.models import TutorConversation

        if conversation_id:
            try:
                conv = await sync_to_async(
                    TutorConversation.objects.using(db_alias).get
                )(id=conversation_id, user=user, tenant=tenant)
                return conv
            except TutorConversation.DoesNotExist:
                pass

        student = await sync_to_async(lambda: getattr(user, "student_profile", None))()
        auto_title = message[:80] + ("…" if len(message) > 80 else "")
        return await sync_to_async(TutorConversation.objects.using(db_alias).create)(
            tenant=tenant,
            user=user,
            student=student,
            lesson_id=context.get("lesson_id") or None,
            subject_id=context.get("subject_id") or None,
            title=auto_title,
        )

    async def send_json(self, content):
        await self.send(text_data=json.dumps(content))


class ProgressReportStreamConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for streaming AI progress report generation.

    URL: ws://<host>/ws/progress-report/?token=<jwt>

    Protocol (JSON messages):

    Client → Server:
      { "type": "generate",
        "report_type": "student" | "parent" | "teacher",
        "force": false
      }

    Server → Client:
      { "type": "status",  "message": "Collecting lesson data..." }
      { "type": "status",  "message": "Analyzing assessment results..." }
      { "type": "status",  "message": "Generating AI insights..." }
      { "type": "done",    "report": {...}, "cached": false }
      { "type": "error",   "detail": "..." }
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data=None, bytes_data=None):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.send_json({"type": "auth_required"})
            await self.close(code=4001)
            return

        try:
            data = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            await self.send_json({"type": "error", "detail": "Invalid JSON."})
            return

        if data.get("type") != "generate":
            await self.send_json({"type": "error", "detail": "Unknown message type."})
            return

        report_type = str(data.get("report_type") or "student").lower()
        if report_type not in ("student", "parent", "teacher"):
            await self.send_json(
                {
                    "type": "error",
                    "detail": "report_type must be student, parent, or teacher.",
                }
            )
            return

        force = bool(data.get("force", False))
        await self._handle_generate(user, report_type, force)

    async def _handle_generate(self, user, report_type: str, force: bool):
        from academic.models import Student

        tenant = getattr(user, "tenant", None)
        if tenant is None:
            await self.send_json(
                {"type": "error", "detail": "tenant context required."}
            )
            return

        db_alias = "default"

        # Resolve student
        try:
            student = await sync_to_async(Student.objects.get)(user=user)
        except Student.DoesNotExist:
            await self.send_json(
                {
                    "type": "error",
                    "detail": "Progress reports are only available for students.",
                }
            )
            return

        from datetime import timedelta

        from django.utils import timezone

        from ai_engine.models import StudentAIReport
        from ai_engine.services.progress_report_service import ProgressReportService

        # Check cache first (avoids expensive LLM call)
        if not force:
            cutoff = timezone.now() - timedelta(days=7)
            cached = await sync_to_async(
                lambda: StudentAIReport.objects.using(db_alias)
                .filter(
                    student=student, report_type=report_type, generated_at__gte=cutoff
                )
                .order_by("-generated_at")
                .first()
            )()
            if cached:
                await self.send_json(
                    {
                        "type": "done",
                        "report": cached.report_data,
                        "cached": True,
                        "generated_at": cached.generated_at.isoformat(),
                    }
                )
                return

        # Stream status updates through the generation phases
        await self.send_json(
            {"type": "status", "message": "Collecting lesson progress data..."}
        )
        await self.send_json(
            {"type": "status", "message": "Analyzing assessment results..."}
        )
        await self.send_json(
            {"type": "status", "message": "Reviewing AI tutor usage..."}
        )
        await self.send_json(
            {
                "type": "status",
                "message": "Generating AI insights (this may take a moment)...",
            }
        )

        def _generate():
            from django.db import connection

            connection.set_tenant(tenant)
            svc = ProgressReportService(tenant=tenant, db_alias=db_alias)
            return svc.generate(
                student, report_type=report_type, save=True, is_automated=False
            )

        try:
            result = await sync_to_async(_generate)()
        except Exception as exc:
            logger.warning("ProgressReportStreamConsumer: generation failed: %s", exc)
            await self.send_json(
                {
                    "type": "error",
                    "detail": "Report generation failed. Please try again.",
                }
            )
            return

        await self.send_json(
            {
                "type": "done",
                "report": result.get("report") or result,
                "cached": False,
                "generated_at": result.get("generated_at", ""),
            }
        )

    async def send_json(self, content):
        await self.send(text_data=json.dumps(content))
