# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Seeds Assessment/Question/Submission/Result demo data for every Subject in
an existing school tenant — quizzes (with MCQ questions), assignments, and
exams, each with student submissions and a mix of graded/ungraded/late
work. This is a separate model set from the Nepal exam-term pipeline
(academic/models/nepal_result.py) — "Assignment" has no dedicated model,
it's Assessment(type="assignment") using the same Submission/Result flow
as quizzes/exams. Idempotent (get_or_create throughout).

Assumes seed_school_demo_data has already been run for the target schema
— this reads its Subjects/Students rather than creating its own.

Usage:
  python manage.py seed_academic_work_demo_data --schema apividyaniketan
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django_tenants.utils import schema_context

from academic.models import Assessment, Result, Student, Subject, Submission
from academic.models.question import Question
from academic.services.academic_year_service import ensure_current_academic_year
from core.models import Tenant

# (title_suffix, type, total_marks, passing_marks, duration_minutes, due_offset_days, publish)
ASSESSMENT_SPECS = [
    ("Unit Quiz", "quiz", 20, 8, 30, -10, True),
    ("Homework Assignment", "assignment", 50, 20, 1440, -5, True),
    ("Chapter Exam", "exam", 100, 40, 90, 5, False),
]

MCQ_QUESTIONS = [
    ("What is the correct definition of the key concept covered in this chapter?", "Option A"),
    ("Which of the following best applies the concept to a real-world example?", "Option B"),
    ("Identify the incorrect statement about the topic.", "Option C"),
    ("Which step comes first in the process described in class?", "Option A"),
    ("Select the answer that best summarizes the lesson.", "Option D"),
]
MCQ_OPTIONS = ["Option A", "Option B", "Option C", "Option D"]

# 60% graded / 20% submitted (ungraded, feeds the grading queue) / 10% late / 10% draft
SUBMISSION_STATUS_CYCLE = ["graded"] * 6 + ["submitted"] * 2 + ["late"] + ["draft"]

TEACHER_FEEDBACK_CHOICES = [
    "Good work, keep it up!",
    "Needs improvement on structure and clarity.",
    "Well explained, nice use of examples.",
    "Please review the core concept and resubmit corrections.",
    "",
]


class Command(BaseCommand):
    help = (
        "Seed Assessment/Question/Submission/Result demo data (quizzes, "
        "assignments, exams) for every subject in an existing tenant. "
        "Run seed_school_demo_data first."
    )

    def add_arguments(self, parser):
        parser.add_argument("--schema", required=True, help="Tenant schema to seed into.")
        parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducible scores.")

    def handle(self, *args, **options):
        schema = str(options["schema"]).strip().lower()
        rng = random.Random(int(options["seed"]))

        if not schema or schema == "public":
            raise CommandError("--schema must be a non-public tenant schema.")

        tenant = Tenant.objects.filter(schema_name=schema).first()
        if not tenant:
            raise CommandError(f"Tenant schema '{schema}' not found.")

        with schema_context(schema):
            year = ensure_current_academic_year()
            if not year:
                raise CommandError(
                    f"No academic year found in schema '{schema}'. Run seed_school_demo_data first."
                )
            subjects = list(
                Subject.objects.filter(academic_year=year).select_related(
                    "academic_class", "teacher__user"
                )
            )
            if not subjects:
                raise CommandError(
                    f"No subjects found in schema '{schema}'. Run seed_school_demo_data first."
                )

            assessments_created = 0
            questions_created = 0
            submissions_created = 0
            results_created = 0

            for subject in subjects:
                students = list(
                    Student.objects.filter(academic_class=subject.academic_class).select_related("user")
                )
                if not students:
                    continue
                teacher_user = subject.teacher.user if subject.teacher else None

                for suffix, a_type, total_marks, passing_marks, duration, due_offset, publish in ASSESSMENT_SPECS:
                    assessment, assessment_created = Assessment.objects.get_or_create(
                        subject=subject,
                        title=f"{subject.name} {suffix}",
                        type=a_type,
                        academic_year=year,
                        defaults={
                            "description": f"{suffix} for {subject.name}.",
                            "total_marks": total_marks,
                            "passing_marks": passing_marks,
                            "duration_minutes": duration,
                            "due_date": timezone.now() + timedelta(days=due_offset),
                            "results_published": publish,
                            "results_published_at": timezone.now() if publish else None,
                        },
                    )
                    if assessment_created:
                        assessments_created += 1

                    if a_type == "quiz":
                        for order, (text, correct) in enumerate(MCQ_QUESTIONS, start=1):
                            _, question_created = Question.objects.get_or_create(
                                assessment=assessment,
                                order=order,
                                defaults={
                                    "text": text,
                                    "type": "mcq",
                                    "options": MCQ_OPTIONS,
                                    "correct_answer": correct,
                                    "points": 4,
                                    "difficulty": "medium",
                                },
                            )
                            if question_created:
                                questions_created += 1

                    for idx, student in enumerate(students):
                        sub_status = SUBMISSION_STATUS_CYCLE[idx % len(SUBMISSION_STATUS_CYCLE)]
                        submission, submission_created = Submission.objects.get_or_create(
                            assessment=assessment,
                            student=student,
                            defaults={
                                "content": "" if a_type == "exam" else f"Submitted work for {assessment.title}.",
                                "status": sub_status,
                                "is_graded": sub_status == "graded",
                            },
                        )
                        if submission_created:
                            submissions_created += 1
                        if submission_created and sub_status == "graded":
                            pct = max(0.1, min(0.98, rng.gauss(0.72, 0.16)))
                            score = int(round(total_marks * pct))
                            _, result_created = Result.objects.get_or_create(
                                assessment=assessment,
                                student=student,
                                defaults={
                                    "score": score,
                                    "time_taken_minutes": rng.randint(5, max(duration, 10)),
                                    "graded_by": teacher_user,
                                    "teacher_feedback": rng.choice(TEACHER_FEEDBACK_CHOICES),
                                },
                            )
                            if result_created:
                                results_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nAcademic work demo data seeded into schema={schema}: "
                f"{assessments_created} assessments, {questions_created} questions, "
                f"{submissions_created} submissions, {results_created} results created."
            )
        )
