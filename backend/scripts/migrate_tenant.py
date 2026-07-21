# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django
from django.conf import settings
from django.core.management import call_command

from core.models.tenant import Tenant

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()


def migrate_tenant(subdomain="demo"):
    print(f"🚀 Migrating Tenant: {subdomain}")
    try:
        tenant = Tenant.objects.get(subdomain=subdomain)

        # Inject DB config
        if tenant.db_alias not in settings.DATABASES:
            db_config = settings.DATABASES["default"].copy()
            db_path = settings.BASE_DIR / tenant.db_name
            db_config["NAME"] = db_path
            settings.DATABASES[tenant.db_alias] = db_config
            print(f"✅ Configured DB: {tenant.db_alias} -> {db_path}")

        call_command("migrate", database=tenant.db_alias)
        print(f"✅ Migration Complete for {subdomain}")

    except Tenant.DoesNotExist:
        print(f"❌ Tenant '{subdomain}' not found in Default DB.")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    migrate_tenant()
