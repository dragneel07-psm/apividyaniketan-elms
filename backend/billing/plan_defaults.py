# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import json
from decimal import ROUND_HALF_UP, Decimal
from typing import Any
from urllib.request import urlopen

from .models import SubscriptionPlan

MARKET_FX_ENDPOINT = "https://open.er-api.com/v6/latest/USD"
DEFAULT_USD_TO_NPR = Decimal("132.00")
MIN_YEARLY_BENEFIT_PERCENT = Decimal("50")


def fetch_usd_to_npr_rate() -> tuple[Decimal, bool]:
    """
    Returns (rate, used_fallback).
    """
    try:
        with urlopen(MARKET_FX_ENDPOINT, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
        rate = payload.get("rates", {}).get("NPR")
        if rate is None:
            raise ValueError("NPR rate missing in market response")
        return Decimal(str(rate)), False
    except Exception:
        return DEFAULT_USD_TO_NPR, True


def to_nearest_hundred(amount: Decimal) -> Decimal:
    return (amount / Decimal("100")).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    ) * Decimal("100")


def derive_market_prices(
    base_usd_monthly: Decimal, usd_to_npr: Decimal
) -> tuple[Decimal, Decimal]:
    monthly_npr = to_nearest_hundred(base_usd_monthly * usd_to_npr)
    yearly_npr = to_nearest_hundred(
        monthly_npr
        * Decimal("12")
        * (Decimal("1") - (MIN_YEARLY_BENEFIT_PERCENT / Decimal("100")))
    )
    return monthly_npr, yearly_npr


def build_default_plan_payloads(usd_to_npr: Decimal) -> list[dict[str, Any]]:
    basic_monthly, basic_yearly = derive_market_prices(Decimal("39"), usd_to_npr)
    standard_monthly, standard_yearly = derive_market_prices(Decimal("99"), usd_to_npr)
    premium_monthly, premium_yearly = derive_market_prices(Decimal("199"), usd_to_npr)
    enterprise_monthly, enterprise_yearly = derive_market_prices(
        Decimal("399"), usd_to_npr
    )

    return [
        {
            "name": "Basic",
            "description": "For small schools starting digital learning operations.",
            "price_monthly": basic_monthly,
            "price_yearly": basic_yearly,
            "currency": "NPR",
            "student_limit": 300,
            "teacher_limit": 20,
            "storage_limit_gb": 50,
            "ai_token_limit": 100000,
            "has_ai_tutor": False,
            "has_ai_eval": False,
            "has_parent_portal": True,
            "has_analytics": False,
            "has_career_guidance": False,
            "is_active": True,
        },
        {
            "name": "Standard",
            "description": "Balanced package for growing schools with AI support and analytics.",
            "price_monthly": standard_monthly,
            "price_yearly": standard_yearly,
            "currency": "NPR",
            "student_limit": 1000,
            "teacher_limit": 80,
            "storage_limit_gb": 200,
            "ai_token_limit": 500000,
            "has_ai_tutor": True,
            "has_ai_eval": False,
            "has_parent_portal": True,
            "has_analytics": True,
            "has_career_guidance": False,
            "is_active": True,
        },
        {
            "name": "Premium",
            "description": "Advanced AI and analytics for large institutions with higher scale.",
            "price_monthly": premium_monthly,
            "price_yearly": premium_yearly,
            "currency": "NPR",
            "student_limit": 3000,
            "teacher_limit": 250,
            "storage_limit_gb": 1024,
            "ai_token_limit": 2000000,
            "has_ai_tutor": True,
            "has_ai_eval": True,
            "has_parent_portal": True,
            "has_analytics": True,
            "has_career_guidance": True,
            "is_active": True,
        },
        {
            "name": "Enterprise",
            "description": "High-scale deployment for school groups and universities.",
            "price_monthly": enterprise_monthly,
            "price_yearly": enterprise_yearly,
            "currency": "NPR",
            "student_limit": 10000,
            "teacher_limit": 800,
            "storage_limit_gb": 3072,
            "ai_token_limit": 5000000,
            "has_ai_tutor": True,
            "has_ai_eval": True,
            "has_parent_portal": True,
            "has_analytics": True,
            "has_career_guidance": True,
            "is_active": True,
        },
    ]


def upsert_default_plans() -> dict[str, Any]:
    usd_to_npr, used_fallback = fetch_usd_to_npr_rate()
    payloads = build_default_plan_payloads(usd_to_npr)

    created_count = 0
    updated_count = 0
    seeded_plans: list[SubscriptionPlan] = []

    for plan_data in payloads:
        plan, created = SubscriptionPlan.objects.update_or_create(
            name=plan_data["name"],
            defaults=plan_data,
        )
        seeded_plans.append(plan)
        if created:
            created_count += 1
        else:
            updated_count += 1

    return {
        "created": created_count,
        "updated": updated_count,
        "rate_used": str(usd_to_npr),
        "used_fallback": used_fallback,
        "plans": seeded_plans,
    }
