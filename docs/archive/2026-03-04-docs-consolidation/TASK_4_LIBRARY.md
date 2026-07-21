# 🎯 Task 4: Library Module - Book Management

## 📋 Objective
Test and verify the Library Management System including book catalog and book issue/return functionality.

---

## 📚 Module Overview

The library module provides:
- **Book Management**: Add, edit, delete books from catalog
- **Book Issue**: Issue books to students
- **Book Return**: Return books and calculate fines
- **Availability Tracking**: Track total and available copies

### Models
1. **Book**
   - Fields: title, author, ISBN, category, publisher, copies
   - Validation: total_copies ≥ available_copies ≥ 0
   
2. **BookIssue**
   - Fields: book, student, issued_date, due_date, return_date, status, fine
   - Statuses: issued, returned, overdue

---

## 🧪 Test Scenarios

### ✅ Scenario 1: List Books
**Endpoint**: `GET /api/library/books/`
**Expected**: Returns list of books with availability

### ✅ Scenario 2: Add New Book
**Endpoint**: `POST /api/library/books/`
**Data**:
```json
{
  "title": "Introduction to Algorithms",
  "author": "Cormen, Leiserson, Rivest, Stein",
  "isbn": "9780262033848",
  "category": "technology",
  "publisher": "MIT Press",
  "published_year": 2009,
  "total_copies": 3,
  "available_copies": 3
}
```

### ✅ Scenario 3: Issue Book to Student
**Endpoint**: `POST /api/library/issues/`
**Data**:
```json
{
  "book": "<book_id>",
  "student": "<student_id>",
  "due_date": "2026-02-15"
}
```
**Expected**: 
- Book issued successfully
- Available copies decremented
- Issue record created

### ✅ Scenario 4: Return Book
**Endpoint**: `PATCH /api/library/issues/{id}/`
**Data**:
```json
{
  "return_date": "2026-01-25",
  "status": "returned"
}
```
**Expected**:
- Available copies incremented
- Fine calculated if overdue

### ✅ Scenario 5: View Issue History
**Endpoint**: `GET /api/library/issues/`
**Expected**: List of all book issues with status

---

## 🔍 API Endpoints to Test

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/library/books/` | GET | List all books |
| `/api/library/books/` | POST | Add new book |
| `/api/library/books/{id}/` | GET | Get book details |
| `/api/library/books/{id}/` | PATCH | Update book |
| `/api/library/books/{id}/` | DELETE | Delete book |
| `/api/library/issues/` | GET | List book issues |
| `/api/library/issues/` | POST | Issue book |
| `/api/library/issues/{id}/` | PATCH | Update issue (return) |

---

## 📝 Categories Available
- fiction
- non_fiction
- science
- mathematics
- history
- literature
- technology
- biography
- reference
- other

---

## 🎯 Success Criteria

- ✅ Can list books in catalog
- ✅ Can add new books
- ✅ Available copies tracked correctly
- ✅ Can issue books to students
- ✅ Available copies decrement on issue
- ✅ Can return books
- ✅ Available copies increment on return
- ✅ Overdue detection works
- ✅ Cannot issue book with 0 available copies

---

Let me create a verification script to test all these features...
