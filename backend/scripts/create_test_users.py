#!/usr/bin/env python
# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

"""
create_test_users.py  ─  Idempotent dummy user seed
─────────────────────────────────────────────────────
Roles created:
  • 1 SaaS Admin   (public schema, Django superuser)
  • 1 School Admin  (demo tenant)
  • 2 Teachers      (demo tenant)
  • 3 Students      (demo tenant)
  • 1 Parent        (demo tenant)

Run:
  cd backend
  DJANGO_SETTINGS_MODULE=config.settings.local .venv/bin/python create_test_users.py
"""

import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django_tenants.utils import schema_context

from core.models import Tenant
from core.models.tenant import Domain

# ─── helpers ────────────────────────────────────────────────
G = "\033[92m"
Y = "\033[93m"
R = "\033[91m"
C = "\033[96m"
B = "\033[1m"
X = "\033[0m"


def ok(m):
    print(f"  {G}✅ {m}{X}")


def skip(m):
    print(f"  {Y}⏭  {m}{X}")


def fail(m):
    print(f"  {R}❌ {m}{X}")


def hdr(m):
    print(f"\n{B}{C}{'─'*52}\n  {m}\n{'─'*52}{X}")


def upsert_user(
    UserAccount,
    *,
    email,
    username,
    first_name,
    last_name,
    role,
    password,
    is_staff=False,
    is_superuser=False,
    tenant=None,
):
    """Create or fully update a user – idempotent."""
    try:
        user = UserAccount.objects.get(email=email)
        # Update all mutable fields
        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        user.role = role
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        if tenant:
            user.tenant = tenant
        user.set_password(password)
        user.save()
        skip(f"[{role.upper():<9}] {email}  (updated)")
        return user, False
    except UserAccount.DoesNotExist:
        pass

    # Also check by username (avoid unique constraint clash)
    try:
        user = UserAccount.objects.get(username=username)
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.role = role
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        if tenant:
            user.tenant = tenant
        user.set_password(password)
        user.save()
        skip(f"[{role.upper():<9}] {email}  (updated by username)")
        return user, False
    except UserAccount.DoesNotExist:
        pass

    # Fresh create
    user = UserAccount(
        email=email,
        username=username,
        first_name=first_name,
        last_name=last_name,
        role=role,
        is_staff=is_staff,
        is_superuser=is_superuser,
        tenant=tenant,
        phone_number="+977-9800000000",
        bio=f"Test {role} for local development.",
    )
    user.set_password(password)
    user.save()
    ok(f"[{role.upper():<9}] {email:<36} pwd: {password}")
    return user, True


# ─── Step 1: Ensure demo tenant ─────────────────────────────
hdr("Step 1 — Tenant & Domain")

tenant, c = Tenant.objects.get_or_create(
    schema_name="demo",
    defaults={
        "name": "Demo School",
        "type": "standard",
        "status": "active",
        "contact_email": "admin@demo.school",
        "current_academic_year": "2025-2026",
    },
)
ok("Tenant 'demo' created") if c else skip("Tenant 'demo' already exists")

domain, c = Domain.objects.get_or_create(
    domain="demo.localhost",
    defaults={"tenant": tenant, "is_primary": True},
)
(
    ok("Domain 'demo.localhost' created")
    if c
    else skip("Domain 'demo.localhost' already exists")
)


# ─── Step 2: SaaS Admin (public schema) ─────────────────────
hdr("Step 2 — SaaS Admin (public schema)")
with schema_context("public"):
    from users.models import UserAccount

    upsert_user(
        UserAccount,
        email="saas@elearning.dev",
        username="saas_admin",
        first_name="Super",
        last_name="Admin",
        role="saas_admin",
        password="Admin@1234",
        is_staff=True,
        is_superuser=True,
    )


# ─── Step 3: Tenant users (demo schema) ─────────────────────
hdr("Step 3 — School users  (schema: demo)")

USERS = [
    # role, email, username, first, last, password, is_staff
    ("admin", "admin@demo.school", "school_admin", "Ram", "Sharma", "Admin@1234", True),
    (
        "teacher",
        "math@demo.school",
        "teacher_math",
        "Sita",
        "Gurung",
        "Teacher@1234",
        False,
    ),
    (
        "teacher",
        "science@demo.school",
        "teacher_sci",
        "Hari",
        "Pradhan",
        "Teacher@1234",
        False,
    ),
    (
        "student",
        "student1@demo.school",
        "student_one",
        "Anita",
        "Tamang",
        "Student@1234",
        False,
    ),
    (
        "student",
        "student2@demo.school",
        "student_two",
        "Bikram",
        "Rai",
        "Student@1234",
        False,
    ),
    (
        "student",
        "student3@demo.school",
        "student_three",
        "Priya",
        "Thapa",
        "Student@1234",
        False,
    ),
    (
        "parent",
        "parent@demo.school",
        "parent_one",
        "Mohan",
        "Tamang",
        "Parent@1234",
        False,
    ),
]

with schema_context("demo"):
    from users.models import UserAccount as TenantUser

    tenant_users = {}
    for role, email, uname, first, last, pwd, staff in USERS:
        try:
            user, _ = upsert_user(
                TenantUser,
                email=email,
                username=uname,
                first_name=first,
                last_name=last,
                role=role,
                password=pwd,
                is_staff=staff,
                tenant=tenant,
            )
            tenant_users[email] = user
        except Exception as e:
            fail(f"[{role.upper():<9}] {email}  →  {e}")


# ─── Step 4: Profiles ───────────────────────────────
hdr("Step 4 — Student, Teacher, & Parent Profiles")

with schema_context("demo"):
    try:
        from academic.models import AcademicClass, Parent, Student, Teacher
        from users.models import UserAccount as TenantUser  # reimport in same context

        cls_obj, _ = AcademicClass.objects.get_or_create(
            name="Class 10",
        )

        # Students
        student_emails = [
            ("student1@demo.school", 1),
            ("student2@demo.school", 2),
            ("student3@demo.school", 3),
        ]
        students_created = []

        for email, roll in student_emails:
            try:
                user = TenantUser.objects.get(email=email)
                student, created = Student.objects.update_or_create(
                    user=user,
                    defaults={"academic_class": cls_obj},
                )
                students_created.append(student)
                (ok if created else skip)(
                    f"Student profile → {email} (Class 10, roll #{roll})"
                )
            except TenantUser.DoesNotExist:
                skip(f"User not found in demo schema: {email}")
            except Exception as e:
                skip(f"Student profile for {email}: {e}")

        # Teachers
        teacher_emails = [
            ("math@demo.school", "subject_teacher"),
            ("science@demo.school", "subject_teacher"),
        ]

        for email, designation in teacher_emails:
            try:
                user = TenantUser.objects.get(email=email)
                teacher, created = Teacher.objects.update_or_create(
                    user=user,
                    defaults={"designation": designation},
                )
                teacher.assigned_classes.set([cls_obj])
                (ok if created else skip)(f"Teacher profile → {email}")
            except TenantUser.DoesNotExist:
                skip(f"User not found in demo schema: {email}")
            except Exception as e:
                skip(f"Teacher profile for {email}: {e}")

        # Parents
        parent_emails = [
            ("parent@demo.school", students_created[:1]),  # bind to first student
        ]

        for email, bound_students in parent_emails:
            try:
                user = TenantUser.objects.get(email=email)
                parent, created = Parent.objects.update_or_create(
                    user=user,
                )
                if bound_students:
                    parent.students.set(bound_students)
                (ok if created else skip)(f"Parent profile → {email}")
            except TenantUser.DoesNotExist:
                skip(f"User not found in demo schema: {email}")
            except Exception as e:
                skip(f"Parent profile for {email}: {e}")

    except ImportError as e:
        skip(f"academic models unavailable: {e}")
    except Exception as e:
        skip(f"Profiles: {e}")


# ─── Final Summary ───────────────────────────────────────────
hdr("🎉  Login Credentials")
print(f"""
  {B}Frontend  →  http://localhost:3000/login{X}
  {B}Admin     →  http://localhost:8000/admin/{X}

  {B}School code (x-tenant-id):{X}  demo

  ┌──────────────┬──────────────────────────────┬──────────────────┐
  │ Role         │ Email / Username             │ Password         │
  ├──────────────┼──────────────────────────────┼──────────────────┤
  │ SaaS Admin   │ saas@elearning.dev           │ Admin@1234       │
  │ School Admin │ admin@demo.school            │ Admin@1234       │
  │ Teacher      │ math@demo.school             │ Teacher@1234     │
  │ Teacher      │ science@demo.school          │ Teacher@1234     │
  │ Student      │ student1@demo.school         │ Student@1234     │
  │ Student      │ student2@demo.school         │ Student@1234     │
  │ Student      │ student3@demo.school         │ Student@1234     │
  │ Parent       │ parent@demo.school           │ Parent@1234      │
  └──────────────┴──────────────────────────────┴──────────────────┘

  {Y}Tip: use the email address as the username when logging in.{X}
""")
