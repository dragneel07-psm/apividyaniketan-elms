# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
from django.core.management import call_command

from core.models import Tenant


def fix_migration():
    print("🔧 Fixing tenant migration...")

    tenant = Tenant.objects.get(domain_url="localhost")
    print(f"Target Tenant: {tenant.name}")

    # Configure DB
    if tenant.db_alias not in settings.DATABASES:
        new_db_config = settings.DATABASES["default"].copy()
        new_db_config["NAME"] = settings.BASE_DIR / tenant.db_name
        settings.DATABASES[tenant.db_alias] = new_db_config

    tenant_apps = [
        "academic",
        "ai_engine",
        "billing",
        "notifications",
        "library",
        "reports",
        "users",
    ]

    for app in tenant_apps:
        print(f"Running fake migration for {app} (ALL) on {tenant.db_alias}...")
        try:
            call_command("migrate", app, fake=True, database=tenant.db_alias)
            print(f"✅ Fake ALL {app} migrations successful")
        except Exception as e:
            print(f"⚠️ Failed to fake {app}: {e}")

    print("Resuming normal migration...")
    try:
        call_command("migrate", database=tenant.db_alias)
        print("✅ Remaining migrations applied")
    except Exception as e:
        print(f"❌ Migration failed: {e}")


if __name__ == "__main__":
    fix_migration()
