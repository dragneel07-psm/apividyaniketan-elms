# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import random
import sys
import uuid

import django

sys.path.append(os.getcwd())

# Setup Django Environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from academic.models import AcademicClass, Assessment, Course, Result, Student, Teacher
from users.models import UserAccount

CLASS_ID = "0bda0494-b690-466b-aed6-05d85a5c29c3"
COURSE_ID = "f63f6499-b5b3-4b02-a220-cc74ec69cb43"  # Mathematics


def create_students(academic_class, count=15):
    print(f"Creating {count} students for {academic_class}...")

    names = [
        ("Aarav", "Sharma"),
        ("Vivaan", "Patel"),
        ("Aditya", "Verma"),
        ("Vihaan", "Singh"),
        ("Arjun", "Kumar"),
        ("Sai", "Iyer"),
        ("Reyansh", "Gupta"),
        ("Aryan", "Malhotra"),
        ("Krishna", "Bhat"),
        ("Ishaan", "Joshi"),
        ("Diya", "Reddy"),
        ("Ananya", "Nair"),
        ("Aditi", "Mehta"),
        ("Pari", "Desai"),
        ("Saanvi", "Chopra"),
    ]

    students = []
    for i in range(count):
        first, last = names[i] if i < len(names) else (f"Student", f"{i+1}")
        username = f"{first.lower()}.{last.lower()}{random.randint(100,999)}"
        email = f"{username}@example.com"

        # Create User
        user, created = UserAccount.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": first,
                "last_name": last,
                "role": "student",
                "is_active": True,
            },
        )
        if created:
            user.set_password("password123")
            user.save()

        # Create Student Profile
        student, _ = Student.objects.get_or_create(
            user=user,
            defaults={
                "academic_class": academic_class,
                "focus_score": random.randint(60, 95),
            },
        )
        students.append(student)
        print(f" - Created/Found {first} {last}")

    return students


def seed_data():
    try:
        # Get Class
        try:
            academic_class = AcademicClass.objects.get(pk=CLASS_ID)
            print(f"Found Class: {academic_class}")
        except AcademicClass.DoesNotExist:
            print(f"Class {CLASS_ID} not found! Aborting.")
            return

        # Get Course
        try:
            course = Course.objects.get(pk=COURSE_ID)
            print(f"Found Course: {course.subject}")
        except Course.DoesNotExist:
            print(f"Course {COURSE_ID} not found! Creating...")
            course = Course.objects.create(
                course_id=COURSE_ID,
                subject="Mathematics",
                academic_class=academic_class,
            )

        # Create Students
        students = create_students(academic_class)

        # Create Assessments
        assessments_data = [
            ("Unit Test 1", "quiz", 20),
            ("Mid-Term Exam", "exam", 100),
            ("Algebra Quiz", "quiz", 20),
            ("Geometry Project", "assignment", 50),
        ]

        for title, type, marks in assessments_data:
            assessment, created = Assessment.objects.get_or_create(
                course=course,
                title=title,
                defaults={"type": type, "total_marks": marks, "blooms_level": "apply"},
            )
            print(f"Assessment: {title}")

            # Create Results
            for student in students:
                # Random score based on student "ability" (random factor)
                # Some high, some low
                ability = random.random()  # 0 to 1
                if ability > 0.8:
                    score_pct = random.randint(90, 100)
                elif ability > 0.5:
                    score_pct = random.randint(70, 89)
                elif ability > 0.2:
                    score_pct = random.randint(50, 69)
                else:
                    score_pct = random.randint(30, 49)  # At risk

                score = int((score_pct / 100) * marks)

                Result.objects.get_or_create(
                    assessment=assessment,
                    student=student,
                    defaults={
                        "score": score,
                        "time_taken_minutes": random.randint(30, 60),
                    },
                )

        print("Done! Data seeded successfully.")

    except Exception as e:
        print(f"Error seeding data: {e}")


if __name__ == "__main__":
    seed_data()
