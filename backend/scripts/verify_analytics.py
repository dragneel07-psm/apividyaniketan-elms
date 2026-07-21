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
        print(f"Failed to get token for {email}: {response.text}")
        return None


def verify_analytics():
    print("🚀 Starting Predictive Analytics Verification")

    # 1. Login as Teacher (using existing demo account)
    teacher_email = "teacher@demo.com"
    token = get_token(teacher_email, "teacher123")

    if not token:
        print("❌ Login failed")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-tenant-id": "demo",
    }
    print(f"✅ Logged in as {teacher_email}")

    # 2. Call Analytics Endpoint
    print("\n--- Fetching Teacher Analytics ---")
    resp = requests.get(f"{BASE_URL}/ai/analytics/teacher/", headers=headers)

    if resp.status_code != 200:
        print(f"❌ Failed to fetch analytics: {resp.status_code}")
        print(resp.text)
        return

    data = resp.json()
    print("✅ Analytics Data Received")

    # 3. Validate Structure
    required_keys = [
        "at_risk_count",
        "at_risk_students",
        "performance_trends",
        "topic_mastery",
        "ai_insights",
    ]
    missing = [k for k in required_keys if k not in data]

    if missing:
        print(f"❌ Missing keys in response: {missing}")
    else:
        print("✅ Response structure valid")
        print(f"   - At Risk Count: {data['at_risk_count']}")
        print(f"   - Insights Generated: {len(data['ai_insights'])}")
        if data["at_risk_students"]:
            print(
                f"   - Sample At-Risk Student: {data['at_risk_students'][0]['name']} (Risk: {data['at_risk_students'][0]['risk_level']})"
            )

    if "error" in data:
        print(f"⚠️ API returned logical error: {data['error']}")

    print("\n✅ Verification Complete")


if __name__ == "__main__":
    verify_analytics()
