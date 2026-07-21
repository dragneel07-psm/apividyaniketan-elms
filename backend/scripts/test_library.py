#!/usr/bin/env python3
# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

"""Test script to verify library database setup"""

import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connections

from core.models import Tenant
from library.models import Book


def test_library_setup():
    print("=" * 60)
    print("LIBRARY DATABASE SETUP TEST")
    print("=" * 60)

    # Check default database
    print("\n1. Checking DEFAULT database...")
    with connections["default"].cursor() as cursor:
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%';"
        )
        tables = cursor.fetchall()
        print(f"   Library tables in DEFAULT: {[t[0] for t in tables]}")

    # Check tenant database
    print("\n2. Checking TENANT_PRAMOD database...")
    try:
        with connections["tenant_pramod"].cursor() as cursor:
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%';"
            )
            tables = cursor.fetchall()
            print(f"   Library tables in TENANT_PRAMOD: {[t[0] for t in tables]}")

            if tables:
                # Check table structure
                cursor.execute("PRAGMA table_info(library_book);")
                columns = cursor.fetchall()
                print(f"\n   library_book columns: {[c[1] for c in columns]}")
    except Exception as e:
        print(f"   ERROR: {e}")

    # Check if we can query books
    print("\n3. Testing Book model query...")
    try:
        # Get tenant
        tenant = Tenant.objects.first()
        if tenant:
            print(f"   Found tenant: {tenant.name}")

            # Try to query books
            books = Book.objects.using("tenant_pramod").filter(tenant=tenant)
            print(f"   Books count: {books.count()}")
        else:
            print("   No tenant found!")
    except Exception as e:
        print(f"   ERROR: {e}")

    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    test_library_setup()
