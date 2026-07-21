# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django

# Add current directory to path so we can import config
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
from django.core.management import call_command

from core.models.tenant import Tenant

try:
    print("Finding tenant 'demo'...", flush=True)
    # Using 'demo' as established in previous steps
    tenant = Tenant.objects.get(subdomain="demo")
    print(f"Found tenant: {tenant.name}, db: {tenant.db_alias}", flush=True)

    if tenant.db_alias not in settings.DATABASES:
        print(f"Adding {tenant.db_alias} to DATABASES...", flush=True)
        db_config = settings.DATABASES["default"].copy()
        db_config["NAME"] = settings.BASE_DIR / tenant.db_name
        settings.DATABASES[tenant.db_alias] = db_config

    print(f"Running migrate for 'academic' on {tenant.db_alias}...", flush=True)
    call_command("migrate", "academic", database=tenant.db_alias)
    print("Migration finished successfully!", flush=True)

except Exception as e:
    print(f"Error: {e}", flush=True)
    import traceback

    traceback.print_exc()
