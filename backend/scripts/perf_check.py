# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys
import time

import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection, reset_queries
from django_tenants.utils import schema_context
from rest_framework.test import APIClient

from users.models import UserAccount


def check():
    with schema_context("demo"):
        user = UserAccount.objects.filter(role="admin").first()
        client = APIClient()
        client.force_authenticate(user=user)

        reset_queries()
        start = time.time()
        response = client.get(
            "/api/billing/finance-dashboard/", headers={"x-tenant-id": "demo"}
        )
        duration = (time.time() - start) * 1000
        queries = len(connection.queries)

        print(f"Status: {response.status_code}")
        print(f"Time: {duration:.2f}ms")
        print(f"Queries: {queries}")


if __name__ == "__main__":
    check()
