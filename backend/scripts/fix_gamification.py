# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django
from django.conf import settings
from django.core.management import call_command
from django.db import connections

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.middleware.tenant import _thread_locals
from core.models.tenant import Tenant


def fix_gamification():
    tenant = Tenant.objects.get(subdomain="demo")
    print(f"Using Tenant: {tenant.name} ({tenant.db_alias})")

    # Configure Tenant DB in settings
    if tenant.db_alias not in settings.DATABASES:
        new_db_config = settings.DATABASES["default"].copy()
        new_db_config["NAME"] = settings.BASE_DIR / tenant.db_name
        settings.DATABASES[tenant.db_alias] = new_db_config
        print(f"configured DB: {tenant.db_alias}")

    # Set thread context for Router
    _thread_locals.tenant = tenant
    _thread_locals.db_alias = tenant.db_alias

    try:
        print("Build Zero...")
        call_command(
            "migrate",
            "gamification",
            "zero",
            database=tenant.db_alias,
            interactive=False,
        )
        print("Zero Complete.")

        print("Build Initial...")
        call_command(
            "migrate", "gamification", database=tenant.db_alias, interactive=False
        )
        print("Initial Complete.")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    fix_gamification()
