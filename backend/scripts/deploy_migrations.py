# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django
from django.conf import settings
from django.core.management import call_command

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models.tenant import Tenant


def deploy_all_migrations():
    """
    Automates migrations for the default database and all active tenant databases.
    Used during CI/CD deployment phase.
    """
    print("🚀 Starting Global Migration Deployment...")

    # 1. Migrate Shared Database (Default)
    print("\n📦 Migrating Shared Database (default)...")
    try:
        call_command("migrate", database="default")
        print("✅ Shared database migrated successfully.")
    except Exception as e:
        print(f"❌ Shared database migration failed: {e}")
        sys.exit(1)

    # 2. Migrate All Tenants
    tenants = Tenant.objects.filter(status="active")
    print(f"\n👥 Found {tenants.count()} active tenants to migrate.")

    for tenant in tenants:
        print(f"\n🏢 Migrating Tenant: {tenant.name} ({tenant.subdomain})")
        try:
            # Ensure DB is registered in settings if it's dynamic
            if tenant.db_alias not in settings.DATABASES:
                db_config = settings.DATABASES["default"].copy()
                # For SQLite (dev/staging simulated)
                if "sqlite3" in db_config["ENGINE"]:
                    db_path = settings.BASE_DIR / tenant.db_name
                    db_config["NAME"] = str(db_path)
                # For Postgres (production/staging) - assumes db_name is the actual DB name
                else:
                    db_config["NAME"] = tenant.db_name

                settings.DATABASES[tenant.db_alias] = db_config
                print(f"🔗 Registered DB alias: {tenant.db_alias}")

            call_command("migrate", database=tenant.db_alias)
            print(f"✅ Migrated {tenant.subdomain} successfully.")
        except Exception as e:
            print(f"❌ Migration failed for {tenant.subdomain}: {e}")
            # We continue for other tenants, but you might want to exit if staging
            if os.environ.get("CI"):
                print("⚠️ CI environment detected. Proceeding with caution...")

    print("\n✨ Global Migration Deployment Finished.")


if __name__ == "__main__":
    deploy_all_migrations()
