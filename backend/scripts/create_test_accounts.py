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

from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context, tenant_context

from core.models.tenant import Tenant

User = get_user_model()


def create_account(
    username,
    email,
    password,
    role,
    first_name="",
    last_name="",
    is_superuser=False,
    tenant=None,
):
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "role": role,
            "tenant": tenant,
            "is_staff": is_superuser,
            "is_superuser": is_superuser,
        },
    )
    if not created:
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.role = role
        user.is_staff = is_superuser
        user.is_superuser = is_superuser

    user.set_password(password)
    user.save()
    status = "Created" if created else "Updated"
    print(f"✅ {status} {role.capitalize()}: {username} / {password}")
    return user


def setup_test_accounts():
    print("🚀 Starting Test Accounts Setup for django-tenants Architecture...")

    # SaaS Admin (created in public schema)
    with schema_context("public"):
        print("--- Public Schema Context ---")
        saas_admin = create_account(
            "saas_admin",
            "saas@demo.com",
            "saas123",
            "saas_admin",
            "SaaS",
            "Admin",
            is_superuser=True,
        )

    # 1. Fetch Demo Tenant
    tenant = Tenant.objects.filter(schema_name="demo_school").first()
    if not tenant:
        print(
            "❌ Cannot find 'demo_school' tenant. Run python setup_tenant_db.py first!"
        )
        return

    print(f"✅ Found Tenant record: {tenant.name} (Schema: {tenant.schema_name})")

    # 2. Automatically scope all queries inside the 'with tenant_context' block to the target school's schema
    with tenant_context(tenant):
        print("\n--- Tenant Context Context: {tenant.name} ---")
        from academic.models import (
            AcademicClass,
            Chapter,
            Parent,
            Section,
            Student,
            Subject,
            Teacher,
        )

        # School Admin (Admin role)
        school_admin = create_account(
            "school_admin",
            "admin@demo.com",
            "admin123",
            "admin",
            "School",
            "Administrator",
            tenant=tenant,
        )

        # Academic Classes
        academic_class, _ = AcademicClass.objects.get_or_create(
            name="Grade 10", defaults={"order": 10}
        )
        section, _ = Section.objects.get_or_create(
            name="A", academic_class=academic_class, defaults={"capacity": 40}
        )
        print(f"✅ Setup Academic Class: {academic_class.name}")

        # Teacher
        teacher_user = create_account(
            "teacher_test",
            "teacher@demo.com",
            "teacher123",
            "teacher",
            "Test",
            "Teacher",
            tenant=tenant,
        )
        teacher_profile, created = Teacher.objects.get_or_create(user=teacher_user)
        if created:
            teacher_profile.designation = "subject_teacher"
            teacher_profile.save()
            print(f"   - Created Teacher Profile")

        # Subjects
        physics, _ = Subject.objects.get_or_create(
            name="Physics",
            academic_class=academic_class,
            defaults={"credits": 4.0, "teacher": teacher_profile},
        )
        if not _:  # Update if exists
            physics.teacher = teacher_profile
            physics.save()

        maths, _ = Subject.objects.get_or_create(
            name="Mathematics",
            academic_class=academic_class,
            defaults={"credits": 5.0, "teacher": teacher_profile},
        )
        if not _:
            maths.teacher = teacher_profile
            maths.save()

        print(
            f"✅ Setup Subjects: Physics, Mathematics (Assigned to {teacher_user.username})"
        )

        # Chapters
        ch1, _ = Chapter.objects.get_or_create(
            subject=physics,
            title="Mechanics: Motion in One Dimension",
            defaults={"order": 1},
        )
        ch2, _ = Chapter.objects.get_or_create(
            subject=physics, title="Dynamics: Newton's Laws", defaults={"order": 2}
        )
        print(f"✅ Setup Chapters for Physics")

        # Associate teacher with classes (ManyToMany)
        teacher_profile.assigned_classes.add(academic_class)
        print(f"✅ Assigned Teacher to Class: {academic_class.name}")

        # Student
        student_user = create_account(
            "student_test",
            "student@demo.com",
            "student123",
            "student",
            "Test",
            "Student",
            tenant=tenant,
        )
        student_profile, created = Student.objects.get_or_create(
            user=student_user,
            defaults={
                "academic_class": academic_class,
                "section": section,
                "learning_style": "visual",
                "daily_study_goal": 60,
                "ai_explanation_level": "normal",
                "current_streak": 7,
                "focus_score": 85,
            },
        )
        if created:
            print(f"   - Created Student Profile (Grade 10-A)")
        else:
            student_profile.academic_class = academic_class
            student_profile.section = section
            student_profile.save()
            print(f"   - Updated Student Profile")

        # Parent
        parent_user = create_account(
            "parent_test",
            "parent@demo.com",
            "parent123",
            "parent",
            "Test",
            "Parent",
            tenant=tenant,
        )
        parent_profile, created = Parent.objects.get_or_create(
            user=parent_user, defaults={}
        )
        parent_profile.students.add(student_profile)
        if created:
            print(
                f"✅ Created Parent Profile (linked to {student_profile.user.first_name})"
            )
        else:
            print(f"✅ Updated Parent Profile")

    print("\n🎉 Test accounts setup complete!")


if __name__ == "__main__":
    setup_test_accounts()
