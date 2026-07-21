# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os

import requests

BASE_URL = "http://localhost:8000/api"
HEADERS = {
    "Authorization": "Bearer YOUR_TOKEN_HERE",  # Will be fetched dynamically in real use
    "x-tenant-id": "demo",
}


def get_token():
    # Helper to get admin token
    url = f"{BASE_URL}/token/"
    payload = {"email": "admin@demo.com", "password": "admin123"}
    resp = requests.post(url, json=payload)
    if resp.status_code == 200:
        return resp.json()["access"]
    return None


def test_reports():
    token = get_token()
    if not token:
        print("❌ Auth failed")
        return

    HEADERS["Authorization"] = f"Bearer {token}"

    # 1. Get a student ID
    students = requests.get(f"{BASE_URL}/academic/students/", headers=HEADERS).json()
    if not students:
        print("❌ No students found")
        return
    student_id = students[0]["id"]

    # 2. Test Performance PDF
    print(f"Testing Student Performance PDF for student {student_id}...")
    resp = requests.get(
        f"{BASE_URL}/academic/reports/student-performance/{student_id}/",
        headers=HEADERS,
    )
    print(
        f"Status: {resp.status_code}, Content-Type: {resp.headers.get('Content-Type')}"
    )
    if resp.status_code == 200 and "pdf" in resp.headers.get("Content-Type", ""):
        print("✅ Performance PDF generated")

    # 3. Test Performance Excel
    print(f"Testing Student Performance Excel...")
    resp = requests.get(
        f"{BASE_URL}/academic/reports/student-performance-excel/{student_id}/",
        headers=HEADERS,
    )
    print(
        f"Status: {resp.status_code}, Content-Type: {resp.headers.get('Content-Type')}"
    )
    if resp.status_code == 200 and "spreadsheet" in resp.headers.get(
        "Content-Type", ""
    ):
        print("✅ Performance Excel generated")

    # 4. Get a section ID
    classes = requests.get(f"{BASE_URL}/academic/classes/", headers=HEADERS).json()
    if not classes or not classes[0].get("sections"):
        print("❌ No sections found")
    else:
        section_id = classes[0]["sections"][0]["id"]
        print(f"Testing Attendance Summary PDF for section {section_id}...")
        resp = requests.get(
            f"{BASE_URL}/academic/reports/attendance-summary/{section_id}/",
            headers=HEADERS,
        )
        print(
            f"Status: {resp.status_code}, Content-Type: {resp.headers.get('Content-Type')}"
        )
        if resp.status_code == 200:
            print("✅ Attendance PDF generated")

    # 5. Test Fee Collection
    print("Testing Fee Collection PDF...")
    resp = requests.get(f"{BASE_URL}/billing/reports/fee-collection/", headers=HEADERS)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        print("✅ Fee Collection PDF generated")


if __name__ == "__main__":
    test_reports()
