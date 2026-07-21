# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
WebSocket ticket tenant binding.

WS connections authenticate with a short-lived ticket from
POST /api/users/ws-ticket/. core.ws_middleware.JWTAuthMiddleware routes the
connection by the ticket's ``tenant_schema`` claim, so a ticket minted inside
school A must carry A's schema (never B's) — otherwise a socket could be routed
into the wrong tenant. tests_ws_ticket.py proves the claim is copied; this adds
the cross-tenant assertion using two real schemas.
"""

from __future__ import annotations

from rest_framework_simplejwt.tokens import AccessToken

from core.tenant_isolation_base import TwoTenantAPITestCase


class WsTicketTenantBindingTests(TwoTenantAPITestCase):
    WS_TICKET_URL = "/api/users/ws-ticket/"

    def test_ticket_bound_to_minting_tenant(self):
        client = self.authed(self.client_a, self.user_a)
        response = client.post(self.WS_TICKET_URL)
        self.assertEqual(response.status_code, 200, getattr(response, "data", None))

        ticket = AccessToken(response.data["token"])
        # The ticket routes to A's schema — and explicitly not B's.
        self.assertEqual(ticket["tenant_schema"], self.tenant.schema_name)
        self.assertNotEqual(ticket["tenant_schema"], self.tenant_b.schema_name)
        # Bound to the minting user as well.
        self.assertEqual(str(ticket["user_id"]), str(self.user_a.pk))
