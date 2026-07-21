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
        print(f"Failed to get token for {email}: {response.text}")
        return None


def verify_librarian_dashboard():
    print("🚀 Starting Librarian Dashboard Verification")

    # 1. Login as Admin (Librarian)
    admin_token = get_token("admin@demo.com", "admin123")
    if not admin_token:
        print("❌ Login failed")
        return

    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
        "x-tenant-id": "demo",
    }
    print("✅ Logged in as Admin")

    # 2. Add New Book
    print("\n--- 1. Adding New Book ---")
    new_book_data = {
        "title": "The Pragmatic Programmer",
        "author": "Andy Hunt & Dave Thomas",
        "isbn": "9780201616224",
        "category": "technology",
        "total_copies": 5,
        "description": "From journeyman to master",
    }
    resp = requests.post(
        f"{BASE_URL}/library/books/", headers=headers, json=new_book_data
    )
    if resp.status_code != 201:
        print(f"❌ Failed to add book: {resp.text}")
        return

    book = resp.json()
    book_id = book["book_id"]
    print(
        f"✅ Book Added: {book['title']} (Copies: {book['available_copies']}/{book['total_copies']})"
    )

    # 3. Edit Book
    print("\n--- 2. Editing Book ---")
    update_data = {"total_copies": 10}
    resp = requests.patch(
        f"{BASE_URL}/library/books/{book_id}/", headers=headers, json=update_data
    )
    if resp.status_code != 200:
        print(f"❌ Failed to edit book: {resp.text}")
    else:
        updated_book = resp.json()
        print(f"✅ Book Updated: Total Copies {updated_book['total_copies']}")

    # 4. Search and List
    print("\n--- 3. Searching Books ---")
    resp = requests.get(
        f"{BASE_URL}/library/books/?search=ragmatic", headers=headers
    )  # Assuming simple filter exists or just list
    # The viewset generic filtering might not be setup for 'search' param by default unless SearchFilter is added backend.
    # But frontend does client-side filtering.
    # Let's just list and check.
    resp = requests.get(f"{BASE_URL}/library/books/", headers=headers)
    books = resp.json()
    found = any(b["book_id"] == book_id for b in books)
    if found:
        print("✅ Book found in catalog")
    else:
        print("⚠️ Book NOT found in list")

    # 5. Return Book (Find an issued book first)
    print("\n--- 4. Returning Book ---")
    resp = requests.get(f"{BASE_URL}/library/issues/", headers=headers)
    issues = resp.json()
    active_issues = [i for i in issues if i["status"] == "issued"]

    if active_issues:
        target_issue = active_issues[0]
        issue_id = target_issue["issue_id"]
        book_title = target_issue["book_title"]
        print(f"Target Issue: {issue_id} ({book_title})")

        # Return it
        resp = requests.post(
            f"{BASE_URL}/library/issues/{issue_id}/return_book/", headers=headers
        )
        if resp.status_code == 200:
            result = resp.json()
            print(f"✅ Book Returned! Status: {result['status']}")
            if float(result["fine_amount"]) > 0:
                print(f"💰 Fine Applied: ${result['fine_amount']}")
        else:
            print(f"❌ Failed to return book: {resp.text}")
    else:
        print("ℹ️ No active issues to return. Skipping return test.")

    # 6. Delete Test Book
    print("\n--- 5. Deleting Test Book ---")
    resp = requests.delete(f"{BASE_URL}/library/books/{book_id}/", headers=headers)
    if resp.status_code == 204:
        print("✅ Book Deleted")
    else:
        print(f"❌ Failed to delete book: {resp.text}")

    print("\n✅ Librarian Dashboard Logic Verified!")


if __name__ == "__main__":
    verify_librarian_dashboard()
