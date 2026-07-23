# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
JWT Authentication Middleware for Django Channels WebSocket connections.

Browsers cannot set arbitrary headers on WebSocket connections, so the JWT
access token is passed as a URL query parameter:

    ws://host/ws/tutor/chat/?token=<access_token>

This middleware validates the token using the same simplejwt logic as the
DRF views, then injects the user into scope["user"] so consumers can access
it via self.scope["user"].

If the token is missing or invalid, scope["user"] is set to AnonymousUser.
Consumers should close the connection if scope["user"].is_anonymous is True.
"""

from __future__ import annotations

import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)


@database_sync_to_async
def _get_user_from_token(token_str: str):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    try:
        token = AccessToken(token_str)
        user_id = token["user_id"]
        return User.objects.get(pk=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError) as exc:
        logger.debug("WS JWT auth failed: %s", exc)
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Reads ?token=<jwt> from the WebSocket URL query string and resolves
    the user, injecting it into scope["user"].
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)
        token_list = params.get("token", [])
        if token_list:
            scope["user"] = await _get_user_from_token(token_list[0])
        else:
            scope["user"] = AnonymousUser()
        return await super().__call__(scope, receive, send)
