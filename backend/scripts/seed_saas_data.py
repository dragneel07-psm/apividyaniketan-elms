# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import random
from datetime import datetime, timedelta
from decimal import Decimal

import django
from django.utils import timezone

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")
django.setup()

from django.conf import settings

from ai_engine.models import AIInteractionLog
from billing.models import Invoice, Subscription, SubscriptionPlan
from billing.plan_defaults import upsert_default_plans
from core.models import Tenant


def seed_saas_intelligence():
    print("🚀 Initializing SaaS Platform Intelligence Seeding...")
    # 1. Ensure Subscription Plans exist
    seed_result = upsert_default_plans()
    fx_mode = "fallback" if seed_result["used_fallback"] else "live"
    print(
        f"💹 USD->NPR rate ({fx_mode}): {seed_result['rate_used']} | "
        f"plans created: {seed_result['created']}, updated: {seed_result['updated']}"
    )

    all_plans = list(SubscriptionPlan.objects.all())
    tenants = Tenant.objects.all()

    if not tenants:
        print("❌ No tenants found. Please create at least one tenant first.")
        return

    for tenant in tenants:
        print(f"📦 Seeding data for tenant: {tenant.name} ({tenant.subdomain})")

        # 2. Ensure Subscription exists
        sub, _ = Subscription.objects.get_or_create(
            tenant=tenant,
            defaults={
                "plan": random.choice(all_plans),
                "status": "active",
                "billing_cycle": "monthly",
            },
        )

        # 3. Seed Revenue (Invoices) - Last 6 months
        Invoice.objects.filter(tenant=tenant).delete()  # Reset for clean demo
        for i in range(12):  # 12 invoices distributed over last 6 months
            days_ago = i * 15
            issued_date = timezone.now() - timedelta(days=days_ago)
            status = random.choice(["paid", "paid", "paid", "pending"])

            Invoice.objects.create(
                tenant=tenant,
                subscription=sub,
                amount=Decimal(random.randint(500, 2500)),
                currency="NPR",
                status=status,
                issued_date=issued_date,
                paid_date=issued_date if status == "paid" else None,
            )

        # 4. Seed AI Logs - Direct DB entry if SHARED or Dynamic if Tenant-specific
        db_alias = tenant.db_alias
        if db_alias not in settings.DATABASES:
            # Register on the fly for script
            new_db_config = settings.DATABASES["default"].copy()
            new_db_config["NAME"] = settings.BASE_DIR / tenant.db_name
            settings.DATABASES[db_alias] = new_db_config

        print(f"🤖 Generating AI logs for {tenant.name} in {db_alias}...")

        # Clear existing logs in tenant DB
        AIInteractionLog.objects.using(db_alias).all().delete()

        features = ["Tutor Chat", "Predictive Analytics", "Study Planner"]
        for _ in range(50):  # 50 logs per tenant
            feature = random.choice(features)
            tokens = random.randint(500, 5000)
            timestamp = timezone.now() - timedelta(days=random.randint(0, 30))

            AIInteractionLog.objects.using(db_alias).create(
                tenant=tenant,
                feature_used=feature,
                total_tokens=tokens,
                cost_estimated=Decimal(tokens * 0.00002),
                timestamp=timestamp,
            )

    print("✅ SaaS Intelligence Seeding Complete! Dashboard is now live.")


if __name__ == "__main__":
    seed_saas_intelligence()
