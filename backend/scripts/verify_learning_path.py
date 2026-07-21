# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import sys

import requests

BASE_URL = "http://localhost:8000/api/ai"
TOKEN_URL = "http://localhost:8000/api/token/"


def get_token(email, password):
    url = TOKEN_URL
    payload = {"email": email, "password": password}
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return response.json()["access"]
    else:
        print(f"Failed to get token for {email}: {response.text}")
        return None


def verify_learning_path():
    print("🚀 Starting Learning Path Verification")

    # 1. Login as Student
    token = get_token("student@demo.com", "student123")
    if not token:
        print("❌ Login failed.")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-tenant-id": "demo",
    }

    # 2. Generate Learning Path
    print("\n--- 1. Generating Learning Path ---")
    resp = requests.post(
        f"{BASE_URL}/learning-paths/generate/", headers=headers, json={}
    )
    if resp.status_code != 201:
        print(f"❌ Failed to generate learning path: {resp.text}")
        return

    path = resp.json()
    path_id = path["id"]
    print(f"✅ Learning Path Generated: {path['title']} (ID: {path_id})")
    print(f"📝 Nodes: {len(path.get('nodes', []))}")

    # 3. Get Active Path
    print("\n--- 2. Fetching Active Path ---")
    resp = requests.get(f"{BASE_URL}/learning-paths/active/", headers=headers)
    if resp.status_code != 200:
        print(f"❌ Failed to get active path: {resp.text}")
        return

    active_path = resp.json()
    print(f"✅ Retreived Active Path: {active_path['title']}")
    if active_path["id"] != path_id:
        print("⚠️  Mismatched path ID!")

    # 4. Complete a Node
    if active_path.get("nodes"):
        first_node = active_path["nodes"][0]
        node_id = first_node["id"]
        print(f"\n--- 3. Completing Node: {first_node['title']} ---")

        resp = requests.post(
            f"{BASE_URL}/learning-nodes/{node_id}/complete/", headers=headers
        )
        if resp.status_code == 200:
            result = resp.json()
            print(
                f"✅ Node marked complete. Next node unlocked: {result['next_node_unlocked']}"
            )
        else:
            print(f"❌ Failed to complete node: {resp.text}")

    print("\n✅ Learning Path Backend Verified!")


if __name__ == "__main__":
    verify_learning_path()
