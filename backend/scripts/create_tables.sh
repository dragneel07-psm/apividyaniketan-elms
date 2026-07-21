#!/bin/bash
cd /Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend

echo "=== Creating Library Tables ==="
sqlite3 config/school_pramod.sqlite3 <<'EOF'
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
    remarks TEXT
);

SELECT 'Tables created successfully';
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%';
EOF

echo ""
echo "=== Verification ==="
sqlite3 config/school_pramod.sqlite3 "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library_%';"
echo ""
echo "✅ Done! Now refresh your browser and try adding a book."
