# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import random
from datetime import timedelta

from django.utils import timezone

from academic.models import AcademicClass, Assessment, Course, Result, Student

student = Student.objects.first()
if not student:
    print("No student found!")
    # Allow running even without student to just populate assessments if needed, but results need student
    exit()

aclass = student.academic_class
if not aclass:
    print("Student has no class!")
    exit()

print(
    f"Adding data for student: {student.user.first_name if student.user else 'Unknown'} in {aclass}"
)

subjects = ["Mathematics", "Physics", "Chemistry", "English"]
courses = []
for subj in subjects:
    # Use update_or_create to avoid duplicates if re-run
    c, created = Course.objects.get_or_create(academic_class=aclass, subject=subj)
    courses.append(c)

# Clear existing demo assessments to avoid duplicates clustering
# Assessment.objects.all().delete() # Optional, maybe safer not to delete everything

# 1. Past Assessments (Completed)
past_titles = [
    ("Algebra Unit Test", "Mathematics", "quiz", "apply"),
    ("Newton's Laws Quiz", "Physics", "quiz", "understand"),
    ("Periodic Table Exam", "Chemistry", "exam", "remember"),
    ("Essay Writing", "English", "assignment", "create"),
    ("Integration Basics", "Mathematics", "quiz", "apply"),
    ("Optics Test", "Physics", "exam", "analyze"),
]

for title, subj, type, level in past_titles:
    course = next(c for c in courses if c.subject == subj)

    # Check if exists
    if Assessment.objects.filter(title=title, course=course).exists():
        continue

    assessment = Assessment.objects.create(
        course=course,
        title=title,
        description=f"Assessment on {title}",
        type=type,
        total_marks=100,
        blooms_level=level,
        scheduled_at=timezone.now() - timedelta(days=random.randint(2, 30)),
        duration_minutes=45,
    )

    score = random.randint(60, 95)
    Result.objects.create(
        assessment=assessment,
        student=student,
        score=score,
        time_taken_minutes=random.randint(30, 45),
        submitted_at=timezone.now() - timedelta(days=random.randint(1, 29)),
        ai_feedback=f"Student showed strong {level} skills. Improve time management.",
        teacher_feedback="Good job!",
    )
    print(f"Created result: {title} - {score}/100")

# 2. Upcoming Assessments
future_titles = [
    ("Calculus Mid-Term", "Mathematics", "exam", "analyze", 5),
    ("Organic Chemistry Quiz", "Chemistry", "quiz", "understand", 2),
    ("Poetry Analysis", "English", "assignment", "evaluate", 7),
]

for title, subj, type, level, days_future in future_titles:
    course = next(c for c in courses if c.subject == subj)

    if Assessment.objects.filter(title=title, course=course).exists():
        continue

    Assessment.objects.create(
        course=course,
        title=title,
        description="Upcoming major assessment.",
        type=type,
        total_marks=100,
        blooms_level=level,
        scheduled_at=timezone.now() + timedelta(days=days_future),
        duration_minutes=60,
    )
    print(f"Created upcoming: {title}")

print("✅ Demo Assessment Data Populated!")
