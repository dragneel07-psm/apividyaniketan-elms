#!/usr/bin/env python3
# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

import os
import sys

import django

# Add the project directory to the path
sys.path.insert(0, "/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend")

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
from django.core.management import call_command

print("=" * 60)
print("RUNNING LIBRARY MIGRATIONS FOR TENANT DATABASE")
print("=" * 60)

# Run the migration
try:
    print("\nMigrating library app to tenant_pramod database...")
    call_command("migrate", "library", database="tenant_pramod", verbosity=2)
    print("\n✅ SUCCESS! Library tables created in tenant database.")

    # Verify tables were created
    from django.db import connections

    cursor = connections["tenant_pramod"].cursor()
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library%';"
    )
    tables = cursor.fetchall()

    if tables:
        print("\n📋 Library tables in database:")
        for table in tables:
            print(f"   ✓ {table[0]}")
    else:
        print("\n⚠️  Warning: No library tables found after migration!")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("MIGRATION COMPLETE - Please refresh your browser")
print("=" * 60)
