# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from academic.models import AcademicClass, Subject, Teacher
from users.models import UserAccount

teacher_user = UserAccount.objects.filter(role="teacher").first()
if teacher_user:
    print(f"Teacher user: {teacher_user.email}")
    teacher = getattr(teacher_user, "teacher_profile", None)
    if teacher:
        print(f"Teacher profile: {teacher.teacher_id}")
        print(f"Assigned classes: {list(teacher.assigned_classes.all())}")
        print(
            f"Subjects for these classes: {[Subject.objects.filter(academic_class=c) for c in teacher.assigned_classes.all()]}"
        )
    else:
        print("No teacher profile attached.")
else:
    print("No teacher user found.")
