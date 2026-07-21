# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from datetime import date, timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.models_saas import (
    Invoice,
    Subscription,
    SubscriptionPlan,
    SubscriptionPlanHistory,
)
from billing.permissions import IsSaaSAdminUser
from billing.plan_defaults import upsert_default_plans
from billing.serializers import (
    InvoiceSerializer,
    SubscriptionPlanHistorySerializer,
    SubscriptionPlanSerializer,
    SubscriptionSerializer,
)
from billing.shared_views import BillingSchemaGuardMixin
from core.models import Tenant
from core.reports import generate_pdf_response
from core.utils.audit import record_audit_event
from core.utils.plan_enforcement import (
    build_plan_snapshot,
    record_subscription_plan_history,
    sync_subscription_limits_with_plan,
    sync_tenant_with_plan,
)


class SubscriptionPlanViewSet(BillingSchemaGuardMixin, viewsets.ModelViewSet):
    require_public_schema = True
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsSaaSAdminUser]

    def get_permissions(self):
        if self.action == "public":
            return [permissions.AllowAny()]
        return super().get_permissions()

    def perform_update(self, serializer):
        previous_plan_state = SubscriptionPlan.objects.get(pk=serializer.instance.pk)
        previous_plan_snapshot = build_plan_snapshot(previous_plan_state)
        plan = serializer.save()
        new_plan_snapshot = build_plan_snapshot(plan)
        subscriptions = Subscription.objects.filter(plan=plan).select_related("tenant")
        for subscription in subscriptions:
            sync_subscription_limits_with_plan(subscription, plan=plan, save=True)
            sync_tenant_with_plan(subscription.tenant, plan=plan, save=True)
            record_subscription_plan_history(
                subscription,
                previous_plan=previous_plan_state,
                previous_status=subscription.status,
                previous_billing_cycle=subscription.billing_cycle,
                reason="Plan definition updated",
                changed_by=getattr(self.request, "user", None),
                previous_plan_snapshot=previous_plan_snapshot,
                new_plan_snapshot=new_plan_snapshot,
            )
        record_audit_event(
            action="billing.subscription_plan_definition_updated",
            user=self.request.user,
            request=self.request,
            details={
                "plan_id": str(plan.plan_id),
                "plan_name": plan.name,
                "before": previous_plan_snapshot,
                "after": new_plan_snapshot,
            },
        )

    @action(detail=False, methods=["post"], url_path="seed-defaults")
    def seed_defaults(self, request):
        role = (getattr(request.user, "role", "") or "").lower()
        if not (
            request.user.is_superuser or request.user.is_staff or role == "saas_admin"
        ):
            return Response(
                {"error": "Only SaaS administrators can seed default plans."},
                status=status.HTTP_403_FORBIDDEN,
            )

        result = upsert_default_plans()
        serializer = self.get_serializer(result["plans"], many=True)
        return Response(
            {
                "message": "Default subscription plans are ready.",
                "created": result["created"],
                "updated": result["updated"],
                "rate_used": result["rate_used"],
                "used_fallback": result["used_fallback"],
                "plans": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="public",
        permission_classes=[permissions.AllowAny],
    )
    def public(self, request):
        queryset = SubscriptionPlan.objects.filter(is_active=True).order_by(
            "price_monthly", "name"
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SubscriptionViewSet(BillingSchemaGuardMixin, viewsets.ModelViewSet):
    require_public_schema = True
    queryset = Subscription.objects.select_related("tenant", "plan").all()
    serializer_class = SubscriptionSerializer
    permission_classes = [IsSaaSAdminUser]

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        subscription = self.get_object()
        history = subscription.plan_history.select_related(
            "tenant", "subscription", "previous_plan", "new_plan", "changed_by"
        ).all()
        page = self.paginate_queryset(history)
        if page is not None:
            serializer = SubscriptionPlanHistorySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = SubscriptionPlanHistorySerializer(history, many=True)
        return Response(serializer.data)


class SubscriptionPlanHistoryViewSet(
    BillingSchemaGuardMixin, viewsets.ReadOnlyModelViewSet
):
    require_public_schema = True
    queryset = SubscriptionPlanHistory.objects.select_related(
        "tenant", "subscription", "previous_plan", "new_plan", "changed_by"
    ).all()
    serializer_class = SubscriptionPlanHistorySerializer
    permission_classes = [IsSaaSAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        tenant_id = self.request.query_params.get("tenant_id")
        subscription_id = self.request.query_params.get("subscription_id")

        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)
        return queryset


class InvoiceViewSet(BillingSchemaGuardMixin, viewsets.ModelViewSet):
    require_public_schema = True
    queryset = Invoice.objects.all().order_by("-issued_date")
    serializer_class = InvoiceSerializer
    permission_classes = [IsSaaSAdminUser]

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """
        Generates and downloads a professional PDF invoice.
        """
        try:
            invoice = self.get_object()

            context = {
                "invoice": invoice,
                "platform_name": "Antigravity SaaS",
                "current_year": timezone.now().year,
            }

            filename = f"invoice_{str(invoice.invoice_id)[:12]}_{timezone.now().strftime('%Y%m%d')}.pdf"
            response = generate_pdf_response("reports/invoice.html", context, filename)

            if response:
                record_audit_event(
                    action="billing.invoice_downloaded",
                    user=request.user,
                    request=request,
                    details={
                        "invoice_id": str(invoice.invoice_id),
                        "tenant_id": str(invoice.tenant_id),
                        "status": invoice.status,
                        "amount": str(invoice.amount),
                    },
                )
                return response
            return Response(
                {"error": "PDF engine failure"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class SaasGrowthAnalyticsView(APIView):
    """
    GET /billing/saas/analytics/growth/
    Returns platform-wide growth metrics computed from public schema data.
    """

    permission_classes = [IsSaaSAdminUser]

    def get(self, request):
        # ── Monthly new tenant signups (last 12 months) ──────────────────────
        twelve_months_ago = date.today().replace(day=1) - timedelta(days=365)
        monthly_signups = (
            Tenant.objects.filter(created_at__date__gte=twelve_months_ago)
            .exclude(schema_name="public")
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )
        signups_data = [
            {
                "month": row["month"].strftime("%Y-%m"),
                "label": row["month"].strftime("%b %Y"),
                "count": row["count"],
            }
            for row in monthly_signups
        ]

        # ── Plan distribution ─────────────────────────────────────────────────
        plan_dist_raw = (
            Subscription.objects.values("plan__name")
            .annotate(count=Count("subscription_id"))
            .order_by("-count")
        )
        plan_distribution = [
            {"plan": row["plan__name"] or "No Plan", "count": row["count"]}
            for row in plan_dist_raw
        ]

        # ── Status breakdown ──────────────────────────────────────────────────
        status_counts = Subscription.objects.values("status").annotate(
            count=Count("subscription_id")
        )
        status_breakdown = [
            {"status": r["status"], "count": r["count"]} for r in status_counts
        ]

        # ── Revenue by plan ───────────────────────────────────────────────────
        revenue_by_plan = (
            Invoice.objects.filter(status="paid")
            .values("subscription__plan__name")
            .annotate(total=Sum("amount"))
            .order_by("-total")
        )
        revenue_data = [
            {
                "plan": row["subscription__plan__name"] or "Unknown",
                "total": float(row["total"] or 0),
            }
            for row in revenue_by_plan
        ]

        # ── Billing cycle split ───────────────────────────────────────────────
        billing_cycle_data = Subscription.objects.values("billing_cycle").annotate(
            count=Count("subscription_id")
        )
        billing_cycles = [
            {"cycle": r["billing_cycle"], "count": r["count"]}
            for r in billing_cycle_data
        ]

        # ── Total counts ──────────────────────────────────────────────────────
        total_tenants = Tenant.objects.exclude(schema_name="public").count()
        total_revenue = float(
            Invoice.objects.filter(status="paid").aggregate(t=Sum("amount"))["t"] or 0
        )

        return Response(
            {
                "summary": {
                    "total_tenants": total_tenants,
                    "total_revenue": total_revenue,
                    "active_subscriptions": Subscription.objects.filter(
                        status="active"
                    ).count(),
                    "trial_subscriptions": Subscription.objects.filter(
                        status="trial"
                    ).count(),
                },
                "monthly_signups": signups_data,
                "plan_distribution": plan_distribution,
                "status_breakdown": status_breakdown,
                "revenue_by_plan": revenue_data,
                "billing_cycles": billing_cycles,
            }
        )


class SaasHealthMonitorView(APIView):
    """
    GET /billing/saas/analytics/health/
    Returns proactive health alerts for the platform.
    """

    permission_classes = [IsSaaSAdminUser]

    def get(self, request):
        today = date.today()
        alert_window = today + timedelta(days=7)

        # ── Trials expiring within 7 days ─────────────────────────────────────
        expiring_trials = (
            Subscription.objects.filter(
                status="trial", end_date__lte=alert_window, end_date__gte=today
            )
            .select_related("tenant", "plan")
            .order_by("end_date")
        )
        expiring_list = [
            {
                "tenant_id": str(s.tenant_id),
                "tenant_name": s.tenant.name,
                "plan": s.plan.name if s.plan else "No Plan",
                "end_date": str(s.end_date),
                "days_left": (s.end_date - today).days,
            }
            for s in expiring_trials
        ]

        # ── Past due subscriptions ────────────────────────────────────────────
        past_due = (
            Subscription.objects.filter(status="past_due")
            .select_related("tenant", "plan")
            .order_by("end_date")
        )
        past_due_list = [
            {
                "tenant_id": str(s.tenant_id),
                "tenant_name": s.tenant.name,
                "plan": s.plan.name if s.plan else "No Plan",
                "end_date": str(s.end_date) if s.end_date else None,
            }
            for s in past_due
        ]

        # ── Recent failed payments (last 30 days) ────────────────────────────
        since_30d = today - timedelta(days=30)
        failed_invoices = (
            Invoice.objects.filter(status="failed", issued_date__date__gte=since_30d)
            .select_related("tenant")
            .order_by("-issued_date")[:20]
        )
        failed_list = [
            {
                "invoice_id": str(inv.invoice_id),
                "tenant_name": inv.tenant.name if inv.tenant else "Unknown",
                "amount": float(inv.amount),
                "issued_date": str(inv.issued_date.date()),
            }
            for inv in failed_invoices
        ]

        # ── Suspended tenants ─────────────────────────────────────────────────
        suspended = (
            Tenant.objects.exclude(schema_name="public")
            .filter(status="suspended")
            .order_by("name")
        )
        suspended_list = [
            {
                "tenant_id": str(t.id),
                "tenant_name": t.name,
                "subdomain": t.subdomain or "",
            }
            for t in suspended
        ]

        # ── Alert counts summary ──────────────────────────────────────────────
        total_alerts = (
            len(expiring_list)
            + len(past_due_list)
            + len(failed_list)
            + len(suspended_list)
        )

        return Response(
            {
                "total_alerts": total_alerts,
                "expiring_trials": expiring_list,
                "past_due": past_due_list,
                "failed_payments": failed_list,
                "suspended_tenants": suspended_list,
            }
        )


__all__ = [
    "SubscriptionViewSet",
    "SubscriptionPlanViewSet",
    "SubscriptionPlanHistoryViewSet",
    "InvoiceViewSet",
    "SaasGrowthAnalyticsView",
    "SaasHealthMonitorView",
]
