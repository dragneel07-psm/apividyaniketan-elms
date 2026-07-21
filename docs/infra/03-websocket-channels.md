# WebSocket Support (Django Channels)

## Overview

The backend serves both HTTP and WebSocket connections through a single ASGI entry point using **Django Channels 4.2**.

WebSocket endpoints:

| URL | Consumer | Description |
|-----|----------|-------------|
| `ws://<host>/ws/tutor/chat/?token=<jwt>` | `TutorStreamConsumer` | AI tutor streaming |
| `ws://<host>/ws/notifications/?token=<jwt>` | `NotificationConsumer` | Live notification push |

---

## Architecture

```
Client
  │
  │  WebSocket (wss://)
  ▼
Nginx / Reverse Proxy
  │  (proxy_pass with Upgrade headers)
  ▼
Daphne (ASGI)
  │
  ▼
ProtocolTypeRouter  (config/asgi.py)
  ├── "http"       → Django ASGI app (normal HTTP)
  └── "websocket"  → AllowedHostsOriginValidator
                        └── JWTAuthMiddleware (validates ?token=<jwt>)
                              └── URLRouter
                                    ├── ws/tutor/chat/     → TutorStreamConsumer
                                    └── ws/notifications/  → NotificationConsumer
```

---

## Dependencies

Added to `requirements.txt`:

```
channels==4.2.0
channels-redis==4.2.0
daphne==4.2.1
```

Added to `SHARED_APPS` in `settings/base.py`:

```python
"daphne",
"channels",
```

---

## Channel Layer

Uses Redis as the channel layer backend (same Redis instance as Celery):

```python
# settings/base.py
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},
    }
}
ASGI_APPLICATION = "config.asgi.application"
```

For **tests**, `InMemoryChannelLayer` is used (no Redis required):

```python
@override_settings(CHANNEL_LAYERS={
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
})
class MyConsumerTests(TestCase):
    ...
```

---

## JWT Authentication Middleware

File: `backend/core/ws_middleware.py`

Browsers cannot set arbitrary headers on WebSocket connections.
The JWT access token is passed as a query parameter:

```
ws://host/ws/tutor/chat/?token=<access_token>
```

`JWTAuthMiddleware`:
1. Reads `?token=` from the WebSocket query string.
2. Validates via `rest_framework_simplejwt.tokens.AccessToken`.
3. Injects the resolved user into `scope["user"]`.
4. If token is missing or invalid → `scope["user"] = AnonymousUser()`.

Consumers reject anonymous users with close code `4001`.

---

## TutorStreamConsumer

File: `backend/ai_engine/consumers.py`

**Connect:** Authenticate; reject anonymous users (code 4001).

**Receive:** Expects `{"type": "chat", "message": "...", "conversation_id": null, "context": {...}}`.

**Processing flow:**
1. Budget pre-flight (`TokenBudgetService.check()`).
2. Resolve or create `TutorConversation`.
3. Persist user `TutorMessage`.
4. Load last-6-message history from DB.
5. Run `RAGTutorService.stream_answer()` in thread pool (`sync_to_async`).
6. Send each token chunk: `{"type":"token","content":"..."}`.
7. Persist assistant `TutorMessage` with confidence, sources, mode.
8. Deduct budget.
9. Send `done` frame.

**Error frames:**

| `type` | Condition |
|--------|-----------|
| `error` | Invalid JSON, unknown type, empty message, missing tenant |
| `auth_required` | Unauthenticated on receive |
| `budget_exceeded` | Daily token limit reached |

---

## NotificationConsumer

File: `backend/notifications/consumers.py`

**Connect:** Authenticate; join personal channel group `notifications_<user_pk>`.

**Receive:**

| Client message type | Response |
|--------------------|----------|
| `ping` | `{"type":"pong"}` |
| `mark_read` + `notification_id` | Marks DB record; acks `{"type":"marked_read","notification_id":"..."}` |
| anything else | `{"type":"error","detail":"Unknown type: ..."}` |

**Push flow (Django signal → WebSocket):**

```
Notification.objects.create(recipient=user, ...)
  └── post_save signal → _push_notification_ws()
        └── async_to_sync(channel_layer.group_send)(
              "notifications_<user_pk>",
              {"type": "send.notification", "id": ..., "title": ..., ...}
            )
              └── NotificationConsumer.send_notification(event)
                    └── self.send_json({"type": "notification", ...})
```

Push is **best-effort**: wrapped in `try/except`; a Redis outage never blocks DB writes.

---

## Deployment (Production)

### Running with Daphne

```bash
# Daphne ASGI server
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Nginx WebSocket proxy

```nginx
location /ws/ {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

### docker-compose

Add a `daphne` process or replace the `gunicorn` command with:

```yaml
backend:
  command: daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

Ensure `redis` service is running (channel layer dependency).

---

## Testing

Tests use `channels.testing.WebsocketCommunicator` with `InMemoryChannelLayer` — no Redis required in CI.

```bash
cd backend
DEBUG=True ALLOWED_HOSTS=localhost .venv/bin/python manage.py test ai_engine.tests_ws_consumers
```

Test coverage:

| Test class | Cases |
|-----------|-------|
| `NotificationConsumerTests` | Auth rejection, connect, ping/pong, unknown type, invalid JSON, group_send delivery |
| `TutorStreamConsumerTests` | Auth rejection, connect, non-chat type, empty message, missing tenant, budget exceeded, successful streaming + done frame, invalid JSON |
| `NotificationGroupNameTest` | Group name format stability |

---

## Frontend Integration

Connect from JavaScript/TypeScript:

```typescript
const token = localStorage.getItem("access_token");

// AI Tutor streaming
const tutorWs = new WebSocket(`wss://${host}/ws/tutor/chat/?token=${token}`);
tutorWs.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "token") appendToChat(msg.content);
  if (msg.type === "done")  finalize(msg);
  if (msg.type === "budget_exceeded") showLimitWarning(msg);
};
tutorWs.send(JSON.stringify({
  type: "chat",
  message: "Explain photosynthesis",
  conversation_id: null,
}));

// Live notifications
const notifWs = new WebSocket(`wss://${host}/ws/notifications/?token=${token}`);
notifWs.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "notification") showToast(msg.title, msg.message);
};
// Heartbeat
setInterval(() => notifWs.send(JSON.stringify({ type: "ping" })), 30000);
```
