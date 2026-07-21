# AI Tutor Chat Endpoint (RAG)

## Endpoints

### REST (HTTP)
- `POST /api/ai/tutor/chat/`

### WebSocket (streaming)
- `ws://<host>/ws/tutor/chat/?token=<jwt>`

---

## REST Endpoint

### Request body

```json
{
  "message": "Explain Newton's first law",
  "conversation_id": "<uuid | null>",
  "context": {
    "lesson_id": "lesson-1",
    "subject_id": "subject-1",
    "mode": "direct"
  }
}
```

`conversation_id` is optional. Omit (or pass `null`) to start a new conversation thread.
`mode` is optional (`"direct"` or `"socratic"`; default `"direct"`).

### Response body

```json
{
  "answer": "Newton's first law means ...",
  "conversation_id": "<uuid>",
  "sources": [
    {
      "source_type": "lesson",
      "source_id": "lesson-1",
      "text_span": "Newton's first law states that an object...",
      "similarity": 0.91,
      "metadata": {}
    }
  ],
  "confidence": 0.87,
  "confidence_label": "high",
  "mode": "direct",
  "usage": {
    "model": "gpt-4o-mini",
    "prompt_tokens": 42,
    "completion_tokens": 18
  },
  "budget": {
    "used_today": 450,
    "daily_limit": 10000,
    "resets_at": "2025-01-02T00:00:00+00:00",
    "is_active": true
  }
}
```

---

## WebSocket Endpoint

**URL:** `ws://<host>/ws/tutor/chat/?token=<jwt>`

JWT must be a valid access token (passed as query param; browsers cannot set WebSocket headers).

### Client → Server

```json
{
  "type": "chat",
  "message": "Explain photosynthesis",
  "conversation_id": "<uuid | null>",
  "context": { "lesson_id": 42, "mode": "direct" }
}
```

### Server → Client (streamed)

```json
{ "type": "token",  "content": "Photosyn" }
{ "type": "token",  "content": "thesis is the process..." }
{ "type": "done",   "answer": "<full answer>",
                    "conversation_id": "<uuid>",
                    "sources": [...], "confidence": 0.87,
                    "confidence_label": "high", "mode": "direct",
                    "usage": {...}, "budget": {...} }
```

### Error frames

```json
{ "type": "error",          "detail": "<message>" }
{ "type": "auth_required" }
{ "type": "budget_exceeded", "detail": "...",
                              "used_today": 9000,
                              "daily_limit": 10000,
                              "resets_at": "..." }
```

---

## Behavior

### Multi-query RAG (Reciprocal Rank Fusion)
- The user message is expanded into 3 query variants via LLM.
- Each variant retrieves top-k chunks by cosine similarity.
- Results are merged using Reciprocal Rank Fusion (RRF, `k=60`) to produce a single ranked list.
- Deduplication ensures each chunk appears once, boosted if it ranks high in multiple lists.

### Persistent Conversation Memory
- Every conversation is stored as a `TutorConversation` record with `TutorMessage` rows.
- History (last 6 messages) is loaded from DB and included in each request for continuity.
- Pass `conversation_id` to continue an existing thread.
- Conversations are scoped to `(tenant, user)`.

### Confidence Scoring
- Mean cosine similarity of the top retrieved chunks is mapped to a 0–1 confidence score.
- Labels: `high` (≥ 0.85), `moderate` (≥ 0.70), `low` (< 0.70).
- Both `confidence` and `confidence_label` are returned in responses and persisted on `TutorMessage`.

### Modes
- `direct` — standard grounded Q&A from lesson content.
- `socratic` — LLM guides the student with questions instead of giving direct answers.

### Fallback
- If similarity is below threshold and no strong context found, response falls back to a graceful ungrounded reply with guidance.

---

## Conversation API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai/conversations/` | List user's conversations (paginated) |
| `GET` | `/api/ai/conversations/<id>/` | Get a single conversation |
| `GET` | `/api/ai/conversations/<id>/messages/` | Get all messages in a conversation |

---

## Token Budget / Cost Controls

Every request (REST and WebSocket) is guarded by a daily token budget:
- Budget can be set at tenant-level or overridden per-student.
- If limit is exceeded, the request is rejected with `budget_exceeded` before any LLM call.
- Budget resets automatically at midnight UTC.
- See `/api/ai/token-budgets/` and `/api/ai/token-budgets/my_usage/` for programmatic access.

---

## Security + Isolation

- REST endpoint requires authenticated user; WebSocket validates `?token=<jwt>` via `JWTAuthMiddleware`.
- Throttled via DRF scoped throttle:
  - scope: `ai_tutor_chat`
  - default rate: `30/min` (`THROTTLE_AI_TUTOR_CHAT`)
- Tenant isolation enforced on all DB queries (`tenant=request.tenant`).
- Budget pre-flight runs `select_for_update` to prevent race conditions.

---

## Config

Environment keys:

| Key | Default | Description |
|-----|---------|-------------|
| `AI_TUTOR_TOP_K` | `5` | Chunks retrieved per query variant |
| `AI_TUTOR_MIN_SIMILARITY` | `0.58` | Minimum similarity for grounded response |
| `THROTTLE_AI_TUTOR_CHAT` | `30/min` | Rate limit for chat endpoint |

---

## Frontend Integration

- `frontend/lib/api.ts` `aiAPI.chat(...)` maps the REST response.
- Backward-compatible fields: `response` (alias of `answer`), `tokens_used` (derived from `usage`).
- Student tutor UI (`frontend/app/student/ai-tutor/page.tsx`) renders source snippets, confidence, and token usage.

---

## Tests

| File | What it covers |
|------|---------------|
| `backend/ai_engine/tests_tutor_api.py` | REST endpoint: 200, fields, sources, budget |
| `backend/ai_engine/tests_phase2.py` | Conversation persistence, RRF merging, history loading |
| `backend/ai_engine/tests_phase4.py` | Confidence scoring, Socratic mode, citation metadata |
| `backend/ai_engine/tests_phase5.py` | Budget pre-flight, deduction, `my_usage`, reset logic |
| `backend/ai_engine/tests_ws_consumers.py` | WebSocket: auth, streaming, budget_exceeded, done frame |
