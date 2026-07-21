# Celery + Redis Async Jobs

## What is implemented

- Redis is configured as Celery broker/result backend.
- Celery app bootstrap is in `backend/config/celery.py`.
- `docker-compose.yml` includes:
  - `redis`
  - `backend`
  - `worker` (`celery -A config.celery:app worker`)
- AI-heavy queue endpoints return `job_id` (`202 Accepted`) and can be polled.
- Job status is now persisted in DB via `core.Job` (not only cache), so status survives cache misses/restarts.

## Job model

`backend/core/models/job.py`

Key fields:

- `job_id` (Celery task id / generated id)
- `task_name`
- `tenant_schema`
- `backend` (`celery` or `sync`)
- `status`, `state`
- `submitted_at`, `started_at`, `completed_at`
- `result`, `error`, `meta`

Migration:

- `backend/core/migrations/0008_job.py`

## API flow

### Enqueue

AI queue endpoints:

- `POST /api/ai/jobs/index-content/`
- `POST /api/ai/jobs/summaries/`
- `POST /api/ai/jobs/quizzes/`

Response:

```json
{
  "job_id": "...",
  "status": "queued",
  "state": "PENDING",
  "backend": "celery",
  "task_name": "ai.generate_summary"
}
```

### Poll

- `GET /api/core/jobs/{job_id}/`

Response includes:

- `job_id`
- `status`
- `state`
- `ready`
- `result` (if success)
- `error` (if failure)

Tenant guard is enforced for job polling (non-SaaS users cannot poll other-tenant jobs).

## Tenant-aware tasks

Tasks pass and use `tenant_schema`:

- `ai.index_content`
- `ai.generate_summary`
- `ai.generate_quiz`
- `notifications.send_notification`

These execute in the correct tenant context.

## Local run

```bash
docker compose up --build
```

## Tests

Run async queue tests (eager/sync paths):

```bash
cd backend
.venv/bin/python manage.py test core.tests_async_jobs ai_engine.tests_async_queue notifications.tests_async_delivery
```
