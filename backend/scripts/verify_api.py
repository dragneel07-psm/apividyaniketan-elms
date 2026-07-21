# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
# verify_api.py
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from rest_framework.test import APIClient


def verify():
    print("--- Verifying API Endpoints ---")
    client = APIClient()

    # 1. Test Tenant API
    response = client.get("/api/core/tenants/")
    print(f"GET /api/core/tenants/ Status: {response.status_code}")
    if response.status_code == 200:
        print("Tenants endpoint is accessible.")
        print(response.json())
    else:
        print(f"Error accessing tenants: {response.content}")

    # 2. Test Classes API
    response = client.get("/api/academic/classes/")
    print(f"GET /api/academic/classes/ Status: {response.status_code}")
    if response.status_code == 200:
        print("Classes endpoint is accessible.")
    else:
        print(f"Error accessing classes: {response.content}")

    print("--- API Verification Complete ---")


if __name__ == "__main__":
    verify()
