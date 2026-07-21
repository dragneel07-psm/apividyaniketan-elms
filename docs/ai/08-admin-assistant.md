# Admin AI Assistant (ERP Facts)

## Goal

Provide school administrators with natural-language answers to ERP questions using safe, tenant-isolated database facts.

## Endpoint

### `POST /api/ai/admin_assistant/query/`

Request:

```json
{
  "question": "How is attendance this month?"
}
```

Response:

```json
{
  "answer": "Attendance rate for the last 30 days is 91.2% ...",
  "data": {
    "window_days": 30,
    "attendance_rate_pct": 91.2
  },
  "query_type": "attendance"
}
```

## Role Access

Allowed roles:

- `admin` (School Admin)
- `staff` (Accountant/Operations)
- `school_admin` / `accountant` / `principal` (accepted aliases)

Other roles (teacher/student/parent) are rejected with `403`.

## Safety Design

The assistant uses a strict tool-router architecture:

1. Classify intent (`attendance|fees|students|performance|overview`) using rules (and optional LLM classifier).
2. Execute only safe internal ORM tools.
3. Optionally ask LLM to convert facts into natural language.

Important constraints:

- LLM never executes SQL.
- Unsupported classifier outputs are force-normalized to `overview`.
- Response always includes a `data` object with raw counts/totals used for the answer.

## Tenant Isolation

All tools enforce tenant-scoped filters:

- Academic data via `student__user__tenant=<current tenant>`
- Billing data via `tenant=<current tenant>`

Endpoint also requires resolved tenant context and rejects public-schema usage.

## Query Types

- `students`: enrollment and class distribution
- `attendance`: present/absent trends and low-attendance students
- `fees`: dues, collections, outstanding, and recent cash/expense snapshots
- `performance`: pass rate, average score, low performers
- `overview`: combined school snapshot

## Configuration

Optional backend settings/env knobs:

- `AI_ADMIN_ASSISTANT_LOOKBACK_DAYS` (default `30`)
- `AI_ADMIN_ASSISTANT_USE_LLM_CLASSIFIER` (default `false`)
- `AI_ADMIN_ASSISTANT_USE_LLM_RESPONSE` (default `false`)

## Tests

Added:

- `backend/ai_engine/tests_admin_assistant_api.py`

Coverage:

- role guard enforcement
- structured response shape
- malicious classifier output cannot force arbitrary tool/sql path
- tenant isolation for student/fee aggregates
