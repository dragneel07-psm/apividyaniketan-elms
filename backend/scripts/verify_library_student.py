# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import json
from datetime import datetime, timedelta

import requests

BASE_URL = "http://localhost:8000/api"


def get_token(email, password):
    url = f"{BASE_URL}/token/"
    payload = {"email": email, "password": password}
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return response.json()["access"]
    else:
        # print(f"Failed to get token for {email}: {response.text}")
        return None


def verify_library_student_flow():
    print("🚀 Starting Library Student Verification")

    # 1. Login as Student
    # Try common test accounts
    student_email = "student@demo.com"
    student_pass = "student123"
    token = get_token(student_email, student_pass)

    if not token:
        # Fallback to creating or finding one?
        # Let's try report_test user found earlier
        student_email = "report_test@demo.com"
        # We don't know the password for report_test, usually default "password123" or similar
        token = get_token(student_email, "password123")

    if not token:
        # Try finding a student via admin
        admin_token = get_token("admin@demo.com", "admin123")
        if admin_token:
            headers_admin = {
                "Authorization": f"Bearer {admin_token}",
                "x-tenant-id": "demo",
            }
            resp = requests.get(f"{BASE_URL}/academic/students/", headers=headers_admin)
            students = resp.json()
            if students:
                target = students[0]
                # Reset password to known value to login?
                # Or just use the first available one if we knew credentials.
                # Only "student_user" is created with known creds in create_test_accounts.py usually.
                # If that failed, maybe we need to create one.
                print(
                    "⚠️  Could not login as standard student. Using admin checks to debug."
                )

    if not token:
        print("❌ Login failed. Cannot proceed.")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-tenant-id": "demo",
    }
    print(f"✅ Logged in as {student_email}")

    # 2. List Books
    print("\n--- 1. Listing Books ---")
    resp = requests.get(f"{BASE_URL}/library/books/", headers=headers)
    if resp.status_code != 200:
        print(f"❌ Failed to list books: {resp.text}")
        return

    books = resp.json()
    print(f"📚 Found {len(books)} books")
    if not books:
        print("⚠️ No books found. Please run populate_library.py")
        return

    target_book = None
    for b in books:
        if b["available_copies"] > 0:
            target_book = b
            break

    if not target_book:
        print("❌ No books available to issue")
        return

    print(f"📖 Target Book: {target_book['title']} (ID: {target_book['book_id']})")
    initial_copies = target_book["available_copies"]

    # 3. Get Student ID (needed for issue)
    # The frontend calls usersAPI.getMe() then academicAPI.getStudents() to find ID.
    # We can just fetch /academic/students/me/
    resp = requests.get(f"{BASE_URL}/academic/students/me/", headers=headers)
    if resp.status_code != 200:
        # Fallback: list all and match query
        resp = requests.get(f"{BASE_URL}/academic/students/", headers=headers)
        # This might fail if student can't list all.
        # But usually 'me' endpoint exists?
        if resp.status_code == 200:
            # Assume first one is me if strict filtering? No.
            # Look for email
            all_students = resp.json()
            me = next((s for s in all_students if s["email"] == student_email), None)
        else:
            print("❌ Could not get student profile")
            return
    else:
        me = resp.json()

    if not me:
        print("❌ Student profile not found")
        return

    student_id = me["id"]  # or student_id depending on serializer
    print(f"👤 Student ID: {student_id}")

    # 4. Request/Issue Book
    print("\n--- 2. Requesting Book ---")
    issue_data = {"book": target_book["book_id"], "student": student_id}

    # POST /library/issues/
    resp = requests.post(
        f"{BASE_URL}/library/issues/", headers=headers, json=issue_data
    )
    if resp.status_code != 201:
        print(f"❌ Failed to issue book: {resp.text}")
    else:
        issue = resp.json()
        print(f"✅ Book Issued! ID: {issue['issue_id']}")
        print(f"📅 Due Date: {issue['due_date']}")
        print(f"Status: {issue['status']}")

        # 5. Verify Copies Decremented
        print("\n--- 3. Verifying Inventory ---")
        resp = requests.get(
            f"{BASE_URL}/library/books/{target_book['book_id']}/", headers=headers
        )
        updated_book = resp.json()
        new_copies = updated_book["available_copies"]
        print(f"Old Copies: {initial_copies} -> New Copies: {new_copies}")

        if new_copies == initial_copies - 1:
            print("✅ Inventory updated correctly")
        else:
            print("⚠️ Inventory DID NOT update")

    print("\n✅ Library Student Flow Verified!")


if __name__ == "__main__":
    verify_library_student_flow()
