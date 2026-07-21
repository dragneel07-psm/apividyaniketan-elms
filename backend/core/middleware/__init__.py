# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
core/middleware/__init__.py
───────────────────────────
Custom middleware for request context and tenant resolution.

Priority order:
  1. Domain-based lookup (mandatory in production)
  2. x-tenant-id header (debug + local development only)
"""

import os
import re
import uuid

from django.conf import settings
from django.db import DatabaseError, connection
from django.db.models import Q
from django.http import JsonResponse
from django_tenants.middleware.main import TenantMainMiddleware
from django_tenants.utils import get_tenant_domain_model, get_tenant_model

from core.logging_context import reset_request_context, set_request_context

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9\-_.]{8,128}$")
ACTIVE_TENANT_STATUSES = {"active", "trial"}
PROBE_PATHS = frozenset(
    {
        "/healthz",
        "/readyz",
        "/metrics",
        "/api/core/healthz",
        "/api/core/readyz",
        "/api/core/metrics",
    }
)


class RequestContextMiddleware:
    """
    Adds a stable request_id to request/response for tracing.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming_id = (request.headers.get("X-Request-ID", "") or "").strip()
        request_id = (
            incoming_id if REQUEST_ID_PATTERN.match(incoming_id) else str(uuid.uuid4())
        )
        request.request_id = request_id
        set_request_context(request_id=request_id)
        try:
            response = self.get_response(request)
        finally:
            reset_request_context()
        response["X-Request-ID"] = request_id
        return response


def _build_csp_header(policy: dict) -> str:
    if not isinstance(policy, dict):
        return ""

    directives = []
    for directive, values in policy.items():
        if not directive:
            continue
        clean_directive = str(directive).strip().lower()
        if not clean_directive:
            continue

        if isinstance(values, str):
            clean_values = values.strip()
        else:
            clean_values = " ".join(
                str(item).strip() for item in (values or []) if str(item).strip()
            ).strip()

        if clean_values:
            directives.append(f"{clean_directive} {clean_values}")
        else:
            directives.append(clean_directive)
    return "; ".join(directives)


class SecurityHeadersMiddleware:
    """
    Applies a configurable CSP and permissions policy baseline.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        csp_header_value = _build_csp_header(
            getattr(settings, "SECURITY_CSP_POLICY", {})
        )
        if csp_header_value:
            csp_header_name = (
                "Content-Security-Policy-Report-Only"
                if bool(getattr(settings, "SECURITY_CSP_REPORT_ONLY", False))
                else "Content-Security-Policy"
            )
            if csp_header_name not in response:
                response[csp_header_name] = csp_header_value

        permissions_policy = str(
            getattr(settings, "SECURITY_PERMISSIONS_POLICY", "") or ""
        ).strip()
        if permissions_policy and "Permissions-Policy" not in response:
            response["Permissions-Policy"] = permissions_policy

        if getattr(request, "_tenant_header_ignored", False):
            response["X-Tenant-Header-Ignored"] = "true"

        return response


class TenantFromHeaderMiddleware(TenantMainMiddleware):
    """
    Extends django-tenants middleware with a strict tenant-header trust mode.

    Trust modes:
      - dev_only (default): trust x-tenant-id only in DEBUG + localhost/127.0.0.1/*.local hosts
      - never: ignore x-tenant-id in all environments
    """

    @staticmethod
    def _is_local_hostname(hostname: str) -> bool:
        host = str(hostname or "").strip().lower()
        if not host:
            return False
        host = host.split(":", 1)[0]
        if host in {"localhost", "127.0.0.1", "::1", "[::1]"}:
            return True
        return host.endswith(".local")

    @staticmethod
    def _extract_hostname(raw_host: str) -> str:
        value = str(raw_host or "").strip().lower()
        if not value:
            return ""
        # RFC 7239 / proxy chains may provide comma-separated hosts.
        value = value.split(",", 1)[0].strip()
        # Drop optional port.
        return value.split(":", 1)[0].strip()

    def _hostname_from_request(self, request) -> str:
        """
        Resolve hostname for tenant routing with proxy-awareness.

        In production we front the backend with a Next.js API proxy, so
        request.host points to the backend service domain while the original
        tenant host is forwarded via X-Tenant-Host / X-Forwarded-Host.
        """
        tenant_host = self._extract_hostname(request.headers.get("x-tenant-host", ""))
        if tenant_host:
            # Only trust tenant host hints that match configured base-domain rules.
            # This avoids accidental routing to unrelated hosts.
            if self._subdomain_from_base_domain(tenant_host) is not None:
                return tenant_host

        forwarded_host = self._extract_hostname(
            request.headers.get("x-forwarded-host", "")
        )
        if forwarded_host:
            return forwarded_host

        return self._extract_hostname(self.hostname_from_request(request))

    @classmethod
    def _should_trust_tenant_header(cls, hostname: str) -> bool:
        mode = (
            str(getattr(settings, "TENANT_HEADER_TRUST_MODE", "dev_only"))
            .strip()
            .lower()
        )
        if mode == "never":
            return False
        if not bool(getattr(settings, "DEBUG", False)):
            return False
        if not cls._is_local_hostname(hostname):
            return False
        # dev_only (default): DEBUG + localhost only.
        return True

    @staticmethod
    def _is_tenant_active(tenant) -> bool:
        tenant_status = (
            str(getattr(tenant, "status", "active") or "active").strip().lower()
        )
        return tenant_status in ACTIVE_TENANT_STATUSES

    @staticmethod
    def _normalize_path(path: str) -> str:
        value = (path or "").strip()
        if not value:
            return "/"
        normalized = value if value.startswith("/") else f"/{value}"
        if len(normalized) > 1 and normalized.endswith("/"):
            return normalized[:-1]
        return normalized

    @classmethod
    def _is_probe_request(cls, request) -> bool:
        path = cls._normalize_path(
            getattr(request, "path_info", "") or getattr(request, "path", "")
        )
        return path in PROBE_PATHS

    @classmethod
    def _subdomain_from_base_domain(cls, hostname: str) -> str | None:
        """
        Fallback tenant inference when Domain rows are missing/stale.
        Only applies to hosts under BASE_DOMAIN.
        """
        host = cls._extract_hostname(hostname).strip(".")
        base_domain = cls._extract_hostname(
            getattr(settings, "BASE_DOMAIN", "") or os.environ.get("BASE_DOMAIN", "")
        ).strip(".")

        if not host or not base_domain:
            return None

        if host == base_domain or host == f"www.{base_domain}":
            return "public"

        suffix = f".{base_domain}"
        if not host.endswith(suffix):
            return None

        label = host[: -len(suffix)].strip(".")
        if not label:
            return None
        # We only support single-label tenant subdomains here.
        if "." in label:
            return None
        if label == "www":
            return "public"

        return label

    def process_request(self, request):
        connection.set_schema_to_public()

        # Platform probes should stay liveness-focused and not depend on tenant-domain resolution.
        if self._is_probe_request(request):
            request.tenant = None
            set_request_context(tenant_schema="public", tenant_id="-")
            return

        hostname = self._hostname_from_request(request)
        domain_model = get_tenant_domain_model()
        tenant_model = get_tenant_model()

        tenant = None

        # 1. Resolve by domain first (production-safe default)
        try:
            tenant = self.get_tenant(domain_model, hostname)
        except domain_model.DoesNotExist:
            tenant = None

        # 2. Optional x-tenant-id fallback (debug + local only)
        tenant_id = (
            (
                request.META.get("HTTP_X_TENANT_ID", "")
                or request.headers.get("x-tenant-id", "")
            )
            .strip()
            .lower()
        )

        trust_header = self._should_trust_tenant_header(hostname)
        if tenant is None and tenant_id and trust_header:
            # Accept school code as schema_name OR subdomain OR domain.
            try:
                # Keep this migration-safe: resolve by schema/domain first.
                # (subdomain can be absent in stale DB schema and cause 500)
                tenant_pk = (
                    domain_model.objects.select_related("tenant")
                    .filter(
                        Q(tenant__schema_name__iexact=tenant_id)
                        | Q(domain__iexact=tenant_id)
                        | Q(domain__istartswith=f"{tenant_id}.")
                    )
                    .values_list("tenant", flat=True)
                    .first()
                )
                if tenant_pk:
                    tenant = tenant_model.objects.filter(pk=tenant_pk).first()
                else:
                    tenant = tenant_model.objects.filter(
                        schema_name__iexact=tenant_id
                    ).first()
            except DatabaseError:
                tenant = tenant_model.objects.filter(
                    schema_name__iexact=tenant_id
                ).first()

        # 3. BASE_DOMAIN fallback for production safety when domain rows are stale/missing.
        # This keeps demo/school subdomains operational without requiring manual Domain backfill.
        if tenant is None:
            inferred_subdomain = self._subdomain_from_base_domain(hostname)
            if inferred_subdomain:
                try:
                    if inferred_subdomain == "public":
                        tenant = tenant_model.objects.filter(
                            schema_name__iexact="public"
                        ).first()
                    else:
                        tenant = tenant_model.objects.filter(
                            Q(schema_name__iexact=inferred_subdomain)
                            | Q(subdomain__iexact=inferred_subdomain)
                        ).first()
                except DatabaseError:
                    tenant = tenant_model.objects.filter(
                        schema_name__iexact=inferred_subdomain
                    ).first()

        # 4. In production, domain/base-domain fallback is mandatory and header fallback is disabled.
        if tenant is None and not bool(getattr(settings, "DEBUG", False)):
            return JsonResponse(
                {
                    "code": "tenant_domain_required",
                    "message": "Unable to resolve tenant from domain.",
                    "trace_id": getattr(request, "request_id", None),
                },
                status=400,
            )

        # 5. In debug, keep public fallback for local developer workflows.
        if tenant is None:
            tenant = tenant_model.objects.filter(schema_name__iexact="public").first()

        # 6. Nothing resolved
        if tenant is None:
            return self.no_tenant_found(request, hostname)

        # 7. Tenant status gate
        set_request_context(
            tenant_schema=getattr(tenant, "schema_name", "public"),
            tenant_id=str(getattr(tenant, "id", "") or "-"),
        )
        if tenant.schema_name != "public" and not self._is_tenant_active(tenant):
            return JsonResponse(
                {
                    "code": "tenant_inactive",
                    "message": "Tenant is not active. Contact your administrator.",
                    "tenant_status": getattr(tenant, "status", None),
                    "trace_id": getattr(request, "request_id", None),
                },
                status=403,
            )

        tenant.domain_url = hostname
        request.tenant = tenant
        connection.set_tenant(request.tenant)
        self.setup_url_routing(request)

        # Warn callers when they sent x-tenant-id but it was ignored (prod / non-local).
        if tenant_id and not trust_header:
            request._tenant_header_ignored = True
