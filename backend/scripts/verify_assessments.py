# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import json
import secrets
import string

import requests

BASE_URL = "http://localhost:8000/api"


def get_token(email, password):
    url = f"{BASE_URL}/users/login/"
    response = requests.post(url, json={"email": email, "password": password})
    if response.status_code == 200:
        return response.json().get("access")
    print(f"❌ Login failed for {email}: {response.status_code} - {response.text}")
    return None


def verify_assessments():
    # 1. Login as Teacher
    teacher_token = get_token("teacher@demo.com", "teacher123")
    if not teacher_token:
        print("❌ Failed to login as teacher")
        return
    headers = {"Authorization": f"Bearer {teacher_token}"}

    # 2. Get a subject to assign assessment to
    subjects_res = requests.get(f"{BASE_URL}/academic/subjects/", headers=headers)
    if subjects_res.status_code != 200 or not subjects_res.json():
        print("❌ Failed to get subjects")
        return
    subject = subjects_res.json()[0]
    subject_id = subject["id"]
    print(f"✅ Found subject: {subject['name']}")

    # 3. Create an Assessment
    assessment_data = {
        "subject": subject_id,
        "title": "API Verification Quiz",
        "description": "A quiz created by the verification script",
        "type": "quiz",
        "total_marks": 10,
        "duration_minutes": 15,
    }
    create_res = requests.post(
        f"{BASE_URL}/academic/assessments/", headers=headers, json=assessment_data
    )
    if create_res.status_code != 201:
        print(f"❌ Failed to create assessment: {create_res.text}")
        return
    assessment = create_res.json()
    assessment_id = assessment["id"]
    print(f"✅ Created assessment: {assessment['title']}")

    # 4. Add Questions
    q1_data = {
        "assessment": assessment_id,
        "text": "What is 2+2?",
        "type": "mcq",
        "options": ["3", "4", "5"],
        "correct_answer": "4",
        "points": 5,
        "order": 1,
    }
    q2_data = {
        "assessment": assessment_id,
        "text": "What is the capital of France?",
        "type": "short_answer",
        "correct_answer": "Paris",
        "points": 5,
        "order": 2,
    }
    requests.post(f"{BASE_URL}/academic/questions/", headers=headers, json=q1_data)
    requests.post(f"{BASE_URL}/academic/questions/", headers=headers, json=q2_data)
    print("✅ Added questions to assessment")

    # 5. Login as Student
    student_token = get_token("student@demo.com", "student123")
    if not student_token:
        print("❌ Failed to login as student")
        return
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 6. Take the Quiz
    submission_data = {
        "assessment": assessment_id,
        "answers": {
            q1_data["text"]: "4",  # Wait, I need question IDs
        },
        "time_taken": 2,
    }
    # Get questions to get their IDs
    qs_res = requests.get(
        f"{BASE_URL}/academic/questions/?assessment={assessment_id}",
        headers=student_headers,
    )
    questions = qs_res.json()

    submission_answers = {}
    for q in questions:
        if "2+2" in q["text"]:
            submission_answers[q["id"]] = "4"
        elif "France" in q["text"]:
            submission_answers[q["id"]] = "Paris"

    submit_data = {
        "assessment": assessment_id,
        "answers": submission_answers,
        "time_taken": 2,
    }

    submit_res = requests.post(
        f"{BASE_URL}/academic/submissions/submit_exam/",
        headers=student_headers,
        json=submit_data,
    )
    if submit_res.status_code != 200:
        print(f"❌ Failed to submit quiz: {submit_res.text}")
        return

    result = submit_res.json()
    print(f"✅ Quiz submitted! Score: {result['score']}/{result['max_score']}")

    if result["score"] == 10:
        print("🎉 Verification SUCCESSFUL! Auto-grading works.")
    else:
        print(
            f"⚠️ Verification partially successful. Expected score 10, got {result['score']}"
        )


if __name__ == "__main__":
    verify_assessments()
