# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import json
from typing import Any

from django.contrib.auth import get_user_model
from django.core.serializers.json import DjangoJSONEncoder

from core.models import AuditLog


def _client_ip(request) -> str | None:
    if request is None:
        return None
    xff = (request.META.get("HTTP_X_FORWARDED_FOR", "") or "").split(",")[0].strip()
    if xff:
        return xff
    remote_addr = (request.META.get("REMOTE_ADDR", "") or "").strip()
    return remote_addr or None


def _json_safe(payload: dict[str, Any]) -> dict[str, Any]:
    if not payload:
        return {}
    return json.loads(json.dumps(payload, cls=DjangoJSONEncoder))


def record_audit_event(
    *, action: str, user=None, request=None, details: dict[str, Any] | None = None
) -> AuditLog | None:
    """
    Best-effort structured audit writer for sensitive domain actions.
    Never raises, so business flow is not blocked by logging failures.
    """
    if not action:
        return None

    try:
        payload: dict[str, Any] = dict(details or {})
        actor = user if getattr(user, "is_authenticated", False) else None
        tenant = getattr(actor, "tenant", None) or getattr(request, "tenant", None)

        if request is not None:
            payload.setdefault("path", request.path)
            payload.setdefault("method", request.method)
            trace_id = getattr(request, "request_id", None)
            if trace_id:
                payload.setdefault("trace_id", trace_id)

        if actor is not None:
            payload.setdefault("actor_user_id", str(getattr(actor, "pk", "")))
            payload.setdefault("actor_role", getattr(actor, "role", None))
            payload.setdefault("actor_email", getattr(actor, "email", None))

        if tenant is not None:
            payload.setdefault("tenant_id", str(getattr(tenant, "id", "")))
            payload.setdefault("tenant_schema", getattr(tenant, "schema_name", None))

        actor_for_fk = None
        if actor is not None and getattr(actor, "tenant", None) is None:
            # For public-schema actions, keep an FK only when the actor row exists
            # in the current schema to avoid deferred FK failures across schemas.
            user_model = get_user_model()
            if user_model.objects.filter(pk=getattr(actor, "pk", None)).exists():
                actor_for_fk = actor

        return AuditLog.objects.create(
            action=action,
            user=actor_for_fk,
            ip_address=_client_ip(request),
            details=_json_safe(payload),
        )
    except Exception:
        return None
