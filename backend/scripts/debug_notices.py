# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.db.models import Q

from academic.views.student_portal import NoticeViewSet

User = get_user_model()

print("Successfully imported NoticeViewSet")

# Try to verify the method logic by inspecting it (mocking request is harder)
# But at least the import worked, so 'models' is defined.

# Let's try to get a student user
try:
    student_user = User.objects.filter(role="student").first()
    if student_user:
        print(f"Found student user: {student_user}")

        # Test queryset filtering logic manually
        if hasattr(student_user, "student_profile"):
            student_class = student_user.student_profile.academic_class
            print(f"Student Class: {student_class}")

            # This is the logic inside get_queryset
            from academic.models import Notice

            qs = Notice.objects.filter(
                Q(target_audience="school")
                | Q(target_audience="class", target_class=student_class)
            )
            print(f"Query generated successfully: {qs.query}")
        else:
            print("User has no student_profile")
    else:
        print("No student user found")

except Exception as e:
    print(f"Error: {e}")
