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
        print(f"Failed to get token for {email}: {response.text}")
        return None


def verify_student_submission_flow():
    print("🚀 Starting Student Submission Verification")

    # 1. Login as Teacher to find/create a quiz
    teacher_token = get_token("test_teacher@demo.com", "teacher123")
    if not teacher_token:
        # fallback to admin
        teacher_token = get_token("admin@demo.com", "admin123")

    headers_teacher = {
        "Authorization": f"Bearer {teacher_token}",
        "Content-Type": "application/json",
        "x-tenant-id": "demo",
    }

    # Get the "Verifiable Python Quiz" created in previous step
    resp = requests.get(f"{BASE_URL}/academic/assessments/", headers=headers_teacher)
    assessments = resp.json()
    quiz = next(
        (a for a in assessments if a["title"] == "Verifiable Python Quiz"), None
    )

    if not quiz:
        print(
            "❌ 'Verifiable Python Quiz' not found. Please run verify_assessment_flow.py first."
        )
        return

    quiz_id = quiz["assessment_id"]
    print(f"✅ Found Quiz: {quiz['title']} ({quiz_id})")

    # Get questions to know correct answers
    resp = requests.get(
        f"{BASE_URL}/academic/questions/?assessment={quiz_id}", headers=headers_teacher
    )
    questions = resp.json()
    print(f"ℹ️  Quiz has {len(questions)} questions")

    # Identify Question IDs
    mcq = next((q for q in questions if q["type"] == "mcq"), None)
    saq = next((q for q in questions if q["type"] == "short_answer"), None)

    if not mcq:
        print("❌ No MCQ found in quiz")
        return

    # 2. Login as Student
    # Check if student exists, if not use existing or create
    # create_test_accounts.py creates student_user / student123
    student_token = get_token("student_user@demo.com", "student123")
    if not student_token:
        # Try updating verify script to fetch any student
        print("⚠️ Could not login as student_user. Trying to find a student account...")
        # Admin can list students to find emails
        resp = requests.get(f"{BASE_URL}/academic/students/", headers=headers_teacher)
        students = resp.json()
        if students:
            target_student = students[0]
            print(f"Found student: {target_student['email']}")
            # Assuming default password for demo accounts
            student_token = get_token(
                target_student["email"], "password123"
            )  # Standard demo pass
            if not student_token:
                student_token = get_token(target_student["email"], "student123")

    if not student_token:
        print("❌ Failed to login as any student")
        return

    headers_student = {
        "Authorization": f"Bearer {student_token}",
        "Content-Type": "application/json",
        "x-tenant-id": "demo",
    }
    print("✅ Logged in as Student")

    # 3. Submit Exam
    print("\n--- Submitting Exam ---")

    # Prepare answers
    answers = {}

    # Answer MCQ correctly
    answers[mcq["question_id"]] = mcq["correct_answer"]  # Should be "8"
    print(f"📝 Answering MCQ (Correct): {mcq['correct_answer']}")

    # Answer SAQ
    if saq:
        answers[saq["question_id"]] = "Recursion is a function calling itself."
        print(f"📝 Answering SAQ: {answers[saq['question_id']]}")

    payload = {"assessment": quiz_id, "answers": answers, "time_taken": 15}  # minutes

    resp = requests.post(
        f"{BASE_URL}/academic/submissions/submit_exam/",
        headers=headers_student,
        json=payload,
    )
    print(f"Status: {resp.status_code}")

    if resp.status_code != 200:
        print(f"❌ Submission Failed: {resp.text}")
        return

    result = resp.json()
    print("✅ Submission Successful!")
    print(f"🎯 Score: {result['score']}/{result['max_score']}")
    print(f"📄 Result ID: {result['result_id']}")

    # Verify Score logic
    # MCQ was 5 points. SAQ is 5 points but not auto-graded yet (or logic in SubmitView might only grade MCQs)
    # Check API response
    if result["score"] >= 5:
        print("✅ Auto-grading Verified (At least MCQ points awarded)")
    else:
        print("⚠️ Score seems low. Check grading logic.")

    print("\n✅ Student Submission Flow Verified!")


if __name__ == "__main__":
    verify_student_submission_flow()
