# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

import os
import sys

import django
from django.db.models import Count, Sum

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from academic.models import Student


def verify_leaderboard():
    print("Verifying Leaderboard query...", flush=True)
    try:
        # Get a class that has students.
        # Just pick the first student and use their class.
        student = Student.objects.first()
        if not student:
            print("No students found to test with.")
            return

        academic_class = student.academic_class
        print(f"Testing with class: {academic_class}")

        # Replicate the query from LeaderboardViewSet
        leaderboard_data = (
            Student.objects.filter(academic_class=academic_class)
            .select_related("user")
            .annotate(
                total_points=Sum("points__points"),
                badges_count=Count("badges", distinct=True),
            )
            .order_by("-total_points")[:50]
        )

        print(f"Query executed successfully. Found {len(leaderboard_data)} students.")

        for i, s in enumerate(leaderboard_data):
            try:
                name = f"{s.user.first_name} {s.user.last_name}"
                print(
                    f"Rank {i+1}: {name} (User ID: {s.user.id}, Student ID: {s.student_id})"
                )
            except Exception as e:
                print(f"Error accessing user for student {s.student_id}: {e}")
                # If select_related works as expected, we should NOT hit this for the returned students.

        print("Verification COMPLETE: Success.")

    except Exception as e:
        print(f"Verification FAILED with error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    verify_leaderboard()
