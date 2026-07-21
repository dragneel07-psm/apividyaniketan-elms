# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .idempotency import is_valid_idempotency_key
from .idempotency import json_safe as idempotency_json_safe
from .idempotency import payload_fingerprint, request_idempotency_key
from .models import BillingIdempotencyKey


class BillingSchemaGuardMixin:
    require_public_schema = False
    require_tenant_schema = False

    def _schema_name(self, request):
        tenant = getattr(request, "tenant", None)
        return getattr(tenant, "schema_name", "public") if tenant else "public"

    def _request_tenant(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant and getattr(tenant, "schema_name", "public") != "public":
            return tenant
        return None

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        schema_name = self._schema_name(request)
        user_tenant = getattr(request.user, "tenant", None)
        request_tenant = self._request_tenant(request)

        if self.require_public_schema and schema_name != "public":
            raise PermissionDenied(
                "This endpoint is available only on the public schema."
            )

        if self.require_tenant_schema:
            if schema_name == "public":
                raise PermissionDenied("This endpoint requires a school tenant schema.")
            if not user_tenant:
                raise PermissionDenied(
                    "Authenticated user is not associated with a tenant."
                )
            if request_tenant and user_tenant != request_tenant:
                raise PermissionDenied("Cross-tenant access denied.")


class BillingIdempotencyMixin:
    def _idempotency_error(self, request, *, code: str, message: str, http_status: int):
        return Response(
            {
                "code": code,
                "message": message,
                "field_errors": {},
                "trace_id": getattr(request, "request_id", None),
            },
            status=http_status,
        )

    def _load_or_create_idempotency_record(
        self, request, *, endpoint: str, idempotency_key: str, fingerprint: str
    ):
        tenant = getattr(request.user, "tenant", None)
        try:
            with transaction.atomic():
                try:
                    record = BillingIdempotencyKey.objects.select_for_update().get(
                        user=request.user,
                        endpoint=endpoint,
                        idempotency_key=idempotency_key,
                    )
                    return record, False
                except BillingIdempotencyKey.DoesNotExist:
                    record = BillingIdempotencyKey.objects.create(
                        tenant=tenant,
                        user=request.user,
                        endpoint=endpoint,
                        idempotency_key=idempotency_key,
                        request_fingerprint=fingerprint,
                    )
                    return record, True
        except IntegrityError:
            with transaction.atomic():
                record = BillingIdempotencyKey.objects.select_for_update().get(
                    user=request.user,
                    endpoint=endpoint,
                    idempotency_key=idempotency_key,
                )
                return record, False

    def _idempotent_execute(
        self,
        request,
        *,
        endpoint: str,
        resource_type: str,
        resource_id_field: str,
        execute,
    ):
        idempotency_key = request_idempotency_key(request)
        if not idempotency_key:
            return execute()

        if not is_valid_idempotency_key(idempotency_key):
            return self._idempotency_error(
                request,
                code="idempotency_key_invalid",
                message="Idempotency key is required and must be at most 255 characters.",
                http_status=status.HTTP_400_BAD_REQUEST,
            )

        fingerprint = payload_fingerprint(idempotency_json_safe(request.data))
        record, created = self._load_or_create_idempotency_record(
            request,
            endpoint=endpoint,
            idempotency_key=idempotency_key,
            fingerprint=fingerprint,
        )

        if not created:
            if record.request_fingerprint != fingerprint:
                return self._idempotency_error(
                    request,
                    code="idempotency_key_conflict",
                    message="This idempotency key was already used with a different payload.",
                    http_status=status.HTTP_409_CONFLICT,
                )

            if (
                record.response_status is not None
                and record.response_payload is not None
            ):
                replay_response = Response(
                    record.response_payload, status=record.response_status
                )
                replay_response["X-Idempotent-Replay"] = "true"
                replay_response["Idempotency-Key"] = idempotency_key
                return replay_response

            return self._idempotency_error(
                request,
                code="idempotency_key_in_progress",
                message="A request with this idempotency key is currently being processed.",
                http_status=status.HTTP_409_CONFLICT,
            )

        try:
            response = execute()
        except Exception:
            BillingIdempotencyKey.objects.filter(
                pk=record.pk, response_status__isnull=True
            ).delete()
            raise

        if not (200 <= int(getattr(response, "status_code", 500)) < 300):
            BillingIdempotencyKey.objects.filter(
                pk=record.pk, response_status__isnull=True
            ).delete()
            return response

        payload = idempotency_json_safe(getattr(response, "data", {}))
        BillingIdempotencyKey.objects.filter(pk=record.pk).update(
            response_status=response.status_code,
            response_payload=payload,
            resource_type=resource_type,
            resource_id=str(payload.get(resource_id_field, "")),
        )
        response["Idempotency-Key"] = idempotency_key
        return response
