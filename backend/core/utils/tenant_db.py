# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os

from django.conf import settings
from django.core.management import call_command
from django.db import connections

from ..models.tenant import Tenant


def get_tenant_db_alias(tenant_name):
    """Return a sane db alias for a tenant."""
    return f"tenant_{tenant_name.lower().replace(' ', '_')}"


def provision_tenant_db(tenant):
    """
    Creates the database file (for SQLite) and runs migrations.
    """
    db_name = tenant.db_name
    db_alias = tenant.db_alias

    # 1. Register DB in connection handler dynamically
    new_db_config = settings.DATABASES["default"].copy()
    new_db_config["NAME"] = settings.BASE_DIR / db_name

    settings.DATABASES[db_alias] = new_db_config
    connections.databases[db_alias] = new_db_config

    # 2. Run Migrations
    print(f"Provisioning database {db_alias} ({db_name})...")

    # We must ensure the file exists or is created by SQLite
    # Call migrate on specific database
    # Note: call_command('migrate', database=db_alias) works!
    try:
        call_command("migrate", database=db_alias, interactive=False)
        print(f"Successfully migrated {db_alias}")
    except Exception as e:
        print(f"Error migrating {db_alias}: {e}")
        raise e
