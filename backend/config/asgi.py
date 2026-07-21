# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
ASGI config for config project.

Serves both HTTP (via Django's ASGI app) and WebSocket (via Django Channels)
connections through a single ProtocolTypeRouter.

WebSocket endpoints:
  ws://<host>/ws/tutor/chat/?token=<jwt>      — AI tutor streaming
  ws://<host>/ws/notifications/?token=<jwt>  — live notifications
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Initialise Django before importing anything that touches models/settings.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from config.ws_routing import websocket_urlpatterns  # noqa: E402
from core.ws_middleware import JWTAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
        ),
    }
)
