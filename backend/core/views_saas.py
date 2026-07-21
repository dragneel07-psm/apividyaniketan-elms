# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging
import os
from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal

from django.core.cache import cache
from django.db.models import Count, Max, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django_tenants.utils import schema_context
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_engine.services.provider_config import get_ai_provider_config
from billing.models_saas import Invoice, Subscription
from core.models import Tenant
from core.utils.audit import record_audit_event

logger = logging.getLogger(__name__)

KPI_CACHE_KEY = "saas:kpi:v2"
AI_USAGE_CACHE_KEY = "saas:ai-usage:v2"
DASHBOARD_CACHE_TTL_SECONDS = int(os.environ.get("SAAS_DASHBOARD_CACHE_TTL", "60"))
SAAS_DASHBOARD_TENANT_LIMIT = int(os.environ.get("SAAS_DASHBOARD_TENANT_LIMIT", "500"))


def _as_bool(value) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def _format_time_ago(reference: datetime, now: datetime) -> str:
    delta = now - reference
    seconds = max(int(delta.total_seconds()), 0)
    if seconds < 60:
        return "just now"
    if seconds < 3600:
        minutes = seconds // 60
        return f"{minutes}m ago"
    if seconds < 86400:
        hours = seconds // 3600
        return f"{hours}h ago"
    days = seconds // 86400
    return f"{days}d ago"


class IsSaaSAdmin(permissions.BasePermission):
    """Super admin only (role='saas_admin'). Use for privileged operations."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "saas_admin"
        )


class IsSaaSAdminOrStaff(permissions.BasePermission):
    """Allows both saas_admin and saas_staff. Use for read/operational views."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("saas_admin", "saas_staff")
        )


class SaasKPIView(APIView):
    permission_classes = [IsSaaSAdminOrStaff]
    throttle_classes = []

    def get(self, request):
        force_refresh = _as_bool(request.query_params.get("refresh"))
        if not force_refresh:
            cached_payload = cache.get(KPI_CACHE_KEY)
            if cached_payload:
                return Response(cached_payload)

        # 1. Basic Stats
        total_schools = Tenant.objects.count()
        tenants = list(
            Tenant.objects.only("id", "name", "schema_name").order_by("name")[
                :SAAS_DASHBOARD_TENANT_LIMIT
            ]
        )
        tenants_truncated = total_schools > len(tenants)

        # 2. Revenue (Aggregated from default/public schema DB)
        invoices = Invoice.objects.all()
        paid_invoices = invoices.filter(status="paid")
        mrr = paid_invoices.aggregate(total=Sum("amount"))["total"] or 0
        pending_revenue = (
            invoices.filter(status="pending").aggregate(total=Sum("amount"))["total"]
            or 0
        )
        # Support historical schema variants:
        # - If invoice due_date exists, use it.
        # - Otherwise fallback to pending invoices older than 30 days from issued_date.
        invoice_field_names = {field.name for field in Invoice._meta.get_fields()}
        overdue_invoices = 0
        if "due_date" in invoice_field_names:
            overdue_invoices = invoices.filter(
                status="pending", due_date__lt=timezone.now().date()
            ).count()
        elif "issued_date" in invoice_field_names:
            overdue_cutoff = timezone.now() - timedelta(days=30)
            overdue_invoices = invoices.filter(
                status="pending", issued_date__lt=overdue_cutoff
            ).count()

        # 3. Aggregated Students across all tenants using django-tenants schema_context
        total_students = 0
        total_ai_tokens_used = 0
        tenant_activity = []
        tenant_errors = []

        try:
            from academic.models import Student
            from ai_engine.models import AIInteractionLog

            for tenant in tenants:
                try:
                    with schema_context(tenant.schema_name):
                        students_count = Student.objects.count()
                        ai_tokens_used = (
                            AIInteractionLog.objects.aggregate(
                                total=Sum("total_tokens")
                            ).get("total")
                            or 0
                        )
                    total_students += students_count
                    total_ai_tokens_used += int(ai_tokens_used)
                    status = "active" if students_count > 0 else "idle"
                    tenant_activity.append(
                        {
                            "id": str(tenant.id),
                            "name": tenant.name,
                            "status": status,
                            "students": students_count,
                        }
                    )
                except Exception:
                    logger.exception(
                        "SaasKPIView: failed to aggregate tenant %s",
                        tenant.schema_name,
                    )
                    tenant_activity.append(
                        {
                            "id": str(tenant.id),
                            "name": tenant.name,
                            "status": "error",
                            "students": 0,
                        }
                    )
                    tenant_errors.append(
                        {
                            "tenant_id": str(tenant.id),
                            "tenant_name": tenant.name,
                        }
                    )
        except Exception:
            logger.exception("SaasKPIView: outer aggregation failed")
            tenant_activity = [
                {"id": str(t.id), "name": t.name, "status": "unknown", "students": 0}
                for t in tenants
            ]
            tenant_errors.append({"error": "aggregation_failed"})

        # 4. Revenue Trend (Live calculation — using issued_date which exists on Invoice)
        revenue_trend = []
        now = timezone.now()
        for i in range(5, -1, -1):
            target_date = now - timedelta(days=i * 30)
            month_label = target_date.strftime("%b")

            month_paid = (
                Invoice.objects.filter(
                    status="paid",
                    issued_date__year=target_date.year,
                    issued_date__month=target_date.month,
                ).aggregate(total=Sum("amount"))["total"]
                or 0
            )

            revenue_trend.append(
                {
                    "month": month_label,
                    "mrr": float(month_paid),
                    "projected": float(month_paid) * 1.1,
                }
            )

        # 5. Dynamic Security Alerts
        alerts = []
        now_dt = timezone.now()
        for t in tenant_activity:
            if t["status"] == "error":
                alerts.append(
                    {
                        "id": f"tenant-error-{t['id']}",
                        "level": "critical",
                        "title": f"Connection Error: {t['name']}",
                        "description": f"Failed to connect to tenant schema {t['id']}. Investigating...",
                        "timestamp": "just now",
                    }
                )

        if overdue_invoices > 0:
            alerts.append(
                {
                    "id": "billing-overdue",
                    "level": "warning",
                    "title": "Overdue Invoices Detected",
                    "description": f"{overdue_invoices} invoice(s) are overdue and require follow-up.",
                    "timestamp": "just now",
                }
            )

        if pending_revenue > 0:
            alerts.append(
                {
                    "id": "billing-pending",
                    "level": "info",
                    "title": "Pending Revenue",
                    "description": f"${float(pending_revenue):,.2f} is currently pending collection.",
                    "timestamp": "just now",
                }
            )

        if not alerts:
            latest_paid_invoice = paid_invoices.order_by("-issued_date").first()
            issued_at = latest_paid_invoice.issued_date if latest_paid_invoice else None
            if issued_at and not isinstance(issued_at, datetime):
                issued_at = datetime.combine(issued_at, datetime.min.time())
                issued_at = timezone.make_aware(
                    issued_at, timezone.get_current_timezone()
                )
            if isinstance(issued_at, datetime) and timezone.is_naive(issued_at):
                issued_at = timezone.make_aware(
                    issued_at, timezone.get_current_timezone()
                )
            invoice_timestamp = (
                _format_time_ago(issued_at, now_dt) if issued_at else "just now"
            )
            alerts = [
                {
                    "id": "system-healthy",
                    "level": "info",
                    "title": "System Integrity Check",
                    "description": "All tenant schemas and billing channels are healthy.",
                    "timestamp": invoice_timestamp,
                }
            ]

        total_ai_limit = (
            Subscription.objects.aggregate(total=Sum("ai_token_limit")).get("total")
            or 0
        )
        ai_usage_avg = (
            round((total_ai_tokens_used / total_ai_limit) * 100, 2)
            if total_ai_limit
            else 0.0
        )

        payload = {
            "kpis": {
                "total_schools": total_schools,
                "total_students": total_students,
                "mrr": float(mrr),
                "pending_revenue": float(pending_revenue),
                "ai_usage_avg": ai_usage_avg,
            },
            "revenue_trend": revenue_trend,
            "tenant_activity": tenant_activity,
            "alerts": alerts,
            "tenant_errors": tenant_errors,
            "tenants_truncated": tenants_truncated,
            "tenants_shown": len(tenants),
        }
        cache.set(KPI_CACHE_KEY, payload, DASHBOARD_CACHE_TTL_SECONDS)
        return Response(payload)


class SaasAIUsageView(APIView):
    permission_classes = [IsSaaSAdminOrStaff]
    throttle_classes = []

    def get(self, request):
        force_refresh = _as_bool(request.query_params.get("refresh"))
        if not force_refresh:
            cached_payload = cache.get(AI_USAGE_CACHE_KEY)
            if cached_payload:
                return Response(cached_payload)

        total_tenant_count = Tenant.objects.count()
        tenants = list(
            Tenant.objects.only("id", "name", "schema_name").order_by("name")[
                :SAAS_DASHBOARD_TENANT_LIMIT
            ]
        )
        tenants_truncated = total_tenant_count > len(tenants)
        total_tokens = 0
        total_prompt_tokens = 0
        total_completion_tokens = 0
        total_requests = 0
        total_cost = Decimal("0")
        usage_by_feature_map = defaultdict(
            lambda: {
                "tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "requests": 0,
                "cost_estimate": Decimal("0"),
            }
        )
        top_tenants = []
        tenant_errors = []
        daily_usage_map = defaultdict(
            lambda: {"tokens": 0, "requests": 0, "cost_estimate": Decimal("0")}
        )

        provider_config = get_ai_provider_config()

        try:
            from django_tenants.utils import schema_context

            from ai_engine.models import AIInteractionLog

            for tenant in tenants:
                try:
                    with schema_context(tenant.schema_name):
                        logs = AIInteractionLog.objects.all()
                        tenant_totals = logs.aggregate(
                            total_tokens=Sum("total_tokens"),
                            total_prompt_tokens=Sum("prompt_tokens"),
                            total_completion_tokens=Sum("completion_tokens"),
                            total_cost=Sum("cost_estimated"),
                            total_requests=Count("log_id"),
                            last_activity=Max("timestamp"),
                        )

                        tenant_tokens = int(tenant_totals.get("total_tokens") or 0)
                        tenant_prompt_tokens = int(
                            tenant_totals.get("total_prompt_tokens") or 0
                        )
                        tenant_completion_tokens = int(
                            tenant_totals.get("total_completion_tokens") or 0
                        )
                        tenant_cost = Decimal(str(tenant_totals.get("total_cost") or 0))
                        tenant_requests = int(tenant_totals.get("total_requests") or 0)
                        tenant_last_activity = tenant_totals.get("last_activity")

                        total_tokens += tenant_tokens
                        total_prompt_tokens += tenant_prompt_tokens
                        total_completion_tokens += tenant_completion_tokens
                        total_cost += tenant_cost
                        total_requests += tenant_requests

                        if tenant_requests > 0:
                            top_tenants.append(
                                {
                                    "tenant_id": str(tenant.id),
                                    "tenant_name": tenant.name,
                                    "tokens": tenant_tokens,
                                    "prompt_tokens": tenant_prompt_tokens,
                                    "completion_tokens": tenant_completion_tokens,
                                    "requests": tenant_requests,
                                    "cost_estimate": float(tenant_cost),
                                    "avg_tokens_per_request": round(
                                        tenant_tokens / tenant_requests, 2
                                    ),
                                    "last_activity": (
                                        tenant_last_activity.isoformat()
                                        if tenant_last_activity
                                        else None
                                    ),
                                }
                            )

                        feature_usage = logs.values("feature_used").annotate(
                            tokens=Sum("total_tokens"),
                            prompt_tokens=Sum("prompt_tokens"),
                            completion_tokens=Sum("completion_tokens"),
                            cost=Sum("cost_estimated"),
                            requests=Count("log_id"),
                        )
                        for item in feature_usage:
                            feature_key = item.get("feature_used") or "unknown"
                            usage_by_feature_map[feature_key]["tokens"] += int(
                                item.get("tokens") or 0
                            )
                            usage_by_feature_map[feature_key]["prompt_tokens"] += int(
                                item.get("prompt_tokens") or 0
                            )
                            usage_by_feature_map[feature_key][
                                "completion_tokens"
                            ] += int(item.get("completion_tokens") or 0)
                            usage_by_feature_map[feature_key]["requests"] += int(
                                item.get("requests") or 0
                            )
                            usage_by_feature_map[feature_key][
                                "cost_estimate"
                            ] += Decimal(str(item.get("cost") or 0))

                        last_7_days = timezone.now().date() - timedelta(days=6)
                        daily_usage = (
                            logs.filter(timestamp__date__gte=last_7_days)
                            .annotate(day=TruncDate("timestamp"))
                            .values("day")
                            .annotate(
                                tokens=Sum("total_tokens"),
                                requests=Count("log_id"),
                                cost=Sum("cost_estimated"),
                            )
                        )
                        for day_item in daily_usage:
                            key = day_item["day"].isoformat()
                            daily_usage_map[key]["tokens"] += int(
                                day_item.get("tokens") or 0
                            )
                            daily_usage_map[key]["requests"] += int(
                                day_item.get("requests") or 0
                            )
                            daily_usage_map[key]["cost_estimate"] += Decimal(
                                str(day_item.get("cost") or 0)
                            )
                except Exception:
                    logger.exception(
                        "SaasAIUsageView: failed to aggregate tenant %s",
                        tenant.schema_name,
                    )
                    tenant_errors.append(
                        {
                            "tenant_id": str(tenant.id),
                            "tenant_name": tenant.name,
                            "schema_name": tenant.schema_name,
                        }
                    )
        except Exception:
            logger.exception("SaasAIUsageView: outer aggregation failed")
            tenant_errors.append({"error": "aggregation_failed"})

        usage_by_feature = []
        for feature_key, stats in usage_by_feature_map.items():
            tokens = stats["tokens"]
            usage_by_feature.append(
                {
                    "feature": feature_key.replace("_", " ").title(),
                    "tokens": tokens,
                    "prompt_tokens": stats["prompt_tokens"],
                    "completion_tokens": stats["completion_tokens"],
                    "requests": stats["requests"],
                    "cost_estimate": float(stats["cost_estimate"]),
                    "percentage": (
                        round((tokens / total_tokens) * 100, 2)
                        if total_tokens > 0
                        else 0
                    ),
                }
            )

        usage_by_feature.sort(key=lambda x: x["tokens"], reverse=True)
        top_tenants.sort(key=lambda x: x["tokens"], reverse=True)

        daily_usage_last_7_days = []
        for i in range(6, -1, -1):
            day = (timezone.now().date() - timedelta(days=i)).isoformat()
            day_stats = daily_usage_map[day]
            daily_usage_last_7_days.append(
                {
                    "date": day,
                    "tokens": day_stats["tokens"],
                    "requests": day_stats["requests"],
                    "cost_estimate": float(day_stats["cost_estimate"]),
                }
            )

        avg_cost_per_1k_tokens = float(
            (total_cost / total_tokens * 1000) if total_tokens > 0 else 0
        )
        avg_tokens_per_request = (
            float(total_tokens / total_requests) if total_requests > 0 else 0
        )

        payload = {
            "provider": {
                "name": provider_config.get("provider_name"),
                "base_url": provider_config.get("base_url"),
                "model": provider_config.get("model"),
                "configured": provider_config.get("configured"),
                "enabled": provider_config.get("enabled"),
                "source": provider_config.get("source"),
                "api_key_masked": provider_config.get("api_key_masked"),
            },
            "total_tokens": total_tokens,
            "total_prompt_tokens": total_prompt_tokens,
            "total_completion_tokens": total_completion_tokens,
            "total_requests": total_requests,
            "cost_estimate": float(total_cost),
            "avg_cost_per_1k_tokens": round(avg_cost_per_1k_tokens, 6),
            "avg_tokens_per_request": round(avg_tokens_per_request, 2),
            "active_tenants": len([t for t in top_tenants if t["tokens"] > 0]),
            "total_tenants": total_tenant_count,
            "tenants_shown": len(tenants),
            "tenants_truncated": tenants_truncated,
            "usage_by_feature": usage_by_feature,
            "top_tenants": top_tenants[:10],
            "daily_usage_last_7_days": daily_usage_last_7_days,
            "tenant_errors": tenant_errors,
        }
        cache.set(AI_USAGE_CACHE_KEY, payload, DASHBOARD_CACHE_TTL_SECONDS)
        return Response(payload)


class TenantAdminPasswordResetView(APIView):
    permission_classes = [IsSaaSAdmin]
    throttle_classes = []

    def post(self, request):
        tenant_id = request.data.get("tenant_id")
        new_password = request.data.get("new_password")
        admin_user_id = request.data.get("admin_user_id")
        admin_email = (request.data.get("admin_email") or "").strip()

        if not tenant_id or not new_password:
            return Response(
                {"error": "tenant_id and new_password are required"}, status=400
            )
        if len(str(new_password)) < 6:
            return Response(
                {"error": "new_password must be at least 6 characters"}, status=400
            )

        try:
            from django_tenants.utils import schema_context

            from users.models import UserAccount

            tenant = Tenant.objects.get(id=tenant_id)

            with schema_context(tenant.schema_name):
                admin_queryset = UserAccount.objects.filter(role="admin")
                admin_user = None

                if admin_user_id:
                    admin_user = admin_queryset.filter(pk=admin_user_id).first()
                    if not admin_user:
                        return Response(
                            {
                                "error": "Specified admin user was not found for this tenant"
                            },
                            status=404,
                        )
                elif admin_email:
                    admin_user = admin_queryset.filter(
                        email__iexact=admin_email
                    ).first()
                    if not admin_user:
                        return Response(
                            {
                                "error": "Specified admin email was not found for this tenant"
                            },
                            status=404,
                        )
                else:
                    # Deterministic fallback when caller does not specify a user.
                    admin_user = admin_queryset.order_by("date_joined", "email").first()

                if not admin_user:
                    return Response(
                        {"error": "Admin user not found for this tenant"}, status=404
                    )

                admin_user.set_password(new_password)
                # Ensure the account is active so the admin can log in immediately
                # after a SaaS-initiated password reset (account may have been
                # pending email verification or previously deactivated).
                admin_user.is_active = True
                admin_user.failed_login_attempts = 0
                admin_user.locked_until = None
                admin_user.save(
                    update_fields=[
                        "password",
                        "is_active",
                        "failed_login_attempts",
                        "locked_until",
                    ]
                )
                record_audit_event(
                    action="core.tenant_admin_password_reset",
                    user=request.user,
                    request=request,
                    details={
                        "tenant_id": str(tenant.id),
                        "tenant_schema": tenant.schema_name,
                        "target_user_id": str(admin_user.user_id),
                        "target_email": admin_user.email,
                        "account_activated": True,
                    },
                )

            return Response(
                {
                    "message": f"Password reset successfully for admin of {tenant.name}",
                    "admin_user_id": str(admin_user.user_id),
                    "admin_email": admin_user.email,
                }
            )
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class TenantUsersView(APIView):
    permission_classes = [IsSaaSAdmin]
    throttle_classes = []

    def get(self, request, tenant_id):
        return Response(
            {
                "error": "Listing tenant users from SaaS admin is disabled. View user counts only."
            },
            status=403,
        )

    def post(self, request, tenant_id):
        return Response(
            {"error": "Creating tenant users from SaaS admin is disabled."},
            status=403,
        )


class TenantUserDetailView(APIView):
    permission_classes = [IsSaaSAdmin]
    throttle_classes = []

    def patch(self, request, tenant_id, user_id):
        return Response(
            {"error": "Updating tenant users from SaaS admin is disabled."},
            status=403,
        )


class TenantUserPasswordResetView(APIView):
    permission_classes = [IsSaaSAdmin]
    throttle_classes = []

    def post(self, request, tenant_id, user_id):
        new_password = request.data.get("new_password")
        if not new_password:
            return Response({"error": "new_password is required"}, status=400)

        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=404)

        try:
            from users.models import UserAccount

            with schema_context(tenant.schema_name):
                user = UserAccount.objects.get(pk=user_id)
                if user.role != "admin":
                    return Response(
                        {
                            "error": "SaaS admin can only reset passwords for tenant admin users."
                        },
                        status=403,
                    )
                user.set_password(new_password)
                user.save()
                record_audit_event(
                    action="core.tenant_user_password_reset",
                    user=request.user,
                    request=request,
                    details={
                        "tenant_id": str(tenant.id),
                        "tenant_schema": tenant.schema_name,
                        "target_user_id": str(user.user_id),
                        "target_email": user.email,
                    },
                )
                return Response({"message": "Password reset successfully"})
        except Exception as e:
            return Response({"error": str(e)}, status=500)
