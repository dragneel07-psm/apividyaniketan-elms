# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/..")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.conf import settings
from django.db import connections

# Register tenant DB
db_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "school_demo.sqlite3"
)
new_db_config = settings.DATABASES["default"].copy()
new_db_config["NAME"] = db_path
settings.DATABASES["school_demo"] = new_db_config
connections.databases["school_demo"] = new_db_config

from academic.models.assessment import Assessment, Result
from academic.models.question import Question
from academic.models.student import Student
from academic.models.submission import Submission
from academic.services.grading_service import GradingService


def test_grading_flow():
    print("Starting Grading Flow Test...")

    # 1. Get or create a test assessment
    assessment = Assessment.objects.using("school_demo").first()
    if not assessment:
        print("No assessment found. Creating one...")
        # (Simplified creation for demo purposes)
        return

    print(f"Testing with Assessment: {assessment.title}")

    # 2. Add a descriptive question if not exists
    q, created = Question.objects.using("school_demo").get_or_create(
        assessment=assessment,
        text="What is the significance of the water cycle?",
        defaults={
            "type": "short_answer",  # Will be handled by AI now
            "correct_answer": "It circulates water through the Earth's atmosphere and surface.",
            "points": 10,
        },
    )

    # 3. Mock Answers
    answers = {
        str(
            q.question_id
        ): "The water cycle is important because it moves water all around the planet through rain and evaporation."
    }

    # 4. Run Grading
    print("Running AI Grading...")
    total_score, max_possible, graded_answers = GradingService.grade_submission(
        assessment, answers
    )

    print(f"Score: {total_score} / {max_possible}")
    for q_id, data in graded_answers.items():
        print(
            f"Question {q_id}: {data['points_earned']} points. Feedback: {data.get('ai_feedback')}"
        )

    if total_score > 0:
        print("PASS: AI Grading returned a score.")
    else:
        print("FAIL: AI Grading returned 0 (or fallback failed).")


if __name__ == "__main__":
    test_grading_flow()
