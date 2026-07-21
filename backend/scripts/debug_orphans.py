# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

from academic.models import Student
from users.models import UserAccount


def clean_orphans():
    # Based on 500 error dump, the tenant DB is 'demo_school'
    tenant_db = "demo_school"
    # Users are likely in 'default'
    user_db = "default"

    print(f"Checking for orphan students in '{tenant_db}'...")

    try:
        students = Student.objects.using(tenant_db).all()
        print(f"Total students scanned: {students.count()}")

        orphans = []
        for student in students:
            user_id = student.user_id
            if not user_id:
                print(f"  [NULL] Student {student.student_id} has no user_id (Orphan)")
                orphans.append(student)
                continue

            # Check if user exists in the user_db
            if not UserAccount.objects.using(user_db).filter(id=user_id).exists():
                print(
                    f"  [ORPHAN] Student {student.student_id} references User {user_id} (Not found in {user_db})"
                )
                orphans.append(student)
            else:
                # Optionally print success? noisy if many.
                pass

        if orphans:
            print(f"\nFound {len(orphans)} orphan student records. Deleting...")
            for orphan in orphans:
                orphan.delete()
            print("Successfully deleted all orphan student records.")
        else:
            print("\nNo orphan student records found.")

    except Exception as e:
        print(f"An error occurred: {e}")
        # Print available databases to help debug if 'demo_school' is wrong
        from django.conf import settings

        print(f"Available databases: {list(settings.DATABASES.keys())}")


clean_orphans()
