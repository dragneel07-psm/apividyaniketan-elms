# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models.tenant import Tenant

from .models_base import SchemaScopedBillingModel


class SubscriptionPlan(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "public"
    plan_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, default="USD")

    student_limit = models.IntegerField(default=100)
    teacher_limit = models.IntegerField(default=10)
    storage_limit_gb = models.IntegerField(default=10)
    ai_token_limit = models.IntegerField(default=50000)

    has_ai_tutor = models.BooleanField(default=False)
    has_ai_eval = models.BooleanField(default=False)
    has_parent_portal = models.BooleanField(default=False)
    has_analytics = models.BooleanField(default=False)
    has_career_guidance = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Subscription(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "public"
    subscription_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.OneToOneField(
        Tenant, on_delete=models.CASCADE, related_name="subscription"
    )
    plan = models.ForeignKey(
        SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True
    )

    STATUS_CHOICES = (
        ("active", "Active"),
        ("past_due", "Past Due"),
        ("cancelled", "Cancelled"),
        ("trial", "Trial"),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    billing_cycle = models.CharField(
        max_length=20,
        choices=(("monthly", "Monthly"), ("yearly", "Yearly")),
        default="monthly",
    )

    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)

    student_limit = models.IntegerField(default=100)
    storage_limit_gb = models.IntegerField(default=10)
    ai_token_limit = models.IntegerField(default=50000)

    def __str__(self):
        return f"{self.tenant.name} - {self.plan.name if self.plan else 'No Plan'}"


class SubscriptionPlanHistory(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "public"
    history_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="subscription_plan_history"
    )
    subscription = models.ForeignKey(
        Subscription, on_delete=models.CASCADE, related_name="plan_history"
    )

    previous_plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="history_previous_plan",
    )
    new_plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="history_new_plan",
    )

    previous_plan_name = models.CharField(max_length=100, blank=True, default="")
    new_plan_name = models.CharField(max_length=100, blank=True, default="")
    previous_plan_snapshot = models.JSONField(default=dict, blank=True)
    new_plan_snapshot = models.JSONField(default=dict, blank=True)

    previous_status = models.CharField(max_length=20, blank=True, default="")
    new_status = models.CharField(max_length=20, blank=True, default="")
    previous_billing_cycle = models.CharField(max_length=20, blank=True, default="")
    new_billing_cycle = models.CharField(max_length=20, blank=True, default="")

    reason = models.TextField(blank=True, null=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscription_plan_changes",
    )
    effective_date = models.DateField(default=timezone.now)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.tenant.name}: {self.previous_plan_name or 'None'} -> {self.new_plan_name or 'None'}"


class Invoice(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "public"
    invoice_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="invoices"
    )
    subscription = models.ForeignKey(
        Subscription, on_delete=models.SET_NULL, null=True, blank=True
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="USD")
    status = models.CharField(
        max_length=20,
        choices=(("paid", "Paid"), ("pending", "Pending"), ("failed", "Failed")),
        default="pending",
    )
    issued_date = models.DateTimeField(auto_now_add=True)
    paid_date = models.DateTimeField(null=True, blank=True)
    pdf_url = models.URLField(null=True, blank=True)

    def __str__(self):
        return f"INV-{str(self.invoice_id)[:8]} - {self.tenant.name}"
