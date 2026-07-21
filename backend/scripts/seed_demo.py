# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from datetime import timedelta

from django.utils import timezone
from django_tenants.utils import schema_context

with schema_context("demo"):
    from academic.models import AcademicClass, Assessment, Section, Subject, Teacher
    from users.models import UserAccount

    cls_10, _ = AcademicClass.objects.get_or_create(
        name="Class 10", defaults={"grade_level": 10}
    )
    sec_a, _ = Section.objects.get_or_create(academic_class=cls_10, name="A")
    sec_b, _ = Section.objects.get_or_create(academic_class=cls_10, name="B")

    math_user = UserAccount.objects.get(email="math@demo.school")
    math_teacher = math_user.teacher_profile
    math_teacher.assigned_classes.set([cls_10])

    sci_user = UserAccount.objects.get(email="science@demo.school")
    sci_teacher = sci_user.teacher_profile
    sci_teacher.assigned_classes.set([cls_10])

    # Create Subjects
    math_sub, _ = Subject.objects.get_or_create(
        name="Mathematics",
        academic_class=cls_10,
        defaults={"code": "MATH10", "teacher": math_teacher, "credits": 4.0},
    )
    Subject.objects.filter(id=math_sub.id).update(
        teacher=math_teacher
    )  # ensure teacher

    sci_sub, _ = Subject.objects.get_or_create(
        name="Science",
        academic_class=cls_10,
        defaults={"code": "SCI10", "teacher": sci_teacher, "credits": 4.0},
    )
    Subject.objects.filter(id=sci_sub.id).update(teacher=sci_teacher)

    # Create assessments for Math
    Assessment.objects.get_or_create(
        subject=math_sub,
        title="Mid-Term Math Quiz",
        defaults={
            "type": "quiz",
            "total_marks": 50,
            "due_date": timezone.now() + timedelta(days=7),
        },
    )

    print("Seed complete. Added Classes, Sections, Subjects, and mapped Teachers.")
