# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Cross-tenant isolation for private messaging.

Conversations and messages live in per-tenant schemas and ConversationViewSet
scopes to ``tenant=request.tenant, participants__user=request.user``. A
school-A credential must never list or read school-B's threads or messages —
a leak here exposes private messages between students/teachers/parents (S1).
"""

from __future__ import annotations

from django_tenants.utils import tenant_context

from core.tenant_isolation_base import TwoTenantAPITestCase


class ConversationsTenantIsolationTests(TwoTenantAPITestCase):
    CONVERSATIONS_URL = "/api/conversations/conversations/"
    MESSAGES_URL = "/api/conversations/messages/"

    def _make_conversation(self, tenant, owner, title):
        """Create a conversation in ``tenant`` with ``owner`` as participant."""
        from conversations.models import (
            Conversation,
            ConversationParticipant,
            Message,
        )

        with tenant_context(tenant):
            convo = Conversation.objects.create(
                tenant=tenant, type="direct", title=title
            )
            ConversationParticipant.objects.create(conversation=convo, user=owner)
            message = Message.objects.create(
                conversation=convo, sender=owner, content=f"{title} secret body"
            )
        return convo, message

    # ── thread listing ───────────────────────────────────────────────────

    def test_thread_list_scoped(self):
        convo_b, _ = self._make_conversation(
            self.tenant_b, self.user_b, "B private thread"
        )

        # School A sees none of B's threads.
        client_a = self.authed(self.client_a, self.user_a)
        resp_a = client_a.get(self.CONVERSATIONS_URL)
        self.assertEqual(resp_a.status_code, 200)
        ids_a = [
            str(item.get("conversation_id") or item.get("id"))
            for item in resp_a.data.get("results", resp_a.data)
        ]
        self.assertNotIn(str(convo_b.conversation_id), ids_a)

        # School B's owner sees their own thread.
        client_b = self.authed(self.client_b, self.user_b)
        resp_b = client_b.get(self.CONVERSATIONS_URL)
        self.assertEqual(resp_b.status_code, 200)
        ids_b = [
            str(item.get("conversation_id") or item.get("id"))
            for item in resp_b.data.get("results", resp_b.data)
        ]
        self.assertIn(str(convo_b.conversation_id), ids_b)

    # ── message access ───────────────────────────────────────────────────

    def test_messages_not_readable_cross_tenant(self):
        convo_b, message_b = self._make_conversation(
            self.tenant_b, self.user_b, "B thread"
        )

        # A passes B's conversation id — not a participant, foreign schema.
        client_a = self.authed(self.client_a, self.user_a)
        resp = client_a.get(
            self.MESSAGES_URL, {"conversation": str(convo_b.conversation_id)}
        )
        self.assertEqual(resp.status_code, 200)
        bodies = [
            item.get("content") for item in resp.data.get("results", resp.data)
        ]
        self.assertNotIn(message_b.content, bodies)
        self.assertEqual(bodies, [])
