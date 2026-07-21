# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import sqlite3
import sys

db_path = "/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend/config/school_pramod.sqlite3"

print(f"Connecting to: {db_path}", file=sys.stderr)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

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
    updated_at DATETIME NOT NULL
)
""")

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
    remarks TEXT
)
""")

conn.commit()

# Verify
cursor.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%'"
)
tables = cursor.fetchall()

print(f"✓ Created tables: {[t[0] for t in tables]}", file=sys.stderr)

conn.close()

print("SUCCESS")
