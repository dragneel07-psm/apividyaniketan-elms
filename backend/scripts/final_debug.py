# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

import os
import sys

import django

# Add the project root to the path
sys.path.append(os.getcwd())

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from academic.models import Teacher
from core.models.tenant import Tenant
from users.models import UserAccount


def final_debug():
    tenant = Tenant.objects.get(subdomain="demo")
    db_alias = tenant.db_alias
    email = "teacher@demo.com"

    print(f"Tenant: {tenant.name}, DB Alias: {db_alias}")

    try:
        user = UserAccount.objects.using(db_alias).get(email=email)
        print(f"✅ Found User in {db_alias}: {user.username} (ID: {user.pk})")

        teacher = Teacher.objects.using(db_alias).get(user=user)
        print(f"✅ Found Teacher in {db_alias}: {teacher.pk}")

        classes = list(
            teacher.assigned_classes.using(db_alias).values_list("id", flat=True)
        )
        print(f"✅ Found Classes: {classes}")

    except Exception as e:
        print(f"❌ Error during lookup: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    final_debug()
