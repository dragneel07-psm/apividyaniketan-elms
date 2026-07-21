# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os

import django
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import authenticate

from core.middleware.tenant import _thread_locals
from core.models import Tenant
from users.models import UserAccount

try:
    # 1. Setup Tenant Context
    t = Tenant.objects.get(subdomain="demo")
    print(f"✅ Found Tenant: {t.name} ({t.db_alias})")

    # Manually adding DB to settings if not present (simulate middleware)
    if t.db_alias not in settings.DATABASES:
        new_db_config = settings.DATABASES["default"].copy()
        new_db_config["NAME"] = (
            settings.BASE_DIR / "school_demo.sqlite3"
        )  # Hardcoded based on knowledge
        settings.DATABASES[t.db_alias] = new_db_config
        print(f"✅ Configured DB: {t.db_alias}")

    _thread_locals.tenant = t
    _thread_locals.db_alias = t.db_alias

    print(
        f"CONTEXT: Tenant={getattr(_thread_locals, 'tenant')}, DB={getattr(_thread_locals, 'db_alias')}"
    )

    # 2. Check User Existence
    print(f"--- Listing Users in {t.db_alias} ---")
    users = UserAccount.objects.all()

    print(f"\n--- Listing Users in DEFAULT (Public) ---")
    from django.db import connections

    # We need to manually access default DB if we are currently in tenant context
    # But UserAccount is shared? If shared, objects.all() might return public if no tenant?
    # TenantMiddleware sets search_path.

    # Let's verify what 'default' DB has.
    users_default = UserAccount.objects.using("default").all()
    for u in users_default:
        print(f"DefaultDB User: {u.email} | Role: {u.role}")

    try:
        user = UserAccount.objects.get(email="student_test@demo.com")
        print(f"✅ User Found: {user.email} (ID: {user.user_id})")
        print(f"   Password Hash: {user.password}")
        print(f"   Is Active: {user.is_active}")

        is_valid = user.check_password("student123")
        print(f"✅ Password 'student123' valid? {is_valid}")

    except UserAccount.DoesNotExist:
        print("❌ User NOT found in tenant DB")
        # Check default DB just in case
        try:
            from django.db import connections

            with connections["default"].cursor() as cursor:
                pass  # Just ensuring default is touched
            u2 = UserAccount.objects.using("default").get(email="teacher_test@demo.com")
            print("⚠️ User found in DEFAULT DB instead!")
        except:
            print("❌ User not in default DB either")

    # 3. Test Authentication
    print("--- Authenticating ---")
    # We need to mock request for authenticate usually, or just check check_password
    if "user" in locals():
        is_valid = user.check_password("teacher123")
        print(f"✅ Password 'teacher123' valid? {is_valid}")

except Exception as e:
    import traceback

    traceback.print_exc()
