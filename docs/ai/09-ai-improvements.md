# AI Engine — Improvement Phases (1–6)

> Implemented on top of the base RAG tutor and analytics engine.
> All phases are committed to `main` and covered by automated tests.

---

## Phase 1 — SM-2 Spaced Repetition

**Goal:** Surface learning-path nodes to students at the scientifically optimal review interval.

### Algorithm
SM-2 (SuperMemo 2) calculates the next review date based on response quality (0–5):
- `quality ≥ 3` → correct recall, interval grows.
- `quality < 3` → incorrect, interval resets to 1 day.
- Ease factor (EF) adjusts interval multiplier; floor is 1.3.

### What was added
| Component | Detail |
|-----------|--------|
| `ai_engine/services/sm2_service.py` | Pure `SM2Result` dataclass + `calculate()` + `initial_schedule()` |
| `LearningNode` fields | `ease_factor`, `interval_days`, `repetitions`, `next_review_at`, `last_quality` |
| `LearningNodeViewSet.complete` | Accepts `quality` (0–5), applies SM-2, saves result |
| `LearningNodeViewSet` — `due` action | `GET /api/ai/learning-nodes/due/` returns nodes due today |
| Migration | `0008_add_sm2_fields_to_learning_node.py` |
| Tests | `tests_sm2.py` — 12 tests |

### API
```
POST /api/ai/learning-nodes/<id>/complete/
{ "quality": 4 }

GET  /api/ai/learning-nodes/due/
```

---

## Phase 2 — Persistent Conversation Memory + Multi-Query RRF

**Goal:** Give the tutor memory across messages; improve RAG retrieval quality.

### Conversation persistence
- Every chat turn creates/updates a `TutorConversation` with `TutorMessage` rows.
- Last 6 messages of history are included in each LLM prompt.
- Client passes `conversation_id` to continue a thread.

### Multi-Query Reciprocal Rank Fusion (RRF)
- LLM expands the user message into 3 diverse query variants (`_expand_query()`).
- Each variant retrieves top-k chunks independently.
- `_merge_and_rerank()` fuses all lists using RRF (`k=60`):
  `score = Σ 1/(k + rank_i)` per chunk.
- Deduplication: if a chunk appears in multiple result lists its score is boosted.

### What was added
| Component | Detail |
|-----------|--------|
| `TutorConversation`, `TutorMessage` models | Persistent chat history |
| `rag_tutor_service._expand_query()` | LLM generates 3 variants |
| `rag_tutor_service._merge_and_rerank()` | RRF fusion |
| `TutorConversationViewSet` | `GET /api/ai/conversations/` + `messages` action |
| Migration | `0009_add_tutor_conversation_message.py` |
| Tests | `tests_phase2.py` — 8 tests |

---

## Phase 3 — Bayesian Knowledge Tracing (BKT)

**Goal:** Continuously estimate per-skill mastery probability; drive adaptive learning paths.

### BKT Model
Four parameters per skill:
- `p_mastery` — prior probability student knows the skill.
- `p_transit` — probability of learning after one practice (default 0.1).
- `p_slip` — probability of wrong answer despite mastery (default 0.1).
- `p_guess` — probability of correct answer without mastery (default 0.2).

Update rule (Bayesian posterior):
```
P(correct | mastered)   = 1 - p_slip
P(correct | unmastered) = p_guess
posterior = P(mastered|correct) = prior_mastery * P(correct|m) / P(correct)
new_mastery = posterior + (1-posterior) * p_transit
```

### What was added
| Component | Detail |
|-----------|--------|
| `SkillTag`, `SkillMastery`, `SkillPracticeEvent` models | Skill taxonomy + per-student tracking |
| `bkt_service.py` | `update()`, `observe()`, `get_skill_gaps()`, `is_mastered()` (threshold 0.95) |
| `LearningPathService.generate_path()` | Strategy 1: BKT gaps (p<0.6) → Strategy 2: weak assessments → Strategy 3: curriculum |
| `SkillTagViewSet`, `SkillMasteryViewSet` | `gaps` and `update_mastery` actions |
| Migration | `0010_add_bkt_skill_models.py` |
| Tests | `tests_phase3.py` — 12 tests |

### API
```
GET  /api/ai/skill-mastery/gaps/          # skills with p_mastery < 0.6
POST /api/ai/skill-mastery/update_mastery/
{ "skill_tag_id": "<uuid>", "correct": true }
```

---

## Phase 4 — AI Tutor Enhancements

**Goal:** Add confidence scoring, richer citations, and Socratic teaching mode.

### Confidence scoring
- Mean cosine similarity of retrieved chunks → 0–1 score.
- Labels: `high` (≥ 0.85), `moderate` (≥ 0.70), `low` (< 0.70).
- Persisted on `TutorMessage.confidence` + `confidence_label`.

### Richer citations
`_build_citations()` returns:
```json
{
  "source_type": "lesson",
  "source_id": "42",
  "text_span": "Newton's first law states...",
  "similarity": 0.91,
  "metadata": {}
}
```

### Socratic mode
When `mode="socratic"`, a different system prompt guides the LLM to ask probing questions instead of giving direct answers — fostering deeper understanding.

### What was added
| Component | Detail |
|-----------|--------|
| `TutorMessage` fields | `confidence`, `confidence_label`, `mode` |
| `_compute_confidence()`, `_confidence_label()` | Scoring helpers |
| `_build_citations()` | Full citation metadata |
| `_build_grounded_messages()` | Socratic system prompt branch |
| Migration | `0011_add_confidence_mode_to_tutor_message.py` |
| Tests | `tests_phase4.py` — 22 tests |

---

## Phase 5 — Token Budget / Cost Controls

**Goal:** Enforce per-tenant and per-student daily token limits to control LLM spend.

### Model: `AITokenBudget`
| Field | Description |
|-------|-------------|
| `tenant` | FK to Tenant (required) |
| `student` | FK to Student (nullable — student-level override) |
| `daily_limit_tokens` | Max tokens per calendar day |
| `used_today` | Running total, reset daily |
| `reset_at` | UTC datetime of last reset (auto-inline reset) |
| `is_active` | Disable budget check entirely |

Priority: student-level budget > tenant-level budget > no limit.

### Flow
1. **Pre-flight `check()`** — raises `TokenBudgetExceeded` before any LLM call.
2. **Post-call `deduct()`** — uses `select_for_update` to prevent race conditions; auto-resets if `reset_at < now`.

### What was added
| Component | Detail |
|-----------|--------|
| `AITokenBudget` model | Budget storage with inline reset |
| `TokenBudgetService` | `check()`, `deduct()`, `get_status()`, `create_budget()` |
| `AITokenBudgetViewSet` | `my_usage` action at `/api/ai/token-budgets/my_usage/` |
| Chat views + WS consumer | Budget pre-flight + deduction wired in |
| Migration | `0012_add_ai_token_budget.py` |
| Tests | `tests_phase5.py` — 17 tests |

### API
```
GET  /api/ai/token-budgets/my_usage/      # current student or tenant usage
POST /api/ai/token-budgets/               # create/set budget (admin)
```

---

## Phase 6 — WebSocket Real-Time Support

**Goal:** Replace polling with live push for tutor streaming and notifications.

### Infrastructure
- **Django Channels 4.2** (`channels`, `channels-redis`, `daphne`) added to `requirements.txt`.
- **ASGI app** (`config/asgi.py`) uses `ProtocolTypeRouter`:
  - `http` → Django ASGI app.
  - `websocket` → `AllowedHostsOriginValidator → JWTAuthMiddleware → URLRouter`.
- **Channel layer** uses `channels_redis.core.RedisChannelLayer` (same Redis as Celery).
- **JWT middleware** (`core/ws_middleware.py`) reads `?token=<jwt>` from query string, validates via simplejwt, injects `scope["user"]`.

### TutorStreamConsumer (`ws/tutor/chat/`)
- Budget pre-flight on every `chat` message.
- Runs `RAGTutorService.stream_answer()` (OpenAI `stream=True`) in thread pool via `sync_to_async`.
- Sends each token chunk immediately: `{"type":"token","content":"..."}`.
- On completion sends a single `done` frame with full metadata.
- Persists conversation and messages to DB identical to REST flow.

### NotificationConsumer (`ws/notifications/`)
- Each authenticated user joins group `notifications_<user_pk>`.
- Signal `push_notification_on_create` fires on `Notification.post_save` → `channel_layer.group_send`.
- Consumer forwards payload as `{"type":"notification", ...}` to all open tabs for that user.
- Supports `mark_read` message from client.

### WebSocket URL routing (`config/ws_routing.py`)
```
ws/tutor/chat/     → TutorStreamConsumer
ws/notifications/  → NotificationConsumer
```

### What was added
| File | Role |
|------|------|
| `config/asgi.py` | ProtocolTypeRouter wiring |
| `config/ws_routing.py` | WS URL patterns |
| `core/ws_middleware.py` | JWT WS authentication |
| `ai_engine/consumers.py` | `TutorStreamConsumer` |
| `ai_engine/services/rag_tutor_service.py` | `stream_answer()`, `_stream_general()` |
| `notifications/consumers.py` | `NotificationConsumer` |
| `notifications/signals.py` | `_push_notification_ws()` signal receiver |
| Tests | `tests_ws_consumers.py` — 16 tests (InMemoryChannelLayer, no Redis needed) |

### Running with WebSocket support
```bash
# Development (Daphne ASGI server)
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# Or via manage.py runserver (Channels auto-detects ASGI)
python manage.py runserver
```

For production, deploy behind a reverse proxy (Nginx) with WebSocket upgrade headers forwarded.

---

## Test Summary

| Phase | Test file | Tests |
|-------|-----------|-------|
| 1 — SM-2 | `tests_sm2.py` | 12 |
| 2 — RAG/Conversation | `tests_phase2.py` | 8 |
| 3 — BKT | `tests_phase3.py` | 12 |
| 4 — Tutor enhancements | `tests_phase4.py` | 22 |
| 5 — Budget | `tests_phase5.py` | 17 |
| 6 — WebSocket | `tests_ws_consumers.py` | 16 |
| **Total** | | **87** |

---

## New API Endpoints Summary

| Endpoint | Phase | Description |
|----------|-------|-------------|
| `POST /api/ai/learning-nodes/<id>/complete/` | 1 | Complete node with SM-2 quality rating |
| `GET /api/ai/learning-nodes/due/` | 1 | Nodes due for review today |
| `GET /api/ai/conversations/` | 2 | List tutor conversations |
| `GET /api/ai/conversations/<id>/messages/` | 2 | Messages in a conversation |
| `GET /api/ai/skill-tags/` | 3 | Skill taxonomy list |
| `GET /api/ai/skill-mastery/` | 3 | Per-student mastery levels |
| `GET /api/ai/skill-mastery/gaps/` | 3 | Skills with p_mastery < 0.6 |
| `POST /api/ai/skill-mastery/update_mastery/` | 3 | Record a practice event |
| `GET /api/ai/token-budgets/my_usage/` | 5 | Current token usage |
| `POST /api/ai/token-budgets/` | 5 | Create/update budget |
| `ws/tutor/chat/?token=<jwt>` | 6 | Streaming tutor (WebSocket) |
| `ws/notifications/?token=<jwt>` | 6 | Live notifications (WebSocket) |
