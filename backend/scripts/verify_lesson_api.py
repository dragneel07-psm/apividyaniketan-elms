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

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connections

# Imports that depend on settings must come after django.setup()
from rest_framework.test import APIClient

from academic.models import AcademicClass, Subject
from academic.models.lesson import Chapter, Lesson
from core.middleware.tenant import _thread_locals
from core.models import Tenant


def verify_api():
    print("Verifying Lesson API...")

    # 1. Setup Tenant
    try:
        tenant = Tenant.objects.get(subdomain="demo")
    except Tenant.DoesNotExist:
        tenant = Tenant.objects.first()

    if not tenant:
        print("No tenant found")
        return

    # Set thread locals for direct ORM access in the script
    _thread_locals.tenant = tenant
    _thread_locals.db_alias = tenant.db_alias
    print(f"Tenant: {tenant.subdomain}")

    # Register DB if needed
    # Tenant DBs are stored in backend/config/
    db_path = settings.BASE_DIR / "config" / tenant.db_name
    if tenant.db_alias not in settings.DATABASES:
        new_db_config = settings.DATABASES["default"].copy()
        new_db_config["NAME"] = db_path
        settings.DATABASES[tenant.db_alias] = new_db_config

    # Check if we can access the DB
    try:
        Subject.objects.using(tenant.db_alias).count()
    except Exception:
        # If connection failed, register it
        new_db_config = settings.DATABASES["default"].copy()
        new_db_config["NAME"] = db_path
        settings.DATABASES[tenant.db_alias] = new_db_config
        connections.databases[tenant.db_alias] = new_db_config

    # 2. Setup User
    User = get_user_model()
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        print("No superuser found.")
        return

    client = APIClient()
    client.force_authenticate(user=user)
    client.defaults["HTTP_X_TENANT_ID"] = tenant.subdomain
    client.defaults["HTTP_HOST"] = "localhost"

    # 3. Create Prerequisites
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
