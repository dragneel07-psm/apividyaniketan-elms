# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django

# Add the project root to the path
sys.path.append(os.getcwd())

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from users.models import UserAccount


def create_test_user(username, password, role):
    try:
        user = UserAccount.objects.get(username=username)
        user.set_password(password)
        user.role = role
        user.save()
        print(f"Updated user: {username} with role {role}")
    except UserAccount.DoesNotExist:
        UserAccount.objects.create_user(username=username, password=password, role=role)
        print(f"Created user: {username} with role {role}")


if __name__ == "__main__":
    create_test_user("student", "student", "student")
    create_test_user("teacher", "teacher", "teacher")
    create_test_user("admin", "admin", "admin")
