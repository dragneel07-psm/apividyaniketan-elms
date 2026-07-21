# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sqlite3

db_path = "config/db.sqlite3"
print(f"Checking database at: {os.path.abspath(db_path)}")

if not os.path.exists(db_path):
    print("Database file does not exist!")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'billing%'"
)
tables = cur.fetchall()
print(f"Found billing tables: {tables}")
conn.close()
