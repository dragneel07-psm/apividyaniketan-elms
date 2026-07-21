# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connections

db_alias = "tenant_pramod"

with connections[db_alias].cursor() as cursor:
    # Check existing
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%'"
    )
    before = [row[0] for row in cursor.fetchall()]

    # Create library_book
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
            updated_at DATETIME NOT NULL
        )
    """)

    # Create library_bookissue
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
            remarks TEXT
        )
    """)

    # Check after
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%'"
    )
    after = [row[0] for row in cursor.fetchall()]

    with open("/tmp/table_creation_result.txt", "w") as f:
        f.write(f"Before: {before}\n")
        f.write(f"After: {after}\n")
        f.write("SUCCESS\n")

print("DONE - Check /tmp/table_creation_result.txt")
