# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sqlite3
import uuid
from datetime import datetime

DB_PATH = "/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend/config/school_pramod.sqlite3"


def create_tables():
    print(f"Connecting to database: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print("ERROR: Database file not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # ==========================
    # LIBRARY TABLES
    # ==========================
    print("Creating Library tables...")
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
        FOREIGN KEY (book_id) REFERENCES library_book(book_id),
        FOREIGN KEY (student_id) REFERENCES academic_student(student_id)
    );
    """)

    # ==========================
    # BILLING / FINANCE TABLES
    # ==========================
    print("Creating Billing/Finance tables...")

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
        FOREIGN KEY (tenant_id) REFERENCES core_tenant(tenant_id),
        FOREIGN KEY (academic_class_id) REFERENCES academic_academicclass(class_id)
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
        FOREIGN KEY (student_id) REFERENCES academic_student(student_id),
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
        FOREIGN KEY (student_id) REFERENCES academic_student(student_id),
        FOREIGN KEY (student_fee_id) REFERENCES billing_studentfee(student_fee_id),
        FOREIGN KEY (recorded_by_id) REFERENCES users_useraccount(id)
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
        FOREIGN KEY (tenant_id) REFERENCES core_tenant(tenant_id),
        FOREIGN KEY (recorded_by_id) REFERENCES users_useraccount(id)
    );
    """)

    conn.commit()

    # Check tables
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'library_%' OR name LIKE 'billing_%')"
    )
    tables = cursor.fetchall()
    print("\nConfirmed Tables in Database:")
    for t in tables:
        print(f" - {t[0]}")

    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    create_tables()
