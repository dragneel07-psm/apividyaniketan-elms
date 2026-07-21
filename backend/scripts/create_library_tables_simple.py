#!/usr/bin/env python3
# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

"""Direct SQLite table creation for library app"""

import os
import sqlite3

# Database path
db_path = "config/school_pramod.sqlite3"

print(f"Working with database: {os.path.abspath(db_path)}")
print(f"Database exists: {os.path.exists(db_path)}")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("\n=== Checking existing tables ===")
cursor.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%'"
)
existing = cursor.fetchall()
print(f"Existing library tables: {[t[0] for t in existing]}")

print("\n=== Creating library_book table ===")
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
print("✓ library_book table created")

print("\n=== Creating library_bookissue table ===")
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
print("✓ library_bookissue table created")

conn.commit()

print("\n=== Verification ===")
cursor.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%'"
)
tables = cursor.fetchall()
print(f"Library tables now present: {[t[0] for t in tables]}")

# Show structure
for table in tables:
    table_name = table[0]
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    print(f"\n{table_name}:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")

conn.close()

print("\n" + "=" * 50)
print("✓ SUCCESS - Library tables created!")
print("=" * 50)
print("\nNow restart your Django server:")
print("1. Go to the terminal running 'python3 manage.py runserver'")
print("2. Press Ctrl+C to stop it")
print("3. Run: python3 manage.py runserver")
print("4. Refresh your browser")
