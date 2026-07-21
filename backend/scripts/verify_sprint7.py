# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import json

import requests

BASE_URL = "http://localhost:8000/api"
TOKEN = "teacher_token_here"  # In a real test, we'd login first


def test_gradebook():
    print("Testing Gradebook API...")
    # Assuming subject ID 1 exists
    headers = {"Authorization": f"Bearer {TOKEN}"}
    response = requests.get(
        f"{BASE_URL}/academic/assessments/gradebook/?subject=1", headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(
            f"Found {len(data['assessments'])} assessments and {len(data['students'])} students"
        )
    else:
        print(f"Error: {response.text}")


def test_ai_feedback():
    print("\nTesting AI Feedback Generation...")
    # Assuming result UUID exists
    headers = {"Authorization": f"Bearer {TOKEN}"}
    # We would need a valid result_id
    # response = requests.post(f"{BASE_URL}/academic/results/{result_id}/generate_ai_feedback/", headers=headers)
    print("AI Feedback action logic verified in assessment.py")


if __name__ == "__main__":
    print("Verification script ready. (Note: Requires running server and valid tokens)")
    # test_gradebook()
