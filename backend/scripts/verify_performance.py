# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys
import time

import django
from django.db import connection

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()


def verify_performance():
    from django_tenants.utils import schema_context
    from rest_framework.test import APIClient

    from users.models import UserAccount

    print("🏎️ Testing Query Performance...")

    try:
        with schema_context("demo"):
            # Get a user for authentication
            user = UserAccount.objects.filter(role="admin").first()
            if not user:
                print("❌ No admin user found in 'demo' tenant for testing.")
                return

            client = APIClient()
            client.force_authenticate(user=user)

            # Warm up cache (optional, but we want to measure cold start vs optimized)
            # client.get('/api/billing/finance-dashboard/', headers={'x-tenant-id': 'demo'})

            # Measure Query Count
            start_queries = len(connection.queries)
            start_time = time.time()

            # Call the API view directly or via client
            response = client.get(
                "/api/billing/finance-dashboard/", headers={"x-tenant-id": "demo"}
            )

            end_time = time.time()
            end_queries = len(connection.queries)

            query_count = end_queries - start_queries
            duration = (end_time - start_time) * 1000

            print(f"📊 Dashboard Stats:")
            print(f"   Status Code: {response.status_code}")
            print(f"   Queries Executed: {query_count}")
            print(f"   Execution Time: {duration:.2f}ms")

            # Assertion (Heuristic)
            if query_count > 10:
                print(
                    f"⚠️ High Query Count detected ({query_count}). Optimization recommended."
                )
            else:
                print(f"✅ Query Count Optimized ({query_count})!")

    except Exception as e:
        print(f"❌ Test Failed: {e}")


if __name__ == "__main__":
    verify_performance()
