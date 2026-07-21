# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

import os
import sys

import django

# Setup Django standalone
sys.path.append("/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from rest_framework.test import APIClient

from academic.models import AcademicClass, Notice, Student
from users.models import UserAccount


def run_verification():
    print("🛠️ Starting Communication Module Verification...")
    from django_tenants.utils import schema_context

    with schema_context("demo"):
        # 1. Setup Data
        teacher_user = UserAccount.objects.filter(role="teacher").first()
        student_user = UserAccount.objects.filter(role="student").first()

        if not teacher_user or not student_user:
            print("❌ Teacher or Student not found.")
            return

        # Ensure student has a profile and class
        student_profile = getattr(student_user, "student_profile", None)
        if not student_profile:
            # Try to find or create
            Student.objects.get_or_create(
                user=student_user,
                defaults={"first_name": "Test", "last_name": "Student"},
            )
            student_profile = student_user.student_profile

        # Assign class if missing
        if not student_profile.academic_class:
            ac_class = AcademicClass.objects.first() or AcademicClass.objects.create(
                name="Grade 10", order=10
            )
            student_profile.academic_class = ac_class
            student_profile.save()
            print(f"⚠️ Assigned Class {ac_class.name} to student")

        target_class = student_profile.academic_class

        # 2. Test Create Notice (Teacher)
        client = APIClient()
        client.force_authenticate(user=teacher_user)

        notice_data = {
            "title": "Test Notice for Class",
            "content": "This is a test notice.",
            "category": "Academic",
            "priority": "high",
            "target_audience": "class",
            "target_class": target_class.id,
        }

        print(f"📤 Creating notice for class {target_class.name}...")
        res = client.post("/api/academic/notices/", notice_data, format="json")

        if res.status_code == 201:
            print("✅ Create Notice: Success")
            notice_id = res.data["notice_id"]
        else:
            print(f"❌ Create Notice Failed: {res.data}")
            return

        # 3. Test View Notice (Student in Class)
        client.force_authenticate(user=student_user)
        print("📥 Fetching notices as student...")
        res_list = client.get("/api/academic/notices/")

        if res_list.status_code == 200:
            notices = res_list.data
            found = any(n["notice_id"] == notice_id for n in notices)
            if found:
                print("✅ Notice Visible to Student: Success")
            else:
                print("❌ Notice NOT Visible to Student (Failed)")
                print(
                    f"Student Class: {student_profile.academic_class.id}, Notice Class: {target_class.id}"
                )
        else:
            print(f"❌ Fetch Notices Failed: {res_list.status_code}")

        # Cleanup
        Notice.objects.filter(notice_id=notice_id).delete()
        print("🧹 Cleanup complete.")


if __name__ == "__main__":
    try:
        run_verification()
    except Exception as e:
        print(f"💥 CRASH: {e}")
