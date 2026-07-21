#!/usr/bin/env python3
# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

import os
import sqlite3

# Absolute path to database
db_path = "/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend/config/school_pramod.sqlite3"

print(f"Database path: {db_path}")
print(f"Database exists: {os.path.exists(db_path)}")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check existing tables
print("\n=== Before creation ===")
cursor.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%'"
)
print(f"Existing library tables: {[row[0] for row in cursor.fetchall()]}")

# Create library_book table
print("\n=== Creating library_book ===")
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
print("✓ library_book created")

# Create library_bookissue table
print("\n=== Creating library_bookissue ===")
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
print("✓ library_bookissue created")

# Commit changes
conn.commit()

# Verify
print("\n=== After creation ===")
cursor.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%'"
)
tables = [row[0] for row in cursor.fetchall()]
print(f"Library tables: {tables}")

# Show structure
for table in tables:
    cursor.execute(f"PRAGMA table_info({table})")
    columns = cursor.fetchall()
    print(f"\n{table} columns:")
    for col in columns:
        print(f"  {col[1]} ({col[2]})")

conn.close()

print("\n" + "=" * 60)
print("✅ SUCCESS - Tables created!")
print("=" * 60)
print("\nNow:")
print("1. Refresh your browser (the library page)")
print("2. Try adding a book again")
