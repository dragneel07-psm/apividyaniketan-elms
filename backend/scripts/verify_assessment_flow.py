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
        print(f"Failed to get token: {response.text}")
        return None


def verify_assessment_flow():
    # Login as teacher (using admin for now if teacher logic is complex, or ideally a teacher account)
    # create_test_accounts.py creates test_teacher@demo.com / teacher123
    token = get_token("test_teacher@demo.com", "teacher123")
    if not token:
        print("Falling back to admin token")
        token = get_token("admin@demo.com", "admin123")

    if not token:
        print("❌ Could not login")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-tenant-id": "demo",  # Assuming demo tenant
    }

    # 1. Get a Subject (Course)
    print("\n--- 1. Getting Subject ---")
    resp = requests.get(f"{BASE_URL}/academic/subjects/", headers=headers)
    if resp.status_code != 200:
        print(f"Failed to get subjects: {resp.text}")
        return
    subjects = resp.json()
    if not subjects:
        print("No subjects found")
        # return # Try to continue or fail?
        # Create one if needed? Assuming data exists

    subject_id = subjects[0]["id"] if subjects else None
    print(f"Using subject ID: {subject_id}")

    if not subject_id:
        print("Cannot proceed without subject")
        return

    # 2. Create Assessment (Quiz)
    print("\n--- 2. Creating Quiz ---")
    quiz_data = {
        "subject": subject_id,
        "title": "Verifiable Python Quiz",
        "description": "Created by verification script",
        "type": "quiz",
        "total_marks": 10,
        "passing_marks": 4,
        "duration_minutes": 30,
        "blooms_level": "apply",
        "scheduled_at": (datetime.now() + timedelta(days=1)).isoformat(),
    }
    resp = requests.post(
        f"{BASE_URL}/academic/assessments/", headers=headers, json=quiz_data
    )
    print(f"Status: {resp.status_code}")
    if resp.status_code != 201:
        print(f"Error: {resp.text}")
        return

    quiz = resp.json()
    quiz_id = quiz["assessment_id"]
    print(f"✅ Created Quiz: {quiz['title']} ({quiz_id})")

    # 3. Add MCQ Question
    print("\n--- 3. Adding MCQ Question ---")
    mcq_data = {
        "assessment": quiz_id,
        "text": "What is the output of print(2 ** 3)?",
        "type": "mcq",
        "points": 5,
        "options": ["5", "6", "8", "9"],
        "correct_answer": "8",
        "order": 1,
    }
    resp = requests.post(
        f"{BASE_URL}/academic/questions/", headers=headers, json=mcq_data
    )
    print(f"Status: {resp.status_code}")
    if resp.status_code != 201:
        print(f"Error: {resp.text}")
    else:
        q1 = resp.json()
        print(f"✅ Created MCQ: {q1['text']}")

    # 4. Add Short Answer Question
    print("\n--- 4. Adding Short Answer Question ---")
    sa_data = {
        "assessment": quiz_id,
        "text": "Explain the concept of recursion.",
        "type": "short_answer",
        "points": 5,
        "order": 2,
    }
    resp = requests.post(
        f"{BASE_URL}/academic/questions/", headers=headers, json=sa_data
    )
    print(f"Status: {resp.status_code}")
    if resp.status_code != 201:
        print(f"Error: {resp.text}")
    else:
        q2 = resp.json()
        print(f"✅ Created Short Answer: {q2['text']}")

    # 5. Verify Questions List
    print("\n--- 5. Verifying Questions List ---")
    resp = requests.get(
        f"{BASE_URL}/academic/questions/?assessment={quiz_id}", headers=headers
    )
    questions = resp.json()
    print(f"Questions found: {len(questions)}")
    for q in questions:
        print(f"  - [{q['type']}] {q['text']} ({q['points']} pts)")
        if q["type"] == "mcq":
            print(f"    Options: {q['options']}")

    print("\n✅ Assessment Flow Verified Successfully!")


if __name__ == "__main__":
    verify_assessment_flow()
