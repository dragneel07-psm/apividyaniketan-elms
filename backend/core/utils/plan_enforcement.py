# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from typing import Any, Dict, Optional

from django.utils import timezone


def derive_tenant_type_from_plan(plan) -> str:
    if not plan:
        return "standard"

    name = (getattr(plan, "name", "") or "").strip().lower()
    if "enterprise" in name:
        return "enterprise"
    if "premium" in name:
        return "premium"
    if "standard" in name or "basic" in name or "starter" in name:
        return "standard"

    student_limit = int(getattr(plan, "student_limit", 0) or 0)
    if student_limit >= 3000:
        return "enterprise"
    if student_limit >= 1000:
        return "premium"
    return "standard"


def get_tenant_plan(tenant) -> Optional[Any]:
    if not tenant:
        return None

    try:
        # Accessing subscription via reverse OneToOne
        sub = getattr(tenant, "subscription", None)
    except Exception as e:
        import sys

        print(
            f"DEBUG: Error retrieving subscription for tenant {getattr(tenant, 'schema_name', 'unknown')}: {e}",
            file=sys.stderr,
        )
        # Missing reverse O2O (no subscription yet) or inconsistent tenant relation.
        return None

    if sub and getattr(sub, "plan", None):
        return sub.plan
    return None


def build_plan_entitled_features(plan) -> Dict[str, bool]:
    if not plan:
        return {
            "student_ai_chatbot": False,
            "student_gamification": True,
            "teacher_ai_grading": False,
            "teacher_reports": False,
            "parent_attendance": False,
            "parent_fees": False,
            "student_career_guidance": False,
            "projects": True,
        }

    has_ai_tutor = bool(getattr(plan, "has_ai_tutor", False))
    has_ai_eval = bool(getattr(plan, "has_ai_eval", False))
    has_parent_portal = bool(getattr(plan, "has_parent_portal", False))
    has_analytics = bool(getattr(plan, "has_analytics", False))
    has_career_guidance = bool(getattr(plan, "has_career_guidance", False))

    return {
        "student_ai_chatbot": has_ai_tutor,
        "student_gamification": True,
        "teacher_ai_grading": has_ai_eval,
        "teacher_reports": has_analytics,
        "parent_attendance": has_parent_portal,
        "parent_fees": has_parent_portal,
        "student_career_guidance": has_career_guidance,
        "projects": True,
    }


def compute_effective_features(plan, overrides) -> Dict[str, bool]:
    """Plan-entitled features overlaid with per-tenant overrides.

    Overrides win on a per-key basis. Pass `None` or `{}` for overrides
    to get the plan baseline unchanged. Non-bool override values are
    coerced to bool so the dict is consumable by simple truthy checks.
    """
    effective = dict(build_plan_entitled_features(plan))
    if not overrides:
        return effective
    for key, value in overrides.items():
        effective[key] = bool(value)
    return effective


def sync_tenant_with_plan(tenant, plan=None, save: bool = True):
    active_plan = plan or get_tenant_plan(tenant)
    tenant.type = derive_tenant_type_from_plan(active_plan)
    tenant.features = compute_effective_features(
        active_plan, getattr(tenant, "feature_overrides", None)
    )
    if save:
        tenant.save(update_fields=["type", "features"])
    return tenant


def sync_subscription_limits_with_plan(subscription, plan=None, save: bool = True):
    active_plan = plan or getattr(subscription, "plan", None)
    if not active_plan:
        return subscription

    subscription.student_limit = int(getattr(active_plan, "student_limit", 0) or 0)
    subscription.storage_limit_gb = int(
        getattr(active_plan, "storage_limit_gb", 0) or 0
    )
    subscription.ai_token_limit = int(getattr(active_plan, "ai_token_limit", 0) or 0)
    if save:
        subscription.save(
            update_fields=["student_limit", "storage_limit_gb", "ai_token_limit"]
        )
    return subscription


def build_plan_snapshot(plan) -> Dict[str, Any]:
    if not plan:
        return {}

    return {
        "plan_id": str(getattr(plan, "plan_id", "")),
        "name": getattr(plan, "name", ""),
        "description": getattr(plan, "description", ""),
        "currency": getattr(plan, "currency", ""),
        "price_monthly": float(getattr(plan, "price_monthly", 0) or 0),
        "price_yearly": float(getattr(plan, "price_yearly", 0) or 0),
        "student_limit": int(getattr(plan, "student_limit", 0) or 0),
        "teacher_limit": int(getattr(plan, "teacher_limit", 0) or 0),
        "storage_limit_gb": int(getattr(plan, "storage_limit_gb", 0) or 0),
        "ai_token_limit": int(getattr(plan, "ai_token_limit", 0) or 0),
        "has_ai_tutor": bool(getattr(plan, "has_ai_tutor", False)),
        "has_ai_eval": bool(getattr(plan, "has_ai_eval", False)),
        "has_parent_portal": bool(getattr(plan, "has_parent_portal", False)),
        "has_analytics": bool(getattr(plan, "has_analytics", False)),
        "has_career_guidance": bool(getattr(plan, "has_career_guidance", False)),
        "is_active": bool(getattr(plan, "is_active", False)),
    }


def record_subscription_plan_history(
    subscription,
    *,
    previous_plan=None,
    previous_status: str = "",
    previous_billing_cycle: str = "",
    reason: str = "",
    changed_by=None,
    effective_date=None,
    previous_plan_snapshot: Optional[Dict[str, Any]] = None,
    new_plan_snapshot: Optional[Dict[str, Any]] = None,
):
    from billing.models_saas import SubscriptionPlanHistory

    new_plan = getattr(subscription, "plan", None)
    SubscriptionPlanHistory.objects.create(
        tenant=subscription.tenant,
        subscription=subscription,
        previous_plan=previous_plan,
        new_plan=new_plan,
        previous_plan_name=(getattr(previous_plan, "name", "") or ""),
        new_plan_name=(getattr(new_plan, "name", "") or ""),
        previous_plan_snapshot=(
            previous_plan_snapshot
            if previous_plan_snapshot is not None
            else build_plan_snapshot(previous_plan)
        ),
        new_plan_snapshot=(
            new_plan_snapshot
            if new_plan_snapshot is not None
            else build_plan_snapshot(new_plan)
        ),
        previous_status=previous_status or "",
        new_status=getattr(subscription, "status", "") or "",
        previous_billing_cycle=previous_billing_cycle or "",
        new_billing_cycle=getattr(subscription, "billing_cycle", "") or "",
        reason=reason or "",
        changed_by=(
            changed_by if getattr(changed_by, "is_authenticated", False) else None
        ),
        effective_date=effective_date or timezone.now().date(),
    )
