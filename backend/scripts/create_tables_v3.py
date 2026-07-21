# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sqlite3

# Target Databases
DEFAULT_DB = (
    "/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend/config/db.sqlite3"
)
TENANT_DB = "/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend/config/school_pramod.sqlite3"


def create_billing_tables(db_path):
    print(f"Creating Billing tables in {db_path}...")
    if not os.path.exists(db_path):
        print(f"File {db_path} not found, skipping.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. FeeStructure
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS billing_feestructure (
        fee_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        academic_class_id TEXT,
        frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
        created_at DATETIME NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES core_tenant(tenant_id)
    );
    """)

    # 2. StudentFee
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS billing_studentfee (
        student_fee_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        fee_structure_id TEXT NOT NULL,
        amount_due DECIMAL(10, 2) NOT NULL,
        amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        due_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES core_tenant(tenant_id),
        FOREIGN KEY (fee_structure_id) REFERENCES billing_feestructure(fee_id)
    );
    """)

    # 3. Payment
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS billing_payment (
        payment_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_fee_id TEXT,
        amount DECIMAL(10, 2) NOT NULL,
        payment_date DATETIME NOT NULL,
        method VARCHAR(20) NOT NULL DEFAULT 'cash',
        transaction_id VARCHAR(100),
        recorded_by_id TEXT,
        remarks TEXT,
        FOREIGN KEY (tenant_id) REFERENCES core_tenant(tenant_id),
        FOREIGN KEY (student_fee_id) REFERENCES billing_studentfee(student_fee_id)
    );
    """)

    # 4. Expense
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS billing_expense (
        expense_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        title VARCHAR(200) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        category VARCHAR(20) NOT NULL DEFAULT 'other',
        date DATE NOT NULL,
        description TEXT,
        recorded_by_id TEXT,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES core_tenant(tenant_id)
    );
    """)
    conn.commit()
    conn.close()


def create_library_tables(db_path):
    print(f"Creating Library tables in {db_path}...")
    if not os.path.exists(db_path):
        print(f"File {db_path} not found, skipping.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

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
    );
    """)

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
        FOREIGN KEY (book_id) REFERENCES library_book(book_id)
    );
    """)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    # Create Billing in Default DB (because it's in SHARED_APPS)
    create_billing_tables(DEFAULT_DB)

    # Create Library in Tenant DB (because it's in TENANT_APPS)
    create_library_tables(TENANT_DB)

    # Also create Billing in Tenant DB just in case routing is mixed
    create_billing_tables(TENANT_DB)

    # Also create Library in Default DB just in case? No, unlikely.

    # check for school_pdramod too
    ALT_TENANT_DB = "/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend/config/school_pdramod.sqlite3"
    if os.path.exists(ALT_TENANT_DB):
        create_library_tables(ALT_TENANT_DB)
        create_billing_tables(ALT_TENANT_DB)

    print("Table creation script finished.")
