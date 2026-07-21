# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import hashlib
import json

from django.core.serializers.json import DjangoJSONEncoder

MAX_IDEMPOTENCY_KEY_LENGTH = 255


def request_idempotency_key(request) -> str:
    key = (
        request.headers.get("Idempotency-Key")
        or request.headers.get("X-Idempotency-Key")
        or request.META.get("HTTP_IDEMPOTENCY_KEY")
        or request.META.get("HTTP_X_IDEMPOTENCY_KEY")
        or ""
    )
    return str(key).strip()


def is_valid_idempotency_key(key: str) -> bool:
    return bool(key) and len(key) <= MAX_IDEMPOTENCY_KEY_LENGTH


def json_safe(payload):
    return json.loads(json.dumps(payload, cls=DjangoJSONEncoder))


def payload_fingerprint(payload) -> str:
    canonical = json.dumps(
        payload, sort_keys=True, separators=(",", ":"), cls=DjangoJSONEncoder
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
