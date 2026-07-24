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
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from core.permissions import IsAdminOrStaff, IsPlatformSettingsAdmin

from .models import AuditLog, ContactMessage, GlobalSettings, SchoolProfile
from .serializers import AuditLogSerializer, GlobalSettingsSerializer

logger = logging.getLogger(__name__)
import glob
from datetime import datetime

from django.utils import timezone
from prometheus_client import CONTENT_TYPE_LATEST

from core.async_jobs import get_job_status
from core.metrics import prometheus_metrics_payload
from core.utils.audit import record_audit_event


class SchoolPublicInfoRateThrottle(ScopedRateThrottle):
    scope = "public_school_info"


class SchoolPublicInfoView(APIView):
    """GET /api/core/school-public-info/ — public projection of the school
    profile for the marketing site (About/Contact/Home stats). No auth
    required; only exposes fields already meant to be public-facing
    (name/address/contact/logo), plus real, non-sensitive aggregate counts —
    never fabricated."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [SchoolPublicInfoRateThrottle]

    def get(self, request):
        school = SchoolProfile.get_solo()

        from academic.models import Student, Teacher

        logo_url = None
        if school.logo:
            try:
                logo_url = request.build_absolute_uri(school.logo.url)
            except ValueError:
                logo_url = None

        return Response(
            {
                "exists": True,
                "name": school.name,
                "address": school.address or "",
                "contact_email": school.contact_email or "",
                "contact_phone": school.contact_phone or "",
                "website": school.website or "",
                "established_year": school.established_year,
                "principal_name": school.principal_name or "",
                "current_academic_year": school.current_academic_year,
                "logo": logo_url,
                "student_count": Student.objects.count(),
                "teacher_count": Teacher.objects.count(),
            }
        )


class ContactMessageRateThrottle(ScopedRateThrottle):
    scope = "public_contact_message"


class ContactMessageSerializer(serializers.ModelSerializer):
    honeypot = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = ContactMessage
        fields = [
            "message_id", "name", "email", "phone", "department",
            "subject", "message", "is_read", "created_at", "honeypot",
        ]
        read_only_fields = ["message_id", "is_read", "created_at"]

    def validate_honeypot(self, value):
        if value:
            raise serializers.ValidationError("Invalid submission.")
        return value


class ContactMessageViewSet(viewsets.ModelViewSet):
    """POST is the public Contact form (AllowAny, throttled). List/retrieve/
    mark-as-read is restricted to the school's own admins."""

    serializer_class = ContactMessageSerializer
    queryset = ContactMessage.objects.all()
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_throttles(self):
        if self.action == "create":
            return [ContactMessageRateThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        if self.action == "create":
            return ContactMessage.objects.none()
        return ContactMessage.objects.all()

    def perform_create(self, serializer):
        serializer.validated_data.pop("honeypot", None)
        serializer.save()


class TenantCapabilitiesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        school = SchoolProfile.get_solo()
        return Response(
            {
                "status": "active",
                "features": school.features or {},
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
        checks = {"database": False}
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            checks["database"] = True
        except Exception:
            checks["database"] = False

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
        return Response(payload)


class SchoolProfileView(APIView):
    """
    GET / PATCH the school's own profile (Nepali billing identity, contact
    info, logo, signatories, and bill book settings).
    """

    permission_classes = [permissions.IsAuthenticated]

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

    READABLE_FIELDS = EDITABLE_FIELDS | {"id", "logo"}

    def _is_admin(self, request) -> bool:
        role = (getattr(request.user, "role", "") or "").lower()
        return role == "admin" or bool(
            getattr(request.user, "is_staff", False)
            or getattr(request.user, "is_superuser", False)
        )

    def get(self, request):
        school = SchoolProfile.get_solo()
        data = {f: getattr(school, f, "") for f in self.READABLE_FIELDS - {"logo"}}
        try:
            data["logo"] = school.logo.url if school.logo else ""
        except Exception:
            data["logo"] = ""
        return Response(data)

    def patch(self, request):
        if not self._is_admin(request):
            return Response(
                {"detail": "Only school admins may update the profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        school = SchoolProfile.get_solo()

        updates = {k: v for k, v in request.data.items() if k in self.EDITABLE_FIELDS}
        for key, value in updates.items():
            setattr(school, key, value)

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
            school.logo = request.FILES["logo"]

        school.save()

        record_audit_event(
            action="core.school_profile_updated",
            user=request.user,
            request=request,
            details={
                "fields": sorted(updates.keys()),
                "logo_uploaded": "logo" in request.FILES,
            },
        )
        return self.get(request)


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

    permission_classes = [IsPlatformSettingsAdmin]

    @staticmethod
    def _snapshot(settings_obj):
        return {
            "site_name": settings_obj.site_name,
            "maintenance_mode": settings_obj.maintenance_mode,
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


class SaasAIUsageView(APIView):
    """
    GET /api/core/saas-ai-usage/

    AI provider config plus token/cost usage summary, aggregated from
    AIInteractionLog. Single-tenant: there is only one school in this
    deployment, so this reports usage for the whole platform (= this school).
    """

    permission_classes = [IsPlatformSettingsAdmin]

    def get(self, request):
        from datetime import timedelta

        from django.db.models import Count, Sum
        from django.db.models.functions import TruncDate

        from ai_engine.models import AIInteractionLog
        from ai_engine.services.provider_config import get_ai_provider_config

        provider_config = get_ai_provider_config()
        provider = {
            "name": provider_config["provider_name"],
            "base_url": provider_config["base_url"],
            "model": provider_config["model"],
            "configured": provider_config["configured"],
            "enabled": provider_config["enabled"],
            "source": provider_config["source"],
            "api_key_masked": provider_config["api_key_masked"],
        }

        qs = AIInteractionLog.objects.all()
        totals = qs.aggregate(
            total_tokens=Sum("total_tokens"),
            total_prompt_tokens=Sum("prompt_tokens"),
            total_completion_tokens=Sum("completion_tokens"),
            total_requests=Count("log_id"),
            cost_estimate=Sum("cost_estimated"),
        )
        total_tokens = totals["total_tokens"] or 0
        total_requests = totals["total_requests"] or 0
        cost_estimate = float(totals["cost_estimate"] or 0)
        avg_tokens_per_request = (total_tokens / total_requests) if total_requests else 0
        avg_cost_per_1k_tokens = (
            (cost_estimate / total_tokens * 1000) if total_tokens else 0
        )

        by_feature = (
            qs.values("feature_used")
            .annotate(
                tokens=Sum("total_tokens"),
                prompt_tokens=Sum("prompt_tokens"),
                completion_tokens=Sum("completion_tokens"),
                requests=Count("log_id"),
                cost_estimate=Sum("cost_estimated"),
            )
            .order_by("-tokens")
        )
        usage_by_feature = [
            {
                "feature": row["feature_used"] or "unknown",
                "tokens": row["tokens"] or 0,
                "prompt_tokens": row["prompt_tokens"] or 0,
                "completion_tokens": row["completion_tokens"] or 0,
                "requests": row["requests"] or 0,
                "cost_estimate": float(row["cost_estimate"] or 0),
                "percentage": (
                    round((row["tokens"] or 0) / total_tokens * 100, 2)
                    if total_tokens
                    else 0
                ),
            }
            for row in by_feature
        ]

        since = timezone.now().date() - timedelta(days=6)
        daily_rows = (
            qs.filter(timestamp__date__gte=since)
            .annotate(day=TruncDate("timestamp"))
            .values("day")
            .annotate(
                tokens=Sum("total_tokens"),
                requests=Count("log_id"),
                cost_estimate=Sum("cost_estimated"),
            )
        )
        daily_by_date = {row["day"]: row for row in daily_rows}
        daily_usage_last_7_days = []
        for i in range(6, -1, -1):
            day = timezone.now().date() - timedelta(days=i)
            row = daily_by_date.get(day)
            daily_usage_last_7_days.append(
                {
                    "date": str(day),
                    "tokens": (row["tokens"] or 0) if row else 0,
                    "requests": (row["requests"] or 0) if row else 0,
                    "cost_estimate": float(row["cost_estimate"] or 0) if row else 0,
                }
            )

        return Response(
            {
                "provider": provider,
                "total_tokens": total_tokens,
                "total_prompt_tokens": totals["total_prompt_tokens"] or 0,
                "total_completion_tokens": totals["total_completion_tokens"] or 0,
                "total_requests": total_requests,
                "cost_estimate": cost_estimate,
                "avg_cost_per_1k_tokens": avg_cost_per_1k_tokens,
                "avg_tokens_per_request": avg_tokens_per_request,
                "usage_by_feature": usage_by_feature,
                "daily_usage_last_7_days": daily_usage_last_7_days,
            }
        )


class SystemStatusView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        try:
            start = time.perf_counter()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            latency_ms = int((time.perf_counter() - start) * 1000)
            db_status = "Operational"
        except Exception:
            db_status = "Degraded"
            latency_ms = -1

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
        try:
            call_command("backup_db")
            record_audit_event(
                action="core.backup_created",
                user=request.user,
                request=request,
                details={},
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
