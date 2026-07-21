# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os

import django
from django.conf import settings
from django.core.management import call_command

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

# Manually configure the tenant database
# Based on inspection, we believe the tenant uses 'school_demo.sqlite3'
# We will use an alias 'tenant_db' for this operation
tenant_alias = "tenant_db"
db_name = "school_demo.sqlite3"

# Update settings (works for new connections)
settings.DATABASES[tenant_alias] = settings.DATABASES["default"].copy()
settings.DATABASES[tenant_alias]["NAME"] = settings.BASE_DIR / db_name

print(f"🚀 Migrating 'ai_engine' to '{db_name}' (alias: {tenant_alias})...")

try:
    call_command("migrate", "ai_engine", database=tenant_alias)
    print("✅ Migration successful!")
except Exception as e:
    print(f"❌ Migration failed: {e}")
