# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
# core/views.py
import logging
import os
import shutil
import time

from django.conf import settings
from django.core.management import call_command
from django.db import connection
from django.http import FileResponse, Http404, HttpResponse
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView


class TenantCheckRateThrottle(ScopedRateThrottle):
    # Public, pre-login endpoint — cap per-IP requests so the school-code /
    # subdomain lookup cannot be swept to enumerate every tenant. Rate is
    # env-tunable (THROTTLE_TENANT_CHECK) since schools behind shared NAT can
    # burst during morning login.
    scope = "tenant_check"

from .models import AuditLog, GlobalSettings, Tenant
from .serializers import (
    AuditLogSerializer,
    GlobalSettingsSerializer,
    TenantCreateSerializer,
    TenantSerializer,
)
from .utils.tenant_db import get_tenant_db_alias, provision_tenant_db
from .utils.tenant_users import create_tenant_admin

logger = logging.getLogger(__name__)
import glob
from datetime import datetime, timedelta

from django.utils import timezone
from prometheus_client import CONTENT_TYPE_LATEST

from core.async_jobs import get_job_status
from core.metrics import prometheus_metrics_payload
from core.utils.audit import record_audit_event
from core.utils.plan_enforcement import (
    record_subscription_plan_history,
    sync_tenant_with_plan,
)


class TenantCheckView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [TenantCheckRateThrottle]

    def get(self, request):
        # We only consider it a "School Code" match if it resolved to a non-public tenant
        if request.tenant and request.tenant.schema_name != "public":
            return Response(
                {
                    "exists": True,
                    "name": request.tenant.name,
                    "schema_name": request.tenant.schema_name,
                    "id": str(request.tenant.id),
                }
            )
        return Response({"exists": False}, status=status.HTTP_404_NOT_FOUND)


class TenantCapabilitiesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tenant = getattr(request.user, "tenant", None) or getattr(
            request, "tenant", None
        )
        if tenant is None:
            return Response(
                {
                    "tenant": "public",
                    "tenant_id": None,
                    "status": "active",
                    "features": {},
                }
            )

        return Response(
            {
                "tenant": tenant.schema_name,
                "tenant_id": str(getattr(tenant, "id", "")),
                "status": getattr(tenant, "status", "active"),
                "features": getattr(tenant, "features", {}) or {},
            }
        )


class HealthzView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "timestamp": timezone.now().isoformat(),
                "trace_id": getattr(request, "request_id", None),
            }
        )


class ReadyzView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        checks = {
            "database": False,
            "public_tenant": False,
        }
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            checks["database"] = True
        except Exception:
            checks["database"] = False

        try:
            checks["public_tenant"] = Tenant.objects.filter(
                schema_name="public"
            ).exists()
        except Exception:
            checks["public_tenant"] = False

        ready = all(checks.values())
        payload = {
            "status": "ready" if ready else "not_ready",
            "checks": checks,
            "trace_id": getattr(request, "request_id", None),
        }
        return Response(
            payload,
            status=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class MetricsView(APIView):
    # No JWT — scrapers authenticate with a static bearer token (METRICS_TOKEN),
    # not a user session. The token is checked manually in get().
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        import hmac

        from django.conf import settings

        token = (getattr(settings, "METRICS_TOKEN", "") or "").strip()

        if token:
            # Token configured: require "Authorization: Bearer <token>".
            header = request.META.get("HTTP_AUTHORIZATION", "")
            presented = (
                header[7:].strip() if header.lower().startswith("bearer ") else ""
            )
            if not presented or not hmac.compare_digest(presented, token):
                return HttpResponse("Unauthorized", status=401)
        elif not getattr(settings, "DEBUG", False):
            # No token configured in a non-debug deployment: fail closed and
            # do not advertise the endpoint. Set METRICS_TOKEN to enable scraping.
            return HttpResponse("Not found", status=404)

        return HttpResponse(
            prometheus_metrics_payload(), content_type=CONTENT_TYPE_LATEST
        )


class JobStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, job_id: str):
        payload = get_job_status(job_id)
        if payload is None:
            return Response(
                {"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND
            )

        request_tenant_schema = (
            str(getattr(getattr(request, "tenant", None), "schema_name", "public"))
            .strip()
            .lower()
        )
        payload_tenant_schema = (
            str(payload.get("tenant_schema") or "public").strip().lower()
        )
        is_saas_admin = bool(
            getattr(request.user, "is_staff", False)
            or getattr(request.user, "is_superuser", False)
        ) and not getattr(request.user, "tenant", None)

        if (
            not is_saas_admin
            and payload_tenant_schema
            and payload_tenant_schema != request_tenant_schema
        ):
            return Response(
                {"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(payload)


from .views_saas import IsSaaSAdmin


class SchoolProfileView(APIView):
    """
    GET / PATCH a school admin's own tenant profile (Phase A: Nepali billing identity).

    Scoped to the authenticated user's tenant — school admins manage their own
    school's PAN, address, logo, signatories, and bill book settings here
    without needing SaaS-admin privileges.
    """

    permission_classes = [permissions.IsAuthenticated]

    # Whitelist of fields a school admin may update from this endpoint.
    EDITABLE_FIELDS = {
        "name",
        "address",
        "contact_email",
        "contact_phone",
        "website",
        "established_year",
        "current_academic_year",
        "pan_number",
        "vat_number",
        "fiscal_year_bs",
        "currency_code",
        "currency_symbol",
        "principal_name",
        "accountant_name",
        "bill_prefix",
    }

    READABLE_FIELDS = EDITABLE_FIELDS | {"id", "schema_name", "logo"}

    def _resolve_tenant(self, request):
        tenant = getattr(request.user, "tenant", None)
        if tenant is None:
            tenant = getattr(request, "tenant", None)
        if tenant is None or getattr(tenant, "schema_name", "public") == "public":
            return None
        return tenant

    def _is_admin(self, request) -> bool:
        role = (getattr(request.user, "role", "") or "").lower()
        return role == "admin" or bool(
            getattr(request.user, "is_staff", False)
            or getattr(request.user, "is_superuser", False)
        )

    def get(self, request):
        tenant = self._resolve_tenant(request)
        if tenant is None:
            return Response(
                {"detail": "No tenant in scope."}, status=status.HTTP_404_NOT_FOUND
            )
        data = {f: getattr(tenant, f, "") for f in self.READABLE_FIELDS - {"logo"}}
        try:
            data["logo"] = tenant.logo.url if tenant.logo else ""
        except Exception:
            data["logo"] = ""
        return Response(data)

    def patch(self, request):
        if not self._is_admin(request):
            return Response(
                {"detail": "Only school admins may update the profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        tenant = self._resolve_tenant(request)
        if tenant is None:
            return Response(
                {"detail": "No tenant in scope."}, status=status.HTTP_404_NOT_FOUND
            )

        updates = {k: v for k, v in request.data.items() if k in self.EDITABLE_FIELDS}
        for key, value in updates.items():
            setattr(tenant, key, value)

        # Logo via multipart upload (separate field name). Direct FILES
        # assignment bypasses serializer validation, so validate explicitly.
        if "logo" in request.FILES:
            from django.core.exceptions import ValidationError as DjangoValidationError

            from core.upload_validation import validate_image_upload

            try:
                validate_image_upload(request.FILES["logo"])
            except DjangoValidationError as exc:
                return Response(
                    {"logo": exc.messages}, status=status.HTTP_400_BAD_REQUEST
                )
            tenant.logo = request.FILES["logo"]

        tenant.save()

        record_audit_event(
            action="tenant.school_profile_updated",
            user=request.user,
            request=request,
            details={
                "fields": sorted(updates.keys()),
                "logo_uploaded": "logo" in request.FILES,
            },
        )
        return self.get(request)


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.select_related("subscription__plan").exclude(
        schema_name="public"
    )
    permission_classes = [IsSaaSAdmin]
    throttle_classes = []

    def get_queryset(self):
        return Tenant.objects.select_related("subscription__plan").exclude(
            schema_name="public"
        )

    def get_serializer_class(self):
        if self.action == "create":
            return TenantCreateSerializer
        return TenantSerializer

    def perform_create(self, serializer):
        logger.info("Creating Tenant...")
        from django_tenants.utils import schema_context

        from .models.tenant import Domain

        # 1. Prepare Data
        subdomain = serializer.validated_data.get("subdomain")
        admin_email = serializer.validated_data.get("admin_email")
        admin_pass = serializer.validated_data.get("password")
        first = serializer.validated_data.get("admin_first_name")
        last = serializer.validated_data.get("admin_last_name")
        selected_plan = serializer.validated_data.get("plan")

        # 2. Save Tenant (schema_name is mandatory for TenantMixin)
        # We use the subdomain as the schema name for consistency
        tenant = serializer.save(schema_name=subdomain)
        logger.info(
            "Tenant '%s' saved with schema '%s'", tenant.name, tenant.schema_name
        )

        try:
            # 3. Create Domain
            # For local dev, we use .localhost. For prod, we should use the actual base domain.
            # Domain resolution in django-tenants handles the routing.
            base_domain = os.environ.get("BASE_DOMAIN", "localhost")
            domain_url = f"{subdomain}.{base_domain}"

            Domain.objects.create(domain=domain_url, tenant=tenant, is_primary=True)
            logger.info("Domain '%s' created for tenant.", domain_url)

            # 4. Create a default Trial Subscription for the new tenant
            try:
                from billing.models_saas import Subscription, SubscriptionPlan

                # Required by serializer, but keep a safe fallback.
                plan = (
                    selected_plan
                    or SubscriptionPlan.objects.filter(is_active=True)
                    .order_by("name")
                    .first()
                )
                if not plan:
                    raise ValueError("No active subscription plan found.")

                subscription = Subscription.objects.create(
                    tenant=tenant,
                    plan=plan,
                    status="trial",
                    billing_cycle="monthly",
                    end_date=timezone.now().date() + timedelta(days=15),
                    student_limit=plan.student_limit,
                    storage_limit_gb=plan.storage_limit_gb,
                    ai_token_limit=plan.ai_token_limit,
                )
                sync_tenant_with_plan(tenant, plan=plan, save=True)
                record_subscription_plan_history(
                    subscription,
                    previous_plan=None,
                    previous_status="",
                    previous_billing_cycle="",
                    reason="Initial 15-day trial assignment",
                    changed_by=getattr(self.request, "user", None),
                )
                logger.info(
                    "15-day trial subscription created for %s on plan %s",
                    tenant.name,
                    plan.name,
                )
            except Exception as sub_err:
                raise RuntimeError(
                    f"Failed to create trial subscription for {tenant.name}: {sub_err}"
                )

            # 4. Create Admin User inside the new tenant schema
            if admin_email and admin_pass:
                with schema_context(tenant.schema_name):
                    create_tenant_admin(tenant, admin_email, admin_pass, first, last)

                logger.info(
                    "Tenant provisioned: %s | domain=%s | admin=%s",
                    tenant.name,
                    domain_url,
                    admin_email,
                )
                record_audit_event(
                    action="core.tenant_created",
                    user=getattr(self.request, "user", None),
                    request=self.request,
                    details={
                        "tenant_id": str(tenant.id),
                        "tenant_schema": tenant.schema_name,
                        "tenant_name": tenant.name,
                        "domain": domain_url,
                        "plan": selected_plan.name if selected_plan else None,
                    },
                )

        except Exception as e:
            logger.error("Provisioning failed for %s: %s", subdomain, e)
            # Cleanup to avoid partial tenant setup
            try:
                tenant.delete()
            except Exception as delete_error:
                logger.error("Failed to cleanup tenant record: %s", delete_error)
            raise e

    def perform_update(self, serializer):
        before = serializer.instance
        before_state = {
            "status": before.status,
            "type": before.type,
            "features": dict(before.features or {}),
            "contact_email": before.contact_email,
        }
        tenant = serializer.save()
        record_audit_event(
            action="core.tenant_updated",
            user=getattr(self.request, "user", None),
            request=self.request,
            details={
                "tenant_id": str(tenant.id),
                "tenant_schema": tenant.schema_name,
                "before": before_state,
                "after": {
                    "status": tenant.status,
                    "type": tenant.type,
                    "features": tenant.features,
                    "contact_email": tenant.contact_email,
                },
            },
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if str(getattr(instance, "schema_name", "")).strip().lower() == "public":
            return Response(
                {"error": "The public tenant cannot be deleted."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Only allow deletion of suspended tenants
        if instance.status != "suspended":
            return Response(
                {
                    "error": "Only suspended tenants can be deleted. Suspend the tenant first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Require SaaS admin password confirmation
        password = request.data.get("password", "")
        if not password:
            return Response(
                {"error": "Password is required to confirm tenant deletion."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(password):
            return Response(
                {"error": "Incorrect password. Deletion cancelled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        payload = {
            "tenant_id": str(instance.id),
            "tenant_schema": instance.schema_name,
            "tenant_name": instance.name,
            "status": instance.status,
            "type": instance.type,
        }
        # Tenant deletion must run from the public schema. If the request is served while
        # another tenant schema is active, django-tenants can reject the drop or leave the
        # connection on a schema that no longer exists after deletion.
        connection.set_schema_to_public()
        instance.delete(force_drop=True)
        connection.set_schema_to_public()
        record_audit_event(
            action="core.tenant_deleted",
            user=getattr(self.request, "user", None),
            request=self.request,
            details=payload,
        )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAdminUser]


class GlobalSettingsViewSet(viewsets.ViewSet):
    """
    Singleton ViewSet for Global System Settings.
    The 'list' action (GET /api/core/settings/) returns the single instance.
    The 'create' or 'update' action (POST/PUT) updates that single instance.
    """

    permission_classes = [IsSaaSAdmin]

    @staticmethod
    def _snapshot(settings_obj):
        return {
            "site_name": settings_obj.site_name,
            "maintenance_mode": settings_obj.maintenance_mode,
            "allow_registration": settings_obj.allow_registration,
            "support_email": settings_obj.support_email,
            "default_language": settings_obj.default_language,
            "ai_enabled": settings_obj.ai_enabled,
            "ai_provider_name": settings_obj.ai_provider_name,
            "ai_base_url": settings_obj.ai_base_url,
            "ai_model": settings_obj.ai_model,
            "ai_api_key_configured": bool(settings_obj.ai_api_key),
        }

    def list(self, request):
        settings, _ = GlobalSettings.objects.get_or_create(pk=1)
        serializer = GlobalSettingsSerializer(settings)
        return Response(serializer.data)

    def create(self, request):
        # Handle POST as update for singleton
        settings, _ = GlobalSettings.objects.get_or_create(pk=1)
        before_state = self._snapshot(settings)
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            saved = serializer.save()
            record_audit_event(
                action="core.global_settings_updated",
                user=getattr(request, "user", None),
                request=request,
                details={
                    "before": before_state,
                    "after": self._snapshot(saved),
                },
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        # Handle PUT/PATCH explicitly if router calls it
        settings, _ = GlobalSettings.objects.get_or_create(pk=1)
        before_state = self._snapshot(settings)
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            saved = serializer.save()
            record_audit_event(
                action="core.global_settings_updated",
                user=getattr(request, "user", None),
                request=request,
                details={
                    "before": before_state,
                    "after": self._snapshot(saved),
                },
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="test-ai-connection")
    def test_ai_connection(self, request):
        """Send a 1-token ping to the configured AI provider and report success/failure.

        Body (all optional — when omitted, uses the persisted GlobalSettings):
          api_key, base_url, provider_name, model

        This lets the SaaS UI test a key the admin has typed but not yet saved.
        """
        from ai_engine.services.provider_config import (
            build_provider_headers,
            get_ai_provider_config,
            resolve_provider_and_base_url,
        )

        try:
            from openai import OpenAI
        except Exception as exc:
            return Response(
                {"ok": False, "error": f"AI client not installed on server: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        config = get_ai_provider_config()
        api_key = (
            (request.data.get("api_key") or "").strip() or config.get("api_key") or ""
        )
        base_url_in = (
            (request.data.get("base_url") or "").strip() or config.get("base_url") or ""
        )
        provider_in = (
            (request.data.get("provider_name") or "").strip()
            or config.get("provider_name")
            or ""
        )
        model = (request.data.get("model") or "").strip() or config.get("model") or ""

        if not api_key:
            return Response(
                {
                    "ok": False,
                    "error": "No API key configured. Enter a key (or save one) and try again.",
                }
            )

        provider_name, base_url = resolve_provider_and_base_url(
            provider_in, base_url_in, api_key
        )
        headers = build_provider_headers(provider_name)

        try:
            client = OpenAI(
                api_key=api_key,
                base_url=base_url,
                default_headers=headers or None,
                timeout=15.0,
            )
        except Exception as exc:
            return Response({"ok": False, "error": f"Could not init client: {exc}"})

        started = time.perf_counter()
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
                temperature=0,
            )
        except Exception as exc:
            return Response(
                {
                    "ok": False,
                    "provider": provider_name,
                    "model": model,
                    "base_url": base_url,
                    "error": str(exc),
                }
            )

        latency_ms = int((time.perf_counter() - started) * 1000)
        usage = getattr(completion, "usage", None)
        return Response(
            {
                "ok": True,
                "provider": provider_name,
                "model": getattr(completion, "model", model) or model,
                "base_url": base_url,
                "latency_ms": latency_ms,
                "prompt_tokens": getattr(usage, "prompt_tokens", 0) if usage else 0,
                "completion_tokens": (
                    getattr(usage, "completion_tokens", 0) if usage else 0
                ),
            }
        )


class SystemStatusView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        # 1. Check Database Status
        try:
            start = time.perf_counter()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            latency_ms = int((time.perf_counter() - start) * 1000)
            db_status = "Operational"
        except Exception:
            db_status = "Degraded"
            latency_ms = -1

        # 2. Disk Usage
        total, used, free = shutil.disk_usage("/")
        total_gb = total // (2**30)
        used_gb = used // (2**30)
        free_gb = free // (2**30)

        return Response(
            {
                "status": db_status,
                "latency": f"{latency_ms}ms" if latency_ms >= 0 else "N/A",
                "storage": {
                    "total": f"{total_gb} GB",
                    "used": f"{used_gb} GB",
                    "free": f"{free_gb} GB",
                    "percent": round((used / total) * 100, 1),
                },
            }
        )


class BackupViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        backup_dir = os.path.join(settings.BASE_DIR, "backups")
        os.makedirs(backup_dir, exist_ok=True)

        files = glob.glob(os.path.join(backup_dir, "*.sqlite3"))
        files.sort(key=os.path.getmtime, reverse=True)

        backups = []
        for f in files:
            stats = os.stat(f)
            backups.append(
                {
                    "filename": os.path.basename(f),
                    "created_at": datetime.fromtimestamp(stats.st_mtime),
                    "size_bytes": stats.st_size,
                    "size_mb": round(stats.st_size / (1024 * 1024), 2),
                }
            )

        return Response(backups)

    def create(self, request):
        # Trigger backup for current tenant or all?
        # For simplicity, let's backup ALL or allow param.
        # User might be on a tenant domain -> backup that tenant.

        schema = request.data.get("schema")

        try:
            if schema:
                call_command("backup_tenant", schema=schema)
            elif request.tenant.schema_name != "public":
                call_command("backup_tenant", schema=request.tenant.schema_name)
            else:
                if request.data.get("all"):
                    call_command("backup_tenant", all=True)
                else:
                    return Response(
                        {
                            "error": "Provide 'schema' for a tenant backup or set 'all': true for all tenants."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            record_audit_event(
                action="core.backup_created",
                user=request.user,
                request=request,
                details={
                    "requested_schema": schema,
                    "request_tenant_schema": getattr(
                        request.tenant, "schema_name", None
                    ),
                    "all": bool(request.data.get("all")),
                },
            )

            return Response({"status": "Backup created successfully"})
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path=r"download/(?P<filename>[^/]+)")
    def download(self, request, filename=None):
        backup_dir = os.path.join(settings.BASE_DIR, "backups")
        safe_filename = os.path.basename(filename or "")
        if (
            not safe_filename
            or safe_filename != filename
            or not safe_filename.endswith(".sqlite3")
        ):
            raise Http404("Backup file not found")

        file_path = os.path.join(backup_dir, safe_filename)
        if not os.path.isfile(file_path):
            raise Http404("Backup file not found")

        record_audit_event(
            action="core.backup_downloaded",
            user=request.user,
            request=request,
            details={
                "filename": safe_filename,
                "size_bytes": os.path.getsize(file_path),
            },
        )
        return FileResponse(
            open(file_path, "rb"), as_attachment=True, filename=safe_filename
        )
