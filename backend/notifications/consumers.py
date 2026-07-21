# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
NotificationConsumer — live push notifications over WebSocket.

URL: ws://<host>/ws/notifications/?token=<jwt>

Each connected user joins a personal group: notifications_<user_pk>
When a Notification is saved (via signal), it is pushed to that group.

Client receives:
  { "type": "notification",
    "id": "<uuid>",
    "title": "...",
    "message": "...",
    "link": "...",
    "created_at": "<iso>" }

Client can send:
  { "type": "mark_read", "notification_id": "<id>" }
  → marks that notification as read in DB and acks back

  { "type": "ping" }
  → responds { "type": "pong" }
"""

from __future__ import annotations

import json
import logging

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


def notification_group_name(user_pk) -> str:
    return f"notifications_{user_pk}"


class NotificationConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return
        self.group_name = notification_group_name(user.pk)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.debug(
            "WS notification connect: user=%s group=%s", user.pk, self.group_name
        )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            await self.send_json({"type": "error", "detail": "Invalid JSON."})
            return

        msg_type = data.get("type")

        if msg_type == "ping":
            await self.send_json({"type": "pong"})

        elif msg_type == "mark_read":
            notification_id = data.get("notification_id")
            if notification_id:
                await self._mark_notification_read(notification_id)
        else:
            await self.send_json(
                {"type": "error", "detail": f"Unknown type: {msg_type}"}
            )

    # --- Channel layer message handler ---
    # Called when the group receives a "send.notification" message
    async def send_notification(self, event):
        """Push a notification payload to this WebSocket client."""
        await self.send_json(
            {
                "type": "notification",
                "id": event.get("id"),
                "title": event.get("title"),
                "message": event.get("message"),
                "link": event.get("link"),
                "created_at": event.get("created_at"),
            }
        )

    @sync_to_async
    def _mark_notification_read(self, notification_id: str):
        from django.db import connection

        from notifications.models import Notification

        user = self.scope["user"]
        tenant = self.scope.get("tenant")
        if tenant:
            connection.set_tenant(tenant)
        else:
            connection.set_schema_to_public()

        try:
            Notification.objects.filter(pk=notification_id, recipient=user).update(
                is_read=True
            )
            # Send ack back (fire-and-forget from sync context)
            import asyncio

            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            loop = asyncio.get_event_loop()
            loop.create_task(
                self.send_json(
                    {
                        "type": "marked_read",
                        "notification_id": notification_id,
                    }
                )
            )
        except Exception as exc:
            logger.warning("mark_read failed: %s", exc)

    async def send_json(self, content):
        await self.send(text_data=json.dumps(content))
