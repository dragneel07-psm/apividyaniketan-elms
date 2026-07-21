# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

import os
import sys
from io import BytesIO

import django
import requests

# Setup Django standalone
sys.path.append("/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from academic.models import (
    AcademicClass,
    Chapter,
    Lesson,
    LessonMaterial,
    Subject,
    Teacher,
)
from users.models import UserAccount


def run_verification():
    print("🛠️ Starting Course Management Verification...")

    # Ensure tenant context
    from django_tenants.utils import schema_context

    with schema_context("demo"):
        # 1. Setup Data
        teacher_user = UserAccount.objects.filter(role="teacher").first()
        if not teacher_user:
            print("❌ No teacher found.")
            return

        subject = Subject.objects.first()
        if not subject:
            # Create dummy subject if none exists
            ac_class = AcademicClass.objects.first() or AcademicClass.objects.create(
                name="Grade 10", order=10
            )
            teacher = Teacher.objects.filter(
                user=teacher_user
            ).first() or Teacher.objects.create(
                user=teacher_user, first_name="Test", last_name="Teacher"
            )
            subject = Subject.objects.create(
                name="Physics 101",
                code="PHY101",
                academic_class=ac_class,
                teacher=teacher,
            )
            print("⚠️ Created dummy subject Physics 101")

        print(f"✅ Using Subject: {subject.name} (ID: {subject.id})")

        # 2. Extract Client Logic (Simulate Frontend calls)
        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(user=teacher_user)

        # Test Get Chapters
        response = client.get(f"/api/academic/chapters/?subject={subject.id}")
        if response.status_code == 200:
            print("✅ Fetch Chapters: Success")
        else:
            print(f"❌ Fetch Chapters Failed: {response.status_code}")

        # Test Create Chapter
        chapter_data = {"subject": subject.id, "title": "Test Chapter 1", "order": 1}
        res_chap = client.post("/api/academic/chapters/", chapter_data, format="json")
        if res_chap.status_code == 201:
            print("✅ Create Chapter: Success")
            chapter_id = res_chap.data["id"]
        else:
            print(f"❌ Create Chapter Failed: {res_chap.data}")
            return

        # Test Create Lesson
        lesson_data = {
            "chapter": chapter_id,
            "title": "Test Lesson 1.1",
            "order": 1,
            "content": "<p>This is a test lesson content.</p>",
            "duration_minutes": 45,
            "is_published": True,
        }
        res_less = client.post("/api/academic/lessons/", lesson_data, format="json")
        if res_less.status_code == 201:
            print("✅ Create Lesson: Success")
            lesson_id = res_less.data["id"]
        else:
            print(f"❌ Create Lesson Failed: {res_less.data}")
            return

        # Test Upload Material
        # Create dummy file
        dummy_file = BytesIO(b"dummy pdf content")
        dummy_file.name = "test_material.pdf"

        material_data = {
            "lesson": lesson_id,
            "title": "Lecture Notes",
            "material_type": "pdf",
            "file": dummy_file,
        }

        # Use multipart format for file upload
        res_mat = client.post(
            "/api/academic/materials/", material_data, format="multipart"
        )
        if res_mat.status_code == 201:
            print("✅ Upload Material: Success")
        else:
            print(f"❌ Upload Material Failed: {res_mat.data}")

        # Cleanup
        # Chapter delete cascades to lessons and materials
        Chapter.objects.filter(id=chapter_id).delete()
        print("🧹 Cleanup complete.")


if __name__ == "__main__":
    try:
        run_verification()
    except Exception as e:
        print(f"💥 CRASH: {e}")
