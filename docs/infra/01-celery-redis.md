# Celery + Redis Background Jobs

## Overview
This project now supports asynchronous background processing with Celery + Redis for AI and notifications.

- Broker/Result backend: Redis
- Worker runtime: Celery worker (`config.celery:app`)
- API pattern: enqueue -> return `job_id` -> poll status

## Docker Compose Services
`docker-compose.yml` includes:

- `redis` (`redis:7-alpine`)
- `backend` (Django API, Celery env configured)
- `worker` (Celery worker process)

## Backend Configuration
Configured in `backend/config/settings/base.py`:

- `ASYNC_TASK_BACKEND` (`sync` or `celery`)
- `REDIS_URL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `CELERY_TASK_ALWAYS_EAGER`
- `CELERY_TASK_EAGER_PROPAGATES`
- `CELERY_TASK_STORE_EAGER_RESULT`
- `ASYNC_JOB_STATUS_TTL_SECONDS`

Celery bootstrap:

- `backend/config/celery.py`

## Tenant-aware Execution
All new async tasks receive `tenant_schema` and execute inside that schema via `django_tenants.utils.schema_context`.

Implemented tenant-aware tasks:

- `ai.index_content` (`ai_engine.tasks.ai_index_content_task`)
- `ai.generate_summary` (`ai_engine.tasks.generate_summary_task`)
- `ai.generate_quiz` (`ai_engine.tasks.generate_quiz_task`)
- `notifications.send_notification` (`notifications.tasks.send_notification_task`)

## API Endpoints

### Enqueue Jobs
- `POST /api/ai/jobs/index-content/`
- `POST /api/ai/jobs/summaries/`
- `POST /api/ai/jobs/quizzes/`
- `POST /api/notifications/dispatch/`

Each returns `202 Accepted` with:

```json
{
  "job_id": "f5d8c2c4-...",
  "status": "queued",
  "state": "PENDING",
  "backend": "celery",
  "task_name": "ai.generate_summary"
}
```

### Poll Job Status
- `GET /api/core/jobs/{job_id}/`

Response includes:

- `job_id`
- `status` (`queued|running|success|failure|...`)
- `state` (raw backend state)
- `result` (if completed successfully)
- `error` (if failed)

Tenant isolation is enforced in the status API (non-SaaS users can only view jobs for their own tenant schema).

## Testing
Tests added/updated:

- `backend/core/tests_async_jobs.py`
  - verifies eager-mode execution path
  - verifies job status endpoint returns queued/completed payload
- `backend/ai_engine/tests_async_queue.py`
  - verifies AI summary enqueue endpoint returns `job_id` and can be polled via job-status API

Run:

```bash
cd backend
.venv/bin/python manage.py test core.tests_async_jobs notifications.tests_async_delivery ai_engine.tests_async_queue
```

## Notes
- In environments where Celery package is unavailable, the queue helper falls back to synchronous execution and still returns a `job_id`.
- For production, use `ASYNC_TASK_BACKEND=celery` with running `redis` + `worker` services.

## Redis — Additional Usage: Channel Layer (WebSocket)

Redis is also used as the **Django Channels channel layer** for WebSocket real-time push.
The same `REDIS_URL` is shared between Celery and Channels.

See `docs/infra/03-websocket-channels.md` for full WebSocket documentation.
