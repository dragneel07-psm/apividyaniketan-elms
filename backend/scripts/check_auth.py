# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os

import django
from django.contrib.auth.hashers import check_password

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from users.models import UserAccount


def test_password(email, password, db):
    try:
        user = UserAccount.objects.using(db).get(email=email)
        match = check_password(password, user.password)
        print(f"DB: {db} | User: {email} | Password: {password} | Match: {match}")
    except UserAccount.DoesNotExist:
        print(f"DB: {db} | User: {email} NOT FOUND")


if __name__ == "__main__":
    test_password("saas@demo.com", "admin123", "default")
    test_password("saas@demo.com", "admin123", "school_demo")
