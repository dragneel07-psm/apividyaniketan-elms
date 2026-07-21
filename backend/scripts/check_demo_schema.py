# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sqlite3

try:
    if not os.path.exists("school_demo.sqlite3"):
        with open("schema_verification.txt", "w") as f:
            f.write("school_demo.sqlite3 not found")
        exit(1)

    conn = sqlite3.connect("school_demo.sqlite3")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='academic_notice';"
    )
    schema = cursor.fetchone()

    with open("schema_verification.txt", "w") as f:
        if schema:
            f.write(schema[0])
        else:
            f.write("Table 'academic_notice' not found.")

    print("Schema written to schema_verification.txt")
except Exception as e:
    with open("schema_verification.txt", "w") as f:
        f.write(f"Error: {str(e)}")
