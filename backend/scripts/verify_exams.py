# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys
import uuid

import django
from django.conf import settings
from django.db import connections

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from academic.models import (
    AcademicClass,
    Assessment,
    Exam,
    ExamSeating,
    Section,
    Student,
    Subject,
)
from academic.services.exam_service import ExamService
from core.middleware.tenant import clear_current_tenant, set_current_tenant
from core.models.tenant import Tenant
from users.models import UserAccount


def setup_tenant_db(tenant):
    """Ensure the tenant database is registered in Django settings."""
    if tenant.db_alias not in settings.DATABASES:
        db_config = settings.DATABASES["default"].copy()
        db_path = settings.BASE_DIR / tenant.db_name
        db_config["NAME"] = str(db_path)
        settings.DATABASES[tenant.db_alias] = db_config
        connections.databases[tenant.db_alias] = db_config
    return tenant.db_alias


def ensure_test_data(db_alias):
    """Ensures at least one active student exists for testing."""
    # Find or create a section
    section = Section.objects.using(db_alias).first()
    if not section:
        academic_class = AcademicClass.objects.using(db_alias).first()
        if not academic_class:
            academic_class = AcademicClass.objects.using(db_alias).create(
                name="Grade 10", level=10
            )
        section = Section.objects.using(db_alias).create(
            name="A", academic_class=academic_class
        )
        print(f"✅ Created Section: {section}")

    # Ensure section has a student
    student = (
        Student.objects.using(db_alias)
        .filter(section=section, user__is_active=True)
        .first()
    )
    if not student:
        print("ℹ️ No active student found in section. Creating test student...")
        # Creation of UserAccount (Shared DB)
        username = f"test_exam_student_{uuid.uuid4().hex[:6]}"
        user = UserAccount.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="password123",
            role="student",
        )
        # Creation of Student Profile (Tenant DB)
        student = Student.objects.using(db_alias).create(
            user=user, section=section, academic_class=section.academic_class
        )
        print(f"✅ Created Test Student: {student}")

    # Ensure an exam assessment exists for this section
    assessment = (
        Assessment.objects.using(db_alias).filter(section=section, type="exam").first()
    )
    if not assessment:
        subject = (
            Subject.objects.using(db_alias)
            .filter(academic_class=section.academic_class)
            .first()
        )
        if not subject:
            subject = Subject.objects.using(db_alias).create(
                name="Mathematics",
                code="MATH101",
                academic_class=section.academic_class,
            )
        assessment = Assessment.objects.using(db_alias).create(
            title="Final Term Exam",
            subject=subject,
            section=section,
            type="exam",
            total_marks=100,
            passing_marks=40,
        )
        print(f"✅ Created Test Assessment: {assessment.title}")

    return assessment


def verify_seating_allocation():
    print("🧪 Starting Exam Seating Allocation Verification...")

    try:
        tenant = Tenant.objects.get(subdomain="demo")
        db_alias = setup_tenant_db(tenant)
        set_current_tenant(tenant, db_alias)
        print(f"✅ Context: {tenant.name} | DB: {db_alias}")

    except Tenant.DoesNotExist:
        print("❌ Demo tenant not found.")
        return

    try:
        # 1. Ensure Data
        assessment = ensure_test_data(db_alias)

        # 2. Create/Get Exam
        exam, created = Exam.objects.using(db_alias).get_or_create(
            assessment=assessment,
            defaults={
                "seating_capacity": 100,
                "exam_center": "Great Hall",
                "hall_ticket_prefix": "EXAM-2026",
            },
        )
        if created:
            print(f"✅ Created Exam: {exam.exam_id}")
        else:
            # Force update capacity if it was too small
            exam.seating_capacity = 100
            exam.save(using=db_alias)
            print(f"ℹ️ Using Exam: {exam.exam_id}")

        # 3. Allocate Seating
        print("\n🚀 Allocating Seating...")
        count = ExamService.allocate_seating(exam.exam_id)
        print(f"✅ Allocated {count} students.")

        # 4. Verify
        seating_list = ExamSeating.objects.using(db_alias).filter(exam=exam)
        if seating_list.exists():
            print(f"📊 Success: {seating_list.count()} seating records verified.")
            for s in seating_list:
                print(
                    f"   - {s.student.user.username}: Seat {s.seat_number}, Hall Ticket: {s.hall_ticket_number}"
                )
        else:
            print("❌ Failure: No seating records found.")

        # 5. Publish
        print("\n📢 Publishing Exam...")
        ExamService.publish_exam(exam.exam_id)
        exam.refresh_from_db(using=db_alias)
        print(f"✅ Status: {'Published' if exam.is_published else 'Draft'}")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
    finally:
        clear_current_tenant()
        print("\n🧹 Cleaned up.")


if __name__ == "__main__":
    verify_seating_allocation()
