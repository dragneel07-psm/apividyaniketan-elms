# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import json
import os

import django
import requests

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from urllib.parse import urljoin

from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import UserAccount

with schema_context("demo"):
    teacher = UserAccount.objects.get(email="math@demo.school")
    refresh = RefreshToken.for_user(teacher)
    token = str(refresh.access_token)

    from academic.models import Subject

    math_sub = Subject.objects.filter(name="Mathematics").first()
    if math_sub:
        subject_id = math_sub.id
        print("Using Subject ID:", subject_id)

        headers = {
            "Authorization": f"Bearer {token}",
            "x-tenant-id": "demo",
            "Content-Type": "application/json",
        }

        data = {
            "title": "Test Assessment from Script",
            "description": "Just testing the API endpoint.",
            "subject": subject_id,
            "type": "quiz",
            "total_marks": 50,
            "duration_minutes": 60,
            "due_date": "2026-03-01T12:00:00Z",
        }

        response = requests.post(
            "http://127.0.0.1:8000/api/academic/assessments/",
            headers=headers,
            json=data,
        )
        print("Status Code:", response.status_code)
        print("Response Body:", response.text)
    else:
        print("Could not find Math subject!")
