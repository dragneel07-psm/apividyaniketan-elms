# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import json

import requests

BASE_URL = "http://localhost:8000/api"


def get_token(email, password):
    url = f"{BASE_URL}/token/"
    payload = {"email": email, "password": password}
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return response.json()["access"]
    else:
        print(f"Failed to get token: {response.text}")
        return None


def test_admin_student_management():
    # Use school_admin account
    token = get_token("admin@demo.com", "admin123")
    if not token:
        print("❌ Could not login as admin")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-tenant-id": "demo",
    }

    print("\n✅ Admin logged in successfully\n")

    # Test 1: List Students
    print("--- Test 1: List Students (GET /api/academic/students/) ---")
    resp = requests.get(f"{BASE_URL}/academic/students/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        students = resp.json()
        print(f"Students found: {len(students)}")
        for s in students[:3]:
            print(f"  - {s.get('first_name')} {s.get('last_name')} ({s.get('email')})")
            print(
                f"    Class: {s.get('class_name', 'N/A')}, ID: {s.get('id') or s.get('student_id')}"
            )
    else:
        print(f"Error: {resp.text}")
        return

    # Test 2: Get Classes (for dropdown)
    print("\n--- Test 2: Get Classes (GET /api/academic/classes/) ---")
    resp = requests.get(f"{BASE_URL}/academic/classes/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        classes = resp.json()
        print(f"Classes found: {len(classes)}")
        for c in classes[:3]:
            print(f"  - {c.get('name')} (ID: {c.get('id')})")

    # Test 3: Get Sections (for dropdown)
    print("\n--- Test 3: Get Sections (GET /api/academic/sections/) ---")
    resp = requests.get(f"{BASE_URL}/academic/sections/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        sections = resp.json()
        print(f"Sections found: {len(sections)}")
        for sec in sections[:3]:
            print(f"  - {sec.get('name')} (Class: {sec.get('academic_class')})")

    # Test 4: Create Student
    print("\n--- Test 4: Create Student (POST /api/academic/students/) ---")
    new_student = {
        "email": "testcreate@demo.com",
        "password": "password123",
        "first_name": "API",
        "last_name": "Created",
        "academic_class": 1,  # Grade 10
        "section": 1,  # Section A
        "learning_style": "visual",
    }
    resp = requests.post(
        f"{BASE_URL}/academic/students/", headers=headers, json=new_student
    )
    print(f"Status: {resp.status_code}")
    if resp.status_code == 201:
        created = resp.json()
        print(f"✅ Student created!")
        print(f"   ID: {created.get('id') or created.get('student_id')}")
        print(f"   Name: {created.get('first_name')} {created.get('last_name')}")
        student_id = created.get("id") or created.get("student_id")

        # Test 5: Update Student
        print("\n--- Test 5: Update Student (PATCH /api/academic/students/{id}/) ---")
        update_data = {"learning_style": "auditory"}
        resp = requests.patch(
            f"{BASE_URL}/academic/students/{student_id}/",
            headers=headers,
            json=update_data,
        )
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print("✅ Student updated!")

        # Test 6: Delete Student
        print("\n--- Test 6: Delete Student (DELETE /api/academic/students/{id}/) ---")
        resp = requests.delete(
            f"{BASE_URL}/academic/students/{student_id}/", headers=headers
        )
        print(f"Status: {resp.status_code}")
        if resp.status_code == 204:
            print("✅ Student deleted!")
    else:
        print(f"Error creating student: {resp.text}")

    # Test 7: Student Stats
    print("\n--- Test 7: Student Stats (GET /api/academic/students/stats/) ---")
    resp = requests.get(f"{BASE_URL}/academic/students/stats/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        stats = resp.json()
        print(f"Total Students: {stats.get('total')}")
        print(f"By Class: {stats.get('by_class')}")


if __name__ == "__main__":
    test_admin_student_management()
