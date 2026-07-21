# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sqlite3

DB_PATH = "/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend/config/school_pramod.sqlite3"
OUTPUT_FILE = (
    "/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend/table_check_result.txt"
)


def check_tables():
    if not os.path.exists(DB_PATH):
        return f"Database not found at {DB_PATH}"

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check Library Tables
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%'"
    )
    library_tables = [r[0] for r in cursor.fetchall()]

    # Check Billing/Finance Tables
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'billing_%'"
    )
    billing_tables = [r[0] for r in cursor.fetchall()]

    conn.close()

    result = []
    result.append(f"Database: {DB_PATH}")
    result.append("\n=== LIBRARY TABLES ===")
    if library_tables:
        result.append(
            f"Found {len(library_tables)} tables: {', '.join(library_tables)}"
        )
    else:
        result.append("MISSING: No library tables found!")

    result.append("\n=== BILLING TABLES ===")
    if billing_tables:
        result.append(
            f"Found {len(billing_tables)} tables: {', '.join(billing_tables)}"
        )
    else:
        result.append("MISSING: No billing tables found!")

    return "\n".join(result)


if __name__ == "__main__":
    output = check_tables()
    with open(OUTPUT_FILE, "w") as f:
        f.write(output)
    print("Check complete. See output file.")
