# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import logging
from contextvars import ContextVar
from dataclasses import dataclass

_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
_tenant_schema_ctx: ContextVar[str] = ContextVar("tenant_schema", default="-")
_tenant_id_ctx: ContextVar[str] = ContextVar("tenant_id", default="-")


@dataclass(frozen=True)
class RequestLogContext:
    request_id: str = "-"
    tenant_schema: str = "-"
    tenant_id: str = "-"


def set_request_context(
    *,
    request_id: str | None = None,
    tenant_schema: str | None = None,
    tenant_id: str | None = None,
) -> None:
    if request_id is not None:
        _request_id_ctx.set(str(request_id or "-"))
    if tenant_schema is not None:
        _tenant_schema_ctx.set(str(tenant_schema or "-"))
    if tenant_id is not None:
        _tenant_id_ctx.set(str(tenant_id or "-"))


def reset_request_context() -> None:
    _request_id_ctx.set("-")
    _tenant_schema_ctx.set("-")
    _tenant_id_ctx.set("-")


def get_request_context() -> RequestLogContext:
    return RequestLogContext(
        request_id=_request_id_ctx.get(),
        tenant_schema=_tenant_schema_ctx.get(),
        tenant_id=_tenant_id_ctx.get(),
    )


class RequestContextLogFilter(logging.Filter):
    """
    Enriches every log line with request correlation and tenant context.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        context = get_request_context()
        record.request_id = context.request_id
        record.tenant_schema = context.tenant_schema
        record.tenant_id = context.tenant_id
        return True


import json
import traceback


class JsonFormatter(logging.Formatter):
    """
    Outputs one JSON object per log record — compatible with Railway,
    Datadog, Loki, and ELK log aggregators.
    """

    # Fields that are standard LogRecord attributes (not "extra" fields)
    _RESERVED = frozenset(
        {
            "name",
            "msg",
            "args",
            "levelname",
            "levelno",
            "pathname",
            "filename",
            "module",
            "exc_info",
            "exc_text",
            "stack_info",
            "lineno",
            "funcName",
            "created",
            "msecs",
            "relativeCreated",
            "thread",
            "threadName",
            "processName",
            "process",
            "message",
            "asctime",
            # Context fields injected by RequestContextLogFilter
            "request_id",
            "tenant_schema",
            "tenant_id",
        }
    )

    def format(self, record: logging.LogRecord) -> str:
        record.message = record.getMessage()
        payload: dict = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S.%f+00:00"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.message,
            "request_id": getattr(record, "request_id", "-"),
            "tenant_schema": getattr(record, "tenant_schema", "-"),
            "tenant_id": getattr(record, "tenant_id", "-"),
        }
        # Attach exception info if present
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        elif record.exc_text:
            payload["exc_info"] = record.exc_text
        # Attach any extra fields passed by the caller
        for key, value in record.__dict__.items():
            if key not in self._RESERVED:
                payload[key] = value
        return json.dumps(payload, default=str)
