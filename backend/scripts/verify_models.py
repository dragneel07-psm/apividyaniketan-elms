# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
# verify_models.py
import os
import uuid

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from academic.models import (
    AcademicClass,
    Assessment,
    Course,
    Lesson,
    Parent,
    Result,
    Student,
    Teacher,
)
from ai_engine.models import AIInteractionLog
from billing.models import Subscription
from core.models import Tenant
from users.models import UserAccount


def verify():
    print("--- Verifying Models ---")

    # 1. Create Tenant
    suffix = str(uuid.uuid4())[:8]
    tenant = Tenant.objects.create(
        name=f"Verify High School {suffix}", subdomain=f"verify-{suffix}", type="School"
    )
    print(f"Created Tenant: {tenant}")

    # 2. Create Subscription
    sub = Subscription.objects.create(
        tenant=tenant, plan="Premium", student_limit=500, ai_token_limit=100000
    )
    print(f"Created Subscription: {sub}")

    # 3. Create Class
    academic_class = AcademicClass.objects.create(tenant=tenant, grade=10, section="A")
    print(f"Created Class: {academic_class}")

    # 4. Create User (Student)
    student_user = UserAccount.objects.create_user(
        username=f"student-{suffix}", password="password", role="student", tenant=tenant
    )
    student_profile = Student.objects.create(
        user=student_user, academic_class=academic_class
    )
    print(f"Created Student: {student_profile}")

    # 5. Create User (Teacher)
    teacher_user = UserAccount.objects.create_user(
        username=f"teacher-{suffix}", password="password", role="teacher", tenant=tenant
    )
    teacher_profile = Teacher.objects.create(user=teacher_user)
    print(f"Created Teacher: {teacher_profile}")

    # 6. Create Parent
    parent_profile = Parent.objects.create(
        tenant=tenant, full_name="John Doe", phone="1234567890"
    )
    parent_profile.students.add(student_profile)
    print(
        f"Created Parent: {parent_profile} with student {parent_profile.students.first()}"
    )

    # 7. Create Course & Lesson
    course = Course.objects.create(academic_class=academic_class, subject="Mathematics")
    print(f"Created Course: {course}")
    lesson = Lesson.objects.create(
        course=course, title="Algebra 101", content_type="Text"
    )
    print(f"Created Lesson: {lesson}")

    # 8. Create Assessment & Result
    assessment = Assessment.objects.create(
        course=course, title="Algebra Quiz", type="Quiz", total_marks=20
    )
    result = Result.objects.create(
        assessment=assessment, student=student_profile, score=18
    )
    print(f"Created Result: {result}")

    # 9. Create AI Log
    log = AIInteractionLog.objects.create(
        tenant=tenant,
        user=student_user,
        feature_used="Tutor",
        prompt_tokens=20,
        completion_tokens=30,
        total_tokens=50,
    )
    print(f"Created AI Log: {log}")

    print("--- Verification Complete ---")


if __name__ == "__main__":
    verify()
