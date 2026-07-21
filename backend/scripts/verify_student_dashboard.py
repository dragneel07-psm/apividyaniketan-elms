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


def test_student_endpoints():
    token = get_token("student@demo.com", "student123")
    if not token:
        print("❌ Could not login as student")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-tenant-id": "demo",
    }

    print("\n✅ Student logged in successfully\n")

    # Test 1: Get My Student Profile
    print("--- Testing Student Profile (GET /api/academic/students/me/) ---")
    resp = requests.get(f"{BASE_URL}/academic/students/me/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        student = resp.json()
        print(f"Full Response: {json.dumps(student, indent=2)}")
        print(f"Student: {student.get('first_name')} {student.get('last_name')}")
        print(f"Class: {student.get('class_name', 'N/A')}")
        print(f"Email: {student.get('email')}")
        student_id = student.get("id") or student.get("student_id")
    else:
        print(f"Error: {resp.text}")
        return

    # Test 2: Get Subjects
    print("\n--- Testing Subjects ---")
    resp = requests.get(f"{BASE_URL}/academic/subjects/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        subjects = resp.json()
        print(f"Subjects found: {len(subjects)}")
        for s in subjects[:3]:
            print(f"  - {s['name']}")

    # Test 3: Get Assessments
    print("\n--- Testing Assessments (for pending count) ---")
    resp = requests.get(f"{BASE_URL}/academic/assessments/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        assessments = resp.json()
        print(f"Assessments found: {len(assessments)}")

    # Test 4: Get AI Recommendations
    print("\n--- Testing AI Recommendations ---")
    resp = requests.get(
        f"{BASE_URL}/ai/personalization/recommendations/", headers=headers
    )
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        print("✅ AI Recommendations working!")
        recs = resp.json()
        print(f"Recommendations: {len(recs.get('recommendations', []))}")
    else:
        print(f"⚠️  AI Recommendations not available: {resp.status_code}")

    # Test 5: Get Attendance
    print("\n--- Testing Attendance ---")
    resp = requests.get(f"{BASE_URL}/academic/attendance/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        attendance = resp.json()
        print(f"Attendance records: {len(attendance)}")


if __name__ == "__main__":
    test_student_endpoints()
