#!/usr/bin/env python3
# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

"""
Direct script to create library tables in tenant database
This bypasses Django migrations and creates tables directly
"""

import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.core.management import call_command
from django.db import connections


def main():
    print("=" * 70)
    print("LIBRARY MIGRATION FIX SCRIPT")
    print("=" * 70)

    # Step 1: Check if tenant database exists
    print("\n[1] Checking tenant database connection...")
    try:
        with connections["tenant_pramod"].cursor() as cursor:
            cursor.execute("SELECT 1")
            print("    ✓ Tenant database connection successful")
    except Exception as e:
        print(f"    ✗ ERROR: {e}")
        return

    # Step 2: Check current library tables
    print("\n[2] Checking existing library tables...")
    with connections["tenant_pramod"].cursor() as cursor:
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%';"
        )
        existing_tables = [row[0] for row in cursor.fetchall()]
        if existing_tables:
            print(f"    Found tables: {existing_tables}")
        else:
            print("    No library tables found")

    # Step 3: Run migrations
    print("\n[3] Running library migrations on tenant_pramod database...")
    try:
        call_command("migrate", "library", database="tenant_pramod", verbosity=2)
        print("    ✓ Migrations completed")
    except Exception as e:
        print(f"    ✗ Migration failed: {e}")
        print("\n[4] Attempting to create tables manually...")

        # Manual table creation as fallback
        create_tables_sql = """
        CREATE TABLE IF NOT EXISTS library_book (
            book_id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(255) NOT NULL,
            isbn VARCHAR(13) UNIQUE,
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
        );
        
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
        );
        """

        try:
            with connections["tenant_pramod"].cursor() as cursor:
                for statement in create_tables_sql.split(";"):
                    if statement.strip():
                        cursor.execute(statement)
            print("    ✓ Tables created manually")
        except Exception as e2:
            print(f"    ✗ Manual creation failed: {e2}")
            return

    # Step 4: Verify tables were created
    print("\n[5] Verifying library tables...")
    with connections["tenant_pramod"].cursor() as cursor:
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%';"
        )
        tables = [row[0] for row in cursor.fetchall()]

        if "library_book" in tables and "library_bookissue" in tables:
            print("    ✓ All library tables exist:")
            for table in tables:
                print(f"      - {table}")

            # Show table structure
            print("\n[6] Table structure:")
            cursor.execute("PRAGMA table_info(library_book);")
            columns = cursor.fetchall()
            print("    library_book columns:")
            for col in columns:
                print(f"      - {col[1]} ({col[2]})")
        else:
            print(f"    ✗ Missing tables. Found: {tables}")
            return

    print("\n" + "=" * 70)
    print("✓ LIBRARY MIGRATION FIX COMPLETED SUCCESSFULLY")
    print("=" * 70)
    print("\nNext steps:")
    print("1. Restart your Django server (Ctrl+C, then 'python3 manage.py runserver')")
    print("2. Refresh your browser")
    print("3. Try accessing the library page again")


if __name__ == "__main__":
    main()
