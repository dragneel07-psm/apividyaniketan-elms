# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import json

import requests

BASE_URL = "http://localhost:8000/api"


def run_test():
    print("1. Testing Login...")
    try:
        # Obtain Token
        resp = requests.post(
            f"{BASE_URL}/token/",
            data={
                "username": "admin",
                "password": "password123",  # I need to be sure of this. If fails, I'll reset it.
            },
        )

        if resp.status_code != 200:
            print(f"Login Failed: {resp.status_code} {resp.text}")
            return

        token = resp.json().get("access")
        print("Login Successful. Token obtained.")

        # Test Get Classes
        print("\n2. Testing GET /academic/classes/...")
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/academic/classes/", headers=headers)

        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")

        # Test POST Class
        print("\n3. Testing POST /academic/classes/...")
        payload = {"grade": 9, "section": "Z_DEBUG"}
        resp = requests.post(
            f"{BASE_URL}/academic/classes/", json=payload, headers=headers
        )
        print(f"POST Status: {resp.status_code}")
        print(f"POST Response: {resp.text}")

    except Exception as e:
        print(f"Test Exception: {e}")


if __name__ == "__main__":
    run_test()
