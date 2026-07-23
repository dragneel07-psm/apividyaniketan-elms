# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django

# Setup Django
sys.path.append("/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.contrib.auth import get_user_model

# Imports that depend on settings must come after django.setup()
from rest_framework.test import APIClient

from academic.models import AcademicClass, Subject
from academic.models.lesson import Chapter, Lesson


def verify_api():
    print("Verifying Lesson API...")

    # 1. Setup User
    User = get_user_model()
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        print("No superuser found.")
        return

    client = APIClient()
    client.force_authenticate(user=user)
    client.defaults["HTTP_HOST"] = "localhost"

    # 2. Create Prerequisites
    academic_class = AcademicClass.objects.first()
    if not academic_class:
        academic_class = AcademicClass.objects.create(name="Test Class", order=1)

    # Clean up any existing test data
    Subject.objects.filter(name="API Test Subject").delete()

    subject = Subject.objects.create(
        name="API Test Subject", academic_class=academic_class
    )
    print(f"Subject Created: {subject.id}")

    # 4. Test Chapter Creation
    chapter_data = {"subject": subject.id, "title": "API Test Chapter", "order": 99}

    print("Testing Chapter Creation...")
    response = client.post("/api/academic/chapters/", chapter_data, format="json")
    if response.status_code == 201:
        print("Chapter Created:", response.data["id"])
        chapter_id = response.data["id"]
    else:
        print("Chapter Creation Failed:", response.status_code, response.data)
        return

    # 5. Test Lesson Creation
    lesson_data = {
        "chapter": chapter_id,
        "title": "API Test Lesson",
        "content": "Test content",
        "order": 1,
    }

    print("Testing Lesson Creation...")
    response = client.post("/api/academic/lessons/", lesson_data, format="json")
    if response.status_code == 201:
        print("Lesson Created:", response.data["id"])
    else:
        print("Lesson Creation Failed:", response.status_code, response.data)
        return

    # 6. Test Listing
    print("Testing Listing...")
    response = client.get(f"/api/academic/chapters/{chapter_id}/")
    if response.status_code == 200:
        lessons = response.data.get("lessons", [])
        print(f"Chapter Detail lessons count: {len(lessons)}")
        if len(lessons) > 0:
            print("SUCCESS: Lesson found in Chapter detail.")
        else:
            print("FAILURE: Lesson list empty.")
    else:
        print("Chapter Get Failed")

    # Cleanup
    print("Cleaning up...")
    subject.delete()


if __name__ == "__main__":
    verify_api()
