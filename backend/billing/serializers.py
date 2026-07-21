# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from core.utils.audit import record_audit_event
from core.utils.plan_enforcement import (
    record_subscription_plan_history,
    sync_subscription_limits_with_plan,
    sync_tenant_with_plan,
)

from .models import (
    Expense,
    FeeStructure,
    Invoice,
    Payment,
    StudentFee,
    Subscription,
    SubscriptionPlan,
    SubscriptionPlanHistory,
)
from .models_school import FeeHead


def _resolve_tenant(value, fallback=None):
    return value if value is not None else fallback


def _student_tenant(student):
    if not student:
        return None
    user = getattr(student, "user", None)
    return getattr(user, "tenant", None) if user else None


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        monthly = attrs.get("price_monthly", getattr(instance, "price_monthly", None))
        yearly = attrs.get("price_yearly", getattr(instance, "price_yearly", None))

        if monthly is None or yearly is None:
            return attrs

        monthly_dec = Decimal(str(monthly))
        yearly_dec = Decimal(str(yearly))
        if monthly_dec <= 0:
            raise serializers.ValidationError(
                {"price_monthly": "Monthly price must be greater than zero."}
            )

        annual_monthly = monthly_dec * Decimal("12")
        min_benefit_percent = Decimal("50")
        min_yearly_discount = annual_monthly * (min_benefit_percent / Decimal("100"))
        max_yearly_price = annual_monthly - min_yearly_discount

        if yearly_dec > max_yearly_price:
            raise serializers.ValidationError(
                {
                    "price_yearly": f"Yearly price must provide at least {int(min_benefit_percent)}% benefit over monthly billing."
                }
            )

        return attrs

    class Meta:
        model = SubscriptionPlan
        fields = "__all__"


class SubscriptionSerializer(serializers.ModelSerializer):
    # Optional: Embed plan details or just ID
    plan_details = SubscriptionPlanSerializer(source="plan", read_only=True)

    class Meta:
        model = Subscription
        fields = "__all__"

    def create(self, validated_data):
        request = self.context.get("request")
        subscription = super().create(validated_data)
        if subscription.plan:
            sync_subscription_limits_with_plan(
                subscription, plan=subscription.plan, save=True
            )
            sync_tenant_with_plan(
                subscription.tenant, plan=subscription.plan, save=True
            )
        record_subscription_plan_history(
            subscription,
            previous_plan=None,
            previous_status="",
            previous_billing_cycle="",
            reason="Subscription created",
            changed_by=getattr(request, "user", None),
        )
        record_audit_event(
            action="billing.subscription_created",
            user=getattr(request, "user", None),
            request=request,
            details={
                "subscription_id": str(subscription.subscription_id),
                "tenant_id": str(subscription.tenant_id),
                "plan_id": str(subscription.plan_id) if subscription.plan_id else None,
                "status": subscription.status,
                "billing_cycle": subscription.billing_cycle,
            },
        )
        return subscription

    def update(self, instance, validated_data):
        request = self.context.get("request")
        previous_plan = instance.plan
        previous_status = instance.status
        previous_billing_cycle = instance.billing_cycle

        subscription = super().update(instance, validated_data)
        if subscription.plan:
            sync_subscription_limits_with_plan(
                subscription, plan=subscription.plan, save=True
            )
            sync_tenant_with_plan(
                subscription.tenant, plan=subscription.plan, save=True
            )

        should_log = (
            previous_plan != subscription.plan
            or previous_status != subscription.status
            or previous_billing_cycle != subscription.billing_cycle
        )
        if should_log:
            reason = request.data.get("reason") if request is not None else None
            record_subscription_plan_history(
                subscription,
                previous_plan=previous_plan,
                previous_status=previous_status,
                previous_billing_cycle=previous_billing_cycle,
                reason=reason or "Subscription updated",
                changed_by=getattr(request, "user", None),
            )
            record_audit_event(
                action="billing.subscription_changed",
                user=getattr(request, "user", None),
                request=request,
                details={
                    "subscription_id": str(subscription.subscription_id),
                    "tenant_id": str(subscription.tenant_id),
                    "before": {
                        "plan_id": (
                            str(previous_plan.plan_id) if previous_plan else None
                        ),
                        "status": previous_status,
                        "billing_cycle": previous_billing_cycle,
                    },
                    "after": {
                        "plan_id": (
                            str(subscription.plan_id) if subscription.plan_id else None
                        ),
                        "status": subscription.status,
                        "billing_cycle": subscription.billing_cycle,
                    },
                    "reason": reason or "Subscription updated",
                },
            )
        return subscription


class SubscriptionPlanHistorySerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlanHistory
        fields = "__all__"

    def get_changed_by_name(self, obj):
        if not obj.changed_by:
            return None
        full_name = f"{obj.changed_by.first_name} {obj.changed_by.last_name}".strip()
        return full_name or obj.changed_by.email


class InvoiceSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    plan_name = serializers.CharField(
        source="subscription.plan.name", read_only=True, default="N/A"
    )

    class Meta:
        model = Invoice
        fields = "__all__"


# ==========================================
# SCHOOL FINANCE SERIALIZERS
# ==========================================


class FeeHeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeHead
        fields = [
            "head_id",
            "fee_structure",
            "name",
            "amount",
            "sort_order",
            "coa_account",
            "created_at",
        ]
        read_only_fields = ["head_id", "tenant", "created_at"]


class FeeStructureSerializer(serializers.ModelSerializer):
    class_name = serializers.SerializerMethodField()
    heads = FeeHeadSerializer(many=True, read_only=True)
    heads_total = serializers.SerializerMethodField()

    def get_class_name(self, obj):
        cls = getattr(obj, "academic_class", None)
        return str(cls) if cls else ""

    def get_heads_total(self, obj):
        try:
            return float(sum(Decimal(str(h.amount or 0)) for h in obj.heads.all()))
        except Exception:
            return 0.0

    class Meta:
        model = FeeStructure
        fields = "__all__"
        read_only_fields = ["tenant"]


class StudentFeeSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    def get_student_name(self, obj):
        try:
            u = obj.student.user
            return f"{u.first_name} {u.last_name}".strip() or u.username
        except Exception:
            return ""

    fee_name = serializers.CharField(source="fee_structure.name", read_only=True)
    balance = serializers.SerializerMethodField()

    class Meta:
        model = StudentFee
        fields = "__all__"
        read_only_fields = ["tenant"]

    def get_balance(self, obj):
        try:
            amount_due = Decimal(str(obj.amount_due or "0"))
            amount_paid = Decimal(str(obj.amount_paid or "0"))
            return float(amount_due - amount_paid)
        except (InvalidOperation, TypeError, ValueError):
            return 0.0

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        tenant = _resolve_tenant(attrs.get("tenant"), getattr(instance, "tenant", None))
        student = _resolve_tenant(
            attrs.get("student"), getattr(instance, "student", None)
        )
        fee_structure = _resolve_tenant(
            attrs.get("fee_structure"), getattr(instance, "fee_structure", None)
        )

        if tenant and student:
            student_tenant = _student_tenant(student)
            if student_tenant and student_tenant != tenant:
                raise serializers.ValidationError(
                    {"student": "Student does not belong to the selected tenant."}
                )

        if (
            tenant
            and fee_structure
            and getattr(fee_structure, "tenant", None) != tenant
        ):
            raise serializers.ValidationError(
                {
                    "fee_structure": "Fee structure does not belong to the selected tenant."
                }
            )

        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="student.user.get_full_name", read_only=True
    )
    recorded_by_name = serializers.CharField(
        source="recorded_by.get_full_name", read_only=True
    )

    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ["tenant", "recorded_by", "payment_date"]

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        tenant = _resolve_tenant(attrs.get("tenant"), getattr(instance, "tenant", None))
        student = _resolve_tenant(
            attrs.get("student"), getattr(instance, "student", None)
        )
        student_fee = _resolve_tenant(
            attrs.get("student_fee"), getattr(instance, "student_fee", None)
        )

        if tenant and student:
            student_tenant = _student_tenant(student)
            if student_tenant and student_tenant != tenant:
                raise serializers.ValidationError(
                    {"student": "Student does not belong to the authenticated tenant."}
                )

        if student_fee:
            fee_tenant = getattr(student_fee, "tenant", None)
            if tenant and fee_tenant and fee_tenant != tenant:
                raise serializers.ValidationError(
                    {
                        "student_fee": "Student fee does not belong to the authenticated tenant."
                    }
                )
            if (
                student
                and getattr(student_fee, "student", None)
                and student_fee.student != student
            ):
                raise serializers.ValidationError(
                    {
                        "student_fee": "Student fee record does not belong to the selected student."
                    }
                )

        return attrs


class ExpenseSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(
        source="recorded_by.get_full_name", read_only=True
    )

    class Meta:
        model = Expense
        fields = "__all__"
        read_only_fields = ["tenant", "recorded_by"]
