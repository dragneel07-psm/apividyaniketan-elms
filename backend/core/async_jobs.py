# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import logging
from typing import Any, Callable
from uuid import uuid4

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.utils.dateparse import parse_datetime

logger = logging.getLogger(__name__)

try:
    from celery import shared_task as celery_shared_task  # type: ignore
    from celery.result import AsyncResult  # type: ignore

    CELERY_AVAILABLE = True
except Exception:
    celery_shared_task = None
    AsyncResult = None
    CELERY_AVAILABLE = False


def _async_backend() -> str:
    return (
        str(getattr(settings, "ASYNC_TASK_BACKEND", "sync") or "sync").strip().lower()
    )


def _job_status_ttl() -> int:
    return int(
        getattr(settings, "ASYNC_JOB_STATUS_TTL_SECONDS", 60 * 60 * 24) or 60 * 60 * 24
    )


def _job_cache_key(job_id: str) -> str:
    return f"async_job:v1:{job_id}"


def _state_to_status(state: str) -> str:
    normalized = str(state or "").strip().upper()
    if normalized in {"SUCCESS"}:
        return "success"
    if normalized in {"FAILURE"}:
        return "failure"
    if normalized in {"STARTED"}:
        return "running"
    if normalized in {"RETRY"}:
        return "retrying"
    if normalized in {"REVOKED"}:
        return "cancelled"
    return "queued"


def _serialize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool, list, dict)):
        return value
    return str(value)


def _job_model():
    try:
        from core.models import Job

        return Job
    except Exception:
        return None


def _job_payload_from_db(job_id: str) -> dict[str, Any] | None:
    job_model = _job_model()
    if job_model is None:
        return None

    try:
        job = job_model.objects.filter(job_id=job_id).first()
    except Exception:
        return None

    if job is None:
        return None

    payload = {
        "job_id": job.job_id,
        "backend": job.backend,
        "task_name": job.task_name,
        "tenant_schema": job.tenant_schema,
        "submitted_at": job.submitted_at.isoformat() if job.submitted_at else None,
        "state": job.state,
        "status": job.status,
        "ready": job.status in {"success", "failure", "cancelled"},
        "result": job.result,
        "error": job.error or None,
    }
    return payload


def _persist_job_payload(job_id: str, payload: dict[str, Any]) -> None:
    job_model = _job_model()
    if job_model is None:
        return

    submitted_at_raw = payload.get("submitted_at")
    submitted_at = None
    if submitted_at_raw:
        submitted_at = parse_datetime(str(submitted_at_raw))
    if submitted_at is None:
        submitted_at = timezone.now()

    now = timezone.now()
    status = (
        str(
            payload.get("status")
            or _state_to_status(str(payload.get("state") or "PENDING"))
        )
        .strip()
        .lower()
    )
    state = str(payload.get("state") or "PENDING").strip().upper()
    ready = bool(payload.get("ready", False))

    try:
        job, created = job_model.objects.get_or_create(
            job_id=job_id,
            defaults={
                "task_name": str(payload.get("task_name") or "task"),
                "tenant_schema": str(payload.get("tenant_schema") or "public")
                .strip()
                .lower(),
                "backend": str(payload.get("backend") or "sync").strip().lower(),
                "status": status,
                "state": state,
                "submitted_at": submitted_at,
                "result": payload.get("result"),
                "error": str(payload.get("error") or ""),
                "meta": (
                    payload.get("meta") if isinstance(payload.get("meta"), dict) else {}
                ),
            },
        )
    except Exception:
        return

    if created:
        if status in {"running", "retrying"}:
            job.started_at = now
        if ready:
            job.completed_at = now
        try:
            job.save(update_fields=["started_at", "completed_at", "updated_at"])
        except Exception:
            pass
        return

    updated_fields: list[str] = []

    def _set(field: str, value: Any) -> None:
        if getattr(job, field) != value:
            setattr(job, field, value)
            updated_fields.append(field)

    _set("task_name", str(payload.get("task_name") or job.task_name))
    _set(
        "tenant_schema",
        str(payload.get("tenant_schema") or job.tenant_schema or "public")
        .strip()
        .lower(),
    )
    _set(
        "backend", str(payload.get("backend") or job.backend or "sync").strip().lower()
    )
    _set("status", status)
    _set("state", state)
    _set("submitted_at", submitted_at)
    _set("result", payload.get("result"))
    _set("error", str(payload.get("error") or ""))

    if isinstance(payload.get("meta"), dict):
        _set("meta", payload.get("meta"))

    if status in {"running", "retrying"} and job.started_at is None:
        job.started_at = now
        updated_fields.append("started_at")

    if ready and job.completed_at is None:
        job.completed_at = now
        updated_fields.append("completed_at")

    if updated_fields:
        updated_fields.append("updated_at")
        try:
            job.save(update_fields=updated_fields)
        except Exception:
            pass


def background_task(*task_args, **task_kwargs):
    """
    Registers a task for optional Celery execution.
    Falls back to direct function calls when Celery is unavailable.
    """

    def decorator(func: Callable[..., Any]):
        if CELERY_AVAILABLE and celery_shared_task is not None:
            task_obj = celery_shared_task(*task_args, **task_kwargs)(func)
        else:
            task_obj = func

            def _sync_delay(*args, **kwargs):
                return func(*args, **kwargs)

            setattr(task_obj, "delay", _sync_delay)

        setattr(task_obj, "__sync_callable__", func)
        return task_obj

    return decorator


def enqueue(task: Callable[..., Any], *args, **kwargs):
    """
    Execute a task asynchronously when configured and available;
    otherwise execute synchronously.
    """
    backend = _async_backend()
    if backend == "celery" and CELERY_AVAILABLE and hasattr(task, "delay"):
        return task.delay(*args, **kwargs)

    if backend == "celery" and not CELERY_AVAILABLE:
        logger.warning(
            "Celery backend requested but Celery is unavailable; executing task synchronously."
        )

    sync_callable = getattr(task, "__sync_callable__", None)
    if callable(sync_callable):
        return sync_callable(*args, **kwargs)
    return task(*args, **kwargs)


def enqueue_job(
    task: Callable[..., Any],
    *args,
    job_name: str | None = None,
    job_tenant_schema: str | None = None,
    **kwargs,
) -> dict[str, Any]:
    """
    Enqueue a job and return a stable job envelope for API responses.
    """
    submitted_at = timezone.now().isoformat()
    task_name = job_name or getattr(task, "name", getattr(task, "__name__", "task"))
    tenant_schema = str(job_tenant_schema or "public").strip().lower()
    backend = _async_backend()

    cache_payload_base = {
        "task_name": task_name,
        "tenant_schema": tenant_schema,
        "submitted_at": submitted_at,
    }

    if backend == "celery" and CELERY_AVAILABLE and hasattr(task, "delay"):
        async_result = task.delay(*args, **kwargs)
        job_id = str(getattr(async_result, "id", "") or uuid4())
        state = str(getattr(async_result, "state", "PENDING") or "PENDING")
        ready = bool(getattr(async_result, "ready", lambda: False)())

        payload = {
            "job_id": job_id,
            "backend": "celery",
            "state": state,
            "status": _state_to_status(state),
            "ready": ready,
            **cache_payload_base,
        }
        if ready:
            if bool(getattr(async_result, "successful", lambda: False)()):
                payload["result"] = _serialize_value(
                    getattr(async_result, "result", None)
                )
            elif bool(getattr(async_result, "failed", lambda: False)()):
                payload["error"] = str(getattr(async_result, "result", "Job failed"))

        cache.set(_job_cache_key(job_id), payload, timeout=_job_status_ttl())
        _persist_job_payload(job_id, payload)
        return {
            "job_id": job_id,
            "status": payload["status"],
            "state": payload["state"],
            "backend": payload["backend"],
            "task_name": task_name,
        }

    if backend == "celery" and not CELERY_AVAILABLE:
        logger.warning(
            "Celery backend requested but Celery is unavailable; executing task synchronously."
        )

    job_id = str(uuid4())
    try:
        sync_callable = getattr(task, "__sync_callable__", None)
        result = (
            sync_callable(*args, **kwargs)
            if callable(sync_callable)
            else task(*args, **kwargs)
        )
        payload = {
            "job_id": job_id,
            "backend": "sync",
            "state": "SUCCESS",
            "status": "success",
            "ready": True,
            "result": _serialize_value(result),
            **cache_payload_base,
        }
    except Exception as exc:
        payload = {
            "job_id": job_id,
            "backend": "sync",
            "state": "FAILURE",
            "status": "failure",
            "ready": True,
            "error": str(exc),
            **cache_payload_base,
        }
    cache.set(_job_cache_key(job_id), payload, timeout=_job_status_ttl())
    _persist_job_payload(job_id, payload)
    return {
        "job_id": job_id,
        "status": payload["status"],
        "state": payload["state"],
        "backend": payload["backend"],
        "task_name": task_name,
    }


def get_job_status(job_id: str) -> dict[str, Any] | None:
    if not job_id:
        return None

    cache_key = _job_cache_key(job_id)
    cached = cache.get(cache_key) or {}
    db_payload = _job_payload_from_db(job_id) or {}
    backend = str(
        cached.get("backend") or db_payload.get("backend") or _async_backend()
    )

    if backend == "celery" and CELERY_AVAILABLE and AsyncResult is not None:
        async_result = AsyncResult(job_id)
        state = str(getattr(async_result, "state", "PENDING") or "PENDING")
        # Celery returns PENDING for unknown IDs. Treat uncached PENDING as not found.
        if state == "PENDING" and not cached and not db_payload:
            return None

        payload = {
            "job_id": job_id,
            "backend": "celery",
            "task_name": cached.get("task_name") or db_payload.get("task_name"),
            "tenant_schema": cached.get("tenant_schema")
            or db_payload.get("tenant_schema"),
            "submitted_at": cached.get("submitted_at")
            or db_payload.get("submitted_at"),
            "state": state,
            "status": _state_to_status(state),
            "ready": bool(getattr(async_result, "ready", lambda: False)()),
        }

        if bool(getattr(async_result, "ready", lambda: False)()):
            if bool(getattr(async_result, "successful", lambda: False)()):
                payload["result"] = _serialize_value(
                    getattr(async_result, "result", None)
                )
            elif bool(getattr(async_result, "failed", lambda: False)()):
                payload["error"] = str(getattr(async_result, "result", "Job failed"))
            elif cached.get("result") is not None:
                payload["result"] = cached.get("result")
            elif db_payload.get("result") is not None:
                payload["result"] = db_payload.get("result")
            elif cached.get("error"):
                payload["error"] = cached.get("error")
            elif db_payload.get("error"):
                payload["error"] = db_payload.get("error")

        cache.set(cache_key, payload, timeout=_job_status_ttl())
        _persist_job_payload(job_id, payload)
        return payload

    if cached:
        payload = {
            "job_id": job_id,
            "backend": cached.get("backend", "sync"),
            "task_name": cached.get("task_name"),
            "tenant_schema": cached.get("tenant_schema"),
            "submitted_at": cached.get("submitted_at"),
            "state": cached.get("state", "PENDING"),
            "status": cached.get(
                "status", _state_to_status(cached.get("state", "PENDING"))
            ),
            "ready": bool(cached.get("ready", False)),
            "result": cached.get("result"),
            "error": cached.get("error"),
        }
        _persist_job_payload(job_id, payload)
        return payload

    if db_payload:
        cache.set(cache_key, db_payload, timeout=_job_status_ttl())
        return db_payload
    return None
