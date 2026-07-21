# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

import json
import sys

import requests

BASE_URL = "http://localhost:8000/api/ai"
AUTH_URL = "http://localhost:8000/api/users/login/"


def verify_predictive_analytics():
    print("🚀 Starting Predictive Analytics Verification")

    # 1. Login as Teacher
    # Note: We assume teacher_test@demo.com exists from setup scripts
    auth_data = {"email": "teacher@demo.com", "password": "teacher123"}

    print("\n--- 1. Authenticating as Teacher ---")
    try:
        response = requests.post(
            AUTH_URL, json=auth_data, headers={"x-tenant-id": "demo"}
        )
        if response.status_code != 200:
            print(f"❌ Login failed: {response.text}")
            return

        token = response.json().get("access")
        headers = {
            "Authorization": f"Bearer {token}",
            "x-tenant-id": "demo",
            "Content-Type": "application/json",
        }
        print("✅ Logged in successfully.")
    except Exception as e:
        print(f"❌ Auth error: {e}")
        return

    # 2. Fetch Teacher Analytics
    print("\n--- 2. Fetching Teacher Analytics ---")
    try:
        response = requests.get(f"{BASE_URL}/analytics/teacher/", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Analytics Retreived Successfully")
            print(f"FULL DATA: {json.dumps(data, indent=2)}")
            print(f"📉 At-Risk Count: {data.get('at_risk_count')}")

            risk_students = data.get("at_risk_students", [])
            if risk_students:
                print("⚠️ At-Risk Students Identified:")
                for student in risk_students:
                    print(
                        f"  - {student['name']} (Risk: {student['risk_level']}, Score: {student['score']})"
                    )
                    for reason in student.get("reasons", []):
                        print(f"    • {reason}")
            else:
                print("✅ No at-risk students found in current data.")

            insights = data.get("ai_insights", [])
            if insights:
                print("\n✨ AI Pedagogical Insights:")
                for insight in insights:
                    print(f"  - {insight}")

            # Check performance trends
            trends = data.get("performance_trends", [])
            if trends:
                print(f"\n📊 Performance Trends: {len(trends)} weeks found.")

            # Check topic mastery
            mastery = data.get("topic_mastery", [])
            if mastery:
                print(f"🧠 Topic Mastery: {len(mastery)} subjects analyzed.")

        else:
            print(
                f"❌ Failed to fetch analytics: {response.status_code} - {response.text}"
            )
    except Exception as e:
        print(f"❌ Request error: {e}")

    print("\n✅ Predictive Analytics Verification Complete!")


if __name__ == "__main__":
    verify_predictive_analytics()
