# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys
import traceback

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
try:
    django.setup()
    print("Django setup OK")

    from django.conf import settings

    print(f"BASE_DIR: {settings.BASE_DIR}")
    print(f"DATABASES: {settings.DATABASES.keys()}")

    from core.models.tenant import Tenant

    tenants = list(Tenant.objects.all())
    print(f"Tenants found: {len(tenants)}")
    for t in tenants:
        print(f" - {t.name} ({t.db_name})")

except Exception as e:
    traceback.print_exc()
