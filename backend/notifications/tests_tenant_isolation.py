# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Cross-tenant isolation for async (Celery) and real-time (WebSocket) paths.

Two isolation surfaces that bypass the normal request/queryset stack:

1. Celery tasks — a task must write only to the schema it was dispatched for,
   regardless of which schema happened to be active when it ran. Tasks carry an
   explicit ``tenant_schema`` and wrap work in ``schema_context``; this proves a
   task targeted at school B writes to B even while the ambient connection is on
   school A.

2. WebSocket notification groups — keyed by ``user.pk``, which is a UUID
   (UserAccount.user_id). UUIDs are globally unique across schemas, so a socket
   for one school's user must never receive another school's events. This proves
   that contract holds.
"""

from __future__ import annotations

import json
import uuid
from unittest.mock import MagicMock

from channels.testing import WebsocketCommunicator
from django.test import TestCase, override_settings
from django_tenants.utils import tenant_context

from core.tenant_isolation_base import TwoTenantAPITestCase

IN_MEMORY_CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}


class CeleryTenantContextIsolationTests(TwoTenantAPITestCase):
    """A task dispatched for tenant B must write to B, not the ambient schema."""

    def test_task_writes_to_target_schema_not_ambient(self):
        from notifications.models import Notification
        from notifications.tasks import send_notification_task

        # Ambient connection is tenant A (FastTenantTestCase default). Dispatch a
        # notification task explicitly for tenant B's user.
        title = "iso-task-marker"
        send_notification_task(
            tenant_schema=self.tenant_b.schema_name,
            recipient_id=str(self.user_b.pk),
            title=title,
            message="cross-schema write check",
            channels=[],  # in-app only — no email/SMS/push side effects
        )

        # The row must land in B's schema…
        with tenant_context(self.tenant_b):
            self.assertTrue(
                Notification.objects.filter(title=title).exists(),
                "task did not write to its target tenant schema",
            )
        # …and must NOT bleed into A's schema (the ambient one at call time).
        with tenant_context(self.tenant):
            self.assertFalse(
                Notification.objects.filter(title=title).exists(),
                "task leaked a write into the ambient (wrong) tenant schema",
            )


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS)
class WebSocketNotificationIsolationTests(TestCase):
    """NotificationConsumer groups by UUID pk → events never cross tenants."""

    def _app(self):
        from notifications.consumers import NotificationConsumer

        return NotificationConsumer.as_asgi()

    def _user(self, pk):
        user = MagicMock(username=f"u{pk}", email=f"{pk}@t.test", pk=pk, role="student")
        user.is_authenticated = True
        return user

    async def test_socket_does_not_receive_other_users_notifications(self):
        from channels.layers import get_channel_layer

        from notifications.consumers import notification_group_name

        # Two distinct users (distinct UUID pks) — model a user in each school.
        pk_a, pk_b = uuid.uuid4(), uuid.uuid4()

        comm = WebsocketCommunicator(self._app(), "/ws/notifications/")
        comm.scope["user"] = self._user(pk_a)
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        channel_layer = get_channel_layer()

        # An event addressed to the OTHER user's group must not arrive.
        await channel_layer.group_send(
            notification_group_name(pk_b),
            {
                "type": "send.notification",
                "id": "foreign-1",
                "title": "Other school",
                "message": "should not arrive",
                "link": "",
                "created_at": "2026-01-01T00:00:00+00:00",
            },
        )
        self.assertTrue(
            await comm.receive_nothing(timeout=0.3),
            "socket received an event addressed to a different user's group",
        )

        # Positive control: an event for THIS user's group does arrive.
        await channel_layer.group_send(
            notification_group_name(pk_a),
            {
                "type": "send.notification",
                "id": "own-1",
                "title": "Mine",
                "message": "hello",
                "link": "",
                "created_at": "2026-01-01T00:00:00+00:00",
            },
        )
        response = await comm.receive_json_from(timeout=1)
        self.assertEqual(response["id"], "own-1")

        await comm.disconnect()
