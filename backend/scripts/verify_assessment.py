# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import uuid

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from academic.models.assessment import Assessment, Result
from academic.models.question import Question
from academic.models.student import Student
from academic.models.subject import Subject
from academic.services.grading_service import GradingService
from core.models.tenant import Tenant


def verify_assessment():
    print("🧪 Verifying Assessment Flow...")

    # 1. Setup Tenant DB
    tenant = Tenant.objects.get(subdomain="demo")
    db_alias = "demo_school"
    db_name = "school_demo.sqlite3"

    from django.conf import settings

    if db_alias not in settings.DATABASES:
        new_db_config = settings.DATABASES["default"].copy()
        new_db_config["NAME"] = settings.BASE_DIR / db_name
        settings.DATABASES[db_alias] = new_db_config

    # 2. Get Test Data
    subject = Subject.objects.using(db_alias).first()
    student = Student.objects.using(db_alias).first()

    if not subject or not student:
        print("❌ Could not find subject or student")
        return

    # 3. Create Assessment
    print("\nStep 1: Creating Assessment...")
    assessment = Assessment.objects.using(db_alias).create(
        subject=subject,
        title="Python Basics Quiz",
        type="quiz",
        total_marks=2,
        duration_minutes=10,
    )

    q1 = Question.objects.using(db_alias).create(
        assessment=assessment,
        text="What is the output of print(2**3)?",
        type="mcq",
        options=["6", "8", "9", "5"],
        correct_answer="8",
        points=1,
        order=1,
    )

    q2 = Question.objects.using(db_alias).create(
        assessment=assessment,
        text="Is Python an interpreted language?",
        type="short_answer",
        correct_answer="Yes",
        points=1,
        order=2,
    )

    print(f"✅ Assessment created: {assessment.title}")

    # 4. Simulate Submission & Grading
    print("\nStep 2: Simulating Submission & Grading...")
    answers = {
        str(q1.question_id): "8",  # Correct
        str(q2.question_id): "yes",  # Correct (case-insensitive)
    }

    total_score, max_possible, graded_answers = GradingService.grade_submission(
        assessment, answers
    )

    print(f"📊 Graded Score: {total_score}/{max_possible}")

    if total_score != 2:
        print(f"❌ Grading logic failed! Expected 2, got {total_score}")
    else:
        print(
            "✅ Auto-grading works correctly (MCQ exact and Short Answer case-insensitive)"
        )

    # 5. Create Result
    result = Result.objects.using(db_alias).create(
        assessment=assessment,
        student=student,
        score=total_score,
        time_taken_minutes=5,
        answers_data=graded_answers,
    )

    print(f"✅ Result stored. ID: {result.result_id}")

    # Cleanup (Optional) - keeping for now to see in DB if needed
    # assessment.delete()

    print("\n✨ Assessment flow verification complete!")


if __name__ == "__main__":
    verify_assessment()
