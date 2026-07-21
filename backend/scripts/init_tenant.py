# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models import Tenant


def init_tenant():
    print("🚀 Initializing Tenant...")

    tenant, created = Tenant.objects.get_or_create(
        subdomain="demo", name="Demo School", defaults={"status": "active"}
    )

    if created:
        print(f"✅ Created tenant: {tenant.name}")
    else:
        print(f"ℹ️ Tenant already exists: {tenant.name}")

    print("🎉 Tenant initialization complete.")


if __name__ == "__main__":
    init_tenant()
