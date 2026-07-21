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


def test_teacher_endpoints():
    token = get_token("teacher@demo.com", "teacher123")
    if not token:
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-tenant-id": "demo",  # The actual subdomain from the Tenant table
    }

    print("\n--- Testing Subject Listing ---")
    resp = requests.get(f"{BASE_URL}/academic/subjects/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        subjects = resp.json()
        print(f"Subjects: {[s['name'] for s in subjects]}")

        if subjects:
            physics_id = next(
                (s["id"] for s in subjects if s["name"] == "Physics"), None
            )
            if physics_id:
                print(f"\n--- Testing Chapters for Physics (ID: {physics_id}) ---")
                resp = requests.get(
                    f"{BASE_URL}/academic/chapters/?subject={physics_id}",
                    headers=headers,
                )
                print(f"Status: {resp.status_code}")
                chapters = resp.json()
                print(f"Chapters: {[c['title'] for c in chapters]}")

    print("\n--- Testing Teacher Analytics ---")
    resp = requests.get(f"{BASE_URL}/ai/analytics/teacher/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        print("Analytics: Success!")
        print(json.dumps(resp.json(), indent=2))
    else:
        print(f"Analytics Failed: {resp.text}")


if __name__ == "__main__":
    test_teacher_endpoints()
