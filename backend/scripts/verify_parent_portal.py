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


def test_parent_portal():
    token = get_token("parent@demo.com", "parent123")
    if not token:
        print("❌ Could not login as parent")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-tenant-id": "demo",
    }

    print("\n✅ Parent logged in successfully\n")

    # Test 1: Get Parent Profile
    print("--- Test 1: Get Parent Profile (GET /api/academic/parents/me/) ---")
    resp = requests.get(f"{BASE_URL}/academic/parents/me/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        parent = resp.json()
        print(
            f"Parent: {parent.get('user', {}).get('first_name')} {parent.get('user', {}).get('last_name')}"
        )
        print(f"Students: {len(parent.get('students', []))}")
        for student in parent.get("students", []):
            print(
                f"  - {student.get('first_name')} {student.get('last_name')} ({student.get('class_name')})"
            )
            student_id = student.get("id") or student.get("student_id")
    else:
        print(f"Error: {resp.text}")
        return

    # Test 2: Generate AI Report
    if parent.get("students"):
        student = parent["students"][0]
        student_id = student.get("id") or student.get("student_id")

        print(f"\n--- Test 2: Generate AI Report for {student.get('first_name')} ---")
        print(f"GET /api/ai/reports/student/{student_id}/")
        resp = requests.get(
            f"{BASE_URL}/ai/reports/student/{student_id}/", headers=headers
        )
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            report = resp.json()
            print("✅ AI Report Generated!")
            print(f"\n📊 Report Summary:")
            print(f"   Student: {report.get('student_name')}")
            print(f"   Class: {report.get('class_name')}")
            print(f"   Attendance: {report.get('attendance_percentage', 0)}%")
            print(f"   Average Score: {report.get('average_score', 0)}")
            print(
                f"   Assignments Completed: {report.get('completed_assignments', 0)}/{report.get('total_assignments', 0)}"
            )

            print(f"\n🎯 AI Analysis:")
            print(f"   Strengths: {len(report.get('strengths', []))} identified")
            for strength in report.get("strengths", [])[:2]:
                print(f"      • {strength}")
            print(f"   Weaknesses: {len(report.get('weaknesses', []))} identified")
            for weakness in report.get("weaknesses", [])[:2]:
                print(f"      • {weakness}")
            print(f"   Recommendations: {len(report.get('recommendations', []))}")
            for rec in report.get("recommendations", [])[:2]:
                print(f"      • {rec}")
        else:
            print(f"Error: {resp.text}")

        # Test 3: Get Report History
        print(f"\n--- Test 3: Get Report History ---")
        print(f"GET /api/ai/reports/student/{student_id}/history/")
        resp = requests.get(
            f"{BASE_URL}/ai/reports/student/{student_id}/history/", headers=headers
        )
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            history = resp.json()
            print(f"Reports in history: {len(history)}")
            for report in history[:3]:
                print(f"  - Generated: {report.get('generated_at')}")
                print(f"    Avg Score: {report.get('average_score')}")
        else:
            print(f"Note: {resp.text}")


if __name__ == "__main__":
    test_parent_portal()
