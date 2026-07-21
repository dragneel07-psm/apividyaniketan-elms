# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Tests for WebSocket consumers.

Uses channels.testing.WebsocketCommunicator (in-memory, no Redis needed).
CHANNEL_LAYERS is overridden to use InMemoryChannelLayer for all tests.
"""

from __future__ import annotations

import datetime
import json
from unittest.mock import AsyncMock, MagicMock, patch

from channels.testing import WebsocketCommunicator
from django.test import TestCase, override_settings

IN_MEMORY_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_user(**kwargs):
    defaults = dict(username="wsuser", email="ws@test.com", pk=42, role="student")
    defaults.update(kwargs)
    user = MagicMock(**defaults)
    user.is_authenticated = True
    return user


def _anon_user():
    anon = MagicMock(is_authenticated=False)
    return anon


# ---------------------------------------------------------------------------
# NotificationConsumer tests
# ---------------------------------------------------------------------------


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS)
class NotificationConsumerTests(TestCase):

    def _app(self):
        from notifications.consumers import NotificationConsumer

        return NotificationConsumer.as_asgi()

    async def test_unauthenticated_user_rejected(self):
        comm = WebsocketCommunicator(self._app(), "/ws/notifications/")
        comm.scope["user"] = _anon_user()
        connected, code = await comm.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4001)
        await comm.disconnect()

    async def test_authenticated_user_connects(self):
        comm = WebsocketCommunicator(self._app(), "/ws/notifications/")
        comm.scope["user"] = _make_user()
        connected, code = await comm.connect()
        self.assertTrue(connected)
        await comm.disconnect()

    async def test_ping_returns_pong(self):
        comm = WebsocketCommunicator(self._app(), "/ws/notifications/")
        comm.scope["user"] = _make_user()
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        await comm.send_to(text_data=json.dumps({"type": "ping"}))
        response = await comm.receive_json_from()
        self.assertEqual(response["type"], "pong")
        await comm.disconnect()

    async def test_unknown_type_returns_error(self):
        comm = WebsocketCommunicator(self._app(), "/ws/notifications/")
        comm.scope["user"] = _make_user()
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        await comm.send_to(text_data=json.dumps({"type": "unknown_msg"}))
        response = await comm.receive_json_from()
        self.assertEqual(response["type"], "error")
        await comm.disconnect()

    async def test_invalid_json_returns_error(self):
        comm = WebsocketCommunicator(self._app(), "/ws/notifications/")
        comm.scope["user"] = _make_user()
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        await comm.send_to(text_data="not-json{{{{")
        response = await comm.receive_json_from()
        self.assertEqual(response["type"], "error")
        self.assertIn("JSON", response["detail"])
        await comm.disconnect()

    async def test_send_notification_event_delivered_to_client(self):
        """Channel layer group_send pushes the notification frame to the WebSocket."""
        from channels.layers import get_channel_layer

        from notifications.consumers import notification_group_name

        user = _make_user()
        comm = WebsocketCommunicator(self._app(), "/ws/notifications/")
        comm.scope["user"] = user
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        # Push via channel layer (simulates the Django signal doing group_send)
        channel_layer = get_channel_layer()
        group = notification_group_name(user.pk)
        await channel_layer.group_send(
            group,
            {
                "type": "send.notification",
                "id": "notif-1",
                "title": "Test Notice",
                "message": "Hello",
                "link": "/student/notices",
                "created_at": "2025-01-01T00:00:00+00:00",
            },
        )

        response = await comm.receive_json_from()
        self.assertEqual(response["type"], "notification")
        self.assertEqual(response["id"], "notif-1")
        self.assertEqual(response["title"], "Test Notice")
        await comm.disconnect()


# ---------------------------------------------------------------------------
# TutorStreamConsumer tests
# ---------------------------------------------------------------------------


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS)
class TutorStreamConsumerTests(TestCase):

    def _app(self):
        from ai_engine.consumers import TutorStreamConsumer

        return TutorStreamConsumer.as_asgi()

    def _student_user(self):
        tenant = MagicMock(pk=1)
        user = _make_user(pk=99, role="student")
        user.tenant = tenant
        user.student_profile = MagicMock(pk=10)
        return user

    async def test_unauthenticated_rejected(self):
        comm = WebsocketCommunicator(self._app(), "/ws/tutor/chat/")
        comm.scope["user"] = _anon_user()
        connected, code = await comm.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4001)
        await comm.disconnect()

    async def test_authenticated_connects(self):
        comm = WebsocketCommunicator(self._app(), "/ws/tutor/chat/")
        comm.scope["user"] = self._student_user()
        connected, _ = await comm.connect()
        self.assertTrue(connected)
        await comm.disconnect()

    async def test_non_chat_type_returns_error(self):
        comm = WebsocketCommunicator(self._app(), "/ws/tutor/chat/")
        comm.scope["user"] = self._student_user()
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        await comm.send_to(text_data=json.dumps({"type": "subscribe"}))
        response = await comm.receive_json_from()
        self.assertEqual(response["type"], "error")
        await comm.disconnect()

    async def test_empty_message_returns_error(self):
        comm = WebsocketCommunicator(self._app(), "/ws/tutor/chat/")
        comm.scope["user"] = self._student_user()
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        await comm.send_to(text_data=json.dumps({"type": "chat", "message": "   "}))
        response = await comm.receive_json_from()
        self.assertEqual(response["type"], "error")
        self.assertIn("message", response["detail"])
        await comm.disconnect()

    async def test_missing_tenant_returns_error(self):
        user = _make_user(pk=5, role="student")
        user.tenant = None

        comm = WebsocketCommunicator(self._app(), "/ws/tutor/chat/")
        comm.scope["user"] = user
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        await comm.send_to(text_data=json.dumps({"type": "chat", "message": "hello"}))
        response = await comm.receive_json_from()
        self.assertEqual(response["type"], "error")
        self.assertIn("tenant", response["detail"])
        await comm.disconnect()

    async def test_budget_exceeded_returns_budget_frame(self):
        from ai_engine.services.token_budget_service import TokenBudgetExceeded

        user = self._student_user()
        reset_time = datetime.datetime(2099, 1, 1, tzinfo=datetime.timezone.utc)
        exc = TokenBudgetExceeded(used=1000, limit=1000, resets_at=reset_time)

        comm = WebsocketCommunicator(self._app(), "/ws/tutor/chat/")
        comm.scope["user"] = user
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        with patch(
            "ai_engine.services.token_budget_service.TokenBudgetService.check",
            side_effect=exc,
        ):
            await comm.send_to(
                text_data=json.dumps(
                    {"type": "chat", "message": "tell me about gravity"}
                )
            )
            response = await comm.receive_json_from()

        self.assertEqual(response["type"], "budget_exceeded")
        self.assertEqual(response["used_today"], 1000)
        self.assertEqual(response["daily_limit"], 1000)
        await comm.disconnect()

    async def test_successful_chat_streams_tokens_and_done(self):
        from ai_engine.consumers import TutorStreamConsumer

        user = self._student_user()
        fake_chunks = [
            {"type": "token", "content": "Hello"},
            {"type": "token", "content": " world"},
            {
                "type": "done",
                "answer": "Hello world",
                "sources": [],
                "confidence": 0.9,
                "confidence_label": "high",
                "mode": "direct",
                "usage": {"prompt_tokens": 10, "completion_tokens": 5},
                "is_demo": False,
            },
        ]

        fake_conv = MagicMock()
        fake_conv.id = "conv-uuid-1234"

        async def _fake_get_or_create(self_consumer, u, tenant, conv_id, msg, ctx, db):
            return fake_conv

        comm = WebsocketCommunicator(self._app(), "/ws/tutor/chat/")
        comm.scope["user"] = user

        with (
            patch("ai_engine.services.token_budget_service.TokenBudgetService.check"),
            patch(
                "ai_engine.services.token_budget_service.TokenBudgetService.deduct",
                return_value={},
            ),
            patch(
                "ai_engine.services.rag_tutor_service.RAGTutorService.stream_answer",
                return_value=iter(fake_chunks),
            ),
            patch.object(
                TutorStreamConsumer, "_get_or_create_conversation", _fake_get_or_create
            ),
            patch("ai_engine.models.TutorMessage.objects") as mock_msg_mgr,
            patch("ai_engine.models.AIInteractionLog.objects") as mock_log_mgr,
        ):
            mock_msg_mgr.using.return_value.create = MagicMock()
            mock_msg_mgr.using.return_value.filter.return_value.order_by.return_value.values.return_value = (
                []
            )
            mock_log_mgr.using.return_value.create = MagicMock()

            connected, _ = await comm.connect()
            self.assertTrue(connected)

            await comm.send_to(
                text_data=json.dumps({"type": "chat", "message": "Explain gravity"})
            )

            frames = []
            for _ in range(20):
                try:
                    frame = await comm.receive_json_from(timeout=2)
                    frames.append(frame)
                    if frame.get("type") == "done":
                        break
                except Exception:
                    break

            types = [f["type"] for f in frames]
            self.assertIn("done", types)

            done_frame = next(f for f in frames if f["type"] == "done")
            self.assertEqual(done_frame["conversation_id"], "conv-uuid-1234")
            self.assertIn("answer", done_frame)
            self.assertIn("budget", done_frame)

        await comm.disconnect()

    async def test_invalid_json_returns_error(self):
        comm = WebsocketCommunicator(self._app(), "/ws/tutor/chat/")
        comm.scope["user"] = self._student_user()
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        await comm.send_to(text_data="{bad json")
        response = await comm.receive_json_from()
        self.assertEqual(response["type"], "error")
        await comm.disconnect()


# ---------------------------------------------------------------------------
# Utility tests
# ---------------------------------------------------------------------------


class NotificationGroupNameTest(TestCase):
    def test_group_name_format(self):
        from notifications.consumers import notification_group_name

        self.assertEqual(notification_group_name(7), "notifications_7")
        self.assertEqual(notification_group_name("abc"), "notifications_abc")

    def test_group_name_is_stable(self):
        from notifications.consumers import notification_group_name

        name = notification_group_name(42)
        self.assertEqual(name, notification_group_name(42))
        self.assertIn("42", name)
