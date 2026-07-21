#!/usr/bin/env python3
# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

"""
Final script to create library tables in tenant database
"""

import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.core.management import call_command
from django.db import connections


def main():
    print("=" * 70)
    print("CREATING LIBRARY TABLES")
    print("=" * 70)

    db_alias = "tenant_pramod"

    # Check connection
    print(f"\n[1] Checking database connection to '{db_alias}'...")
    try:
        with connections[db_alias].cursor() as cursor:
            cursor.execute("SELECT 1")
        print(f"    ✓ Connected to {db_alias}")
    except Exception as e:
        print(f"    ✗ Connection failed: {e}")
        return False

    # Check existing tables
    print(f"\n[2] Checking for existing library tables...")
    with connections[db_alias].cursor() as cursor:
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name LIKE 'library_%'
        """)
        existing = [row[0] for row in cursor.fetchall()]
        if existing:
            print(f"    Found: {existing}")
        else:
            print("    No library tables found")

    # Create tables using Django migrations
    print(f"\n[3] Running Django migrations for library app...")
    try:
        call_command(
            "migrate", "library", database=db_alias, verbosity=2, interactive=False
        )
        print("    ✓ Migrations completed")
    except Exception as e:
        print(f"    ⚠ Migrations failed: {e}")
        print(f"\n[4] Creating tables manually...")

        # Manual creation as fallback
        with connections[db_alias].cursor() as cursor:
            # Create library_book table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS library_book (
                    book_id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    author VARCHAR(255) NOT NULL,
                    isbn VARCHAR(13),
                    category VARCHAR(100) NOT NULL,
                    publisher VARCHAR(255),
                    published_year INTEGER,
                    total_copies INTEGER NOT NULL DEFAULT 1,
                    available_copies INTEGER NOT NULL DEFAULT 1,
                    description TEXT,
                    cover_image VARCHAR(500),
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    FOREIGN KEY (tenant_id) REFERENCES core_tenant(tenant_id)
                )
            """)
            print("    ✓ Created library_book table")

            # Create library_bookissue table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS library_bookissue (
                    issue_id TEXT PRIMARY KEY,
                    book_id TEXT NOT NULL,
                    student_id TEXT NOT NULL,
                    issued_date DATETIME NOT NULL,
                    due_date DATE NOT NULL,
                    return_date DATE,
                    status VARCHAR(20) NOT NULL DEFAULT 'issued',
                    fine_amount DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
                    remarks TEXT,
                    FOREIGN KEY (book_id) REFERENCES library_book(book_id),
                    FOREIGN KEY (student_id) REFERENCES academic_student(student_id)
                )
            """)
            print("    ✓ Created library_bookissue table")

    # Verify tables
    print(f"\n[5] Verifying library tables...")
    with connections[db_alias].cursor() as cursor:
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name LIKE 'library_%'
        """)
        tables = [row[0] for row in cursor.fetchall()]

        if "library_book" in tables and "library_bookissue" in tables:
            print(f"    ✓ All tables exist: {tables}")

            # Show table structure
            for table in tables:
                cursor.execute(f"PRAGMA table_info({table})")
                columns = cursor.fetchall()
                print(f"\n    {table}:")
                for col in columns:
                    print(f"      - {col[1]} ({col[2]})")

            print("\n" + "=" * 70)
            print("✓ SUCCESS - Library tables created!")
            print("=" * 70)
            print("\nNext steps:")
            print("1. Restart Django server (if not already done)")
            print("2. Refresh your browser")
            print("3. Try adding a book again")
            return True
        else:
            print(f"    ✗ Missing tables. Found: {tables}")
            return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
