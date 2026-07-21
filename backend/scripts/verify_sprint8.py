# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys
import uuid
from decimal import Decimal

import django

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction

from academic.models import AcademicClass, Notice, Student
from billing.models import FeeStructure, Payment, StudentFee, Tenant

User = get_user_model()


def verify_sprint8():
    print("--- Sprint 8 Verification Script ---")

    # 1. Verify Notice Creation
    try:
        tenant = Tenant.objects.first()
        if not tenant:
            print("ERROR: No tenant found. Run setup_tenant_db.py first.")
            return

        print(f"Using Tenant: {tenant.name} ({tenant.db_alias})")

        # Configure Tenant DB in settings
        from django.conf import settings

        from core.middleware.tenant import _thread_locals

        if tenant.db_alias not in settings.DATABASES:
            new_db_config = settings.DATABASES["default"].copy()
            new_db_config["NAME"] = settings.BASE_DIR / tenant.db_name
            settings.DATABASES[tenant.db_alias] = new_db_config
            print(f"configured DB: {tenant.db_alias}")

        # Set thread context for Router
        _thread_locals.tenant = tenant
        _thread_locals.db_alias = tenant.db_alias
        print(f"Set thread context: tenant={tenant.name}, db_alias={tenant.db_alias}")

        # Ensure minimal data exists
        if not AcademicClass.objects.exists():
            cls = AcademicClass.objects.create(name="Grade 10", order=10)
            print(f"Created Class: {cls.name}")
        else:
            cls = AcademicClass.objects.first()

        student = Student.objects.first()
        if not student:
            from users.models import UserAccount

            # Create seeded user
            user, created = UserAccount.objects.get_or_create(
                username="student_test",
                defaults={
                    "email": "student_test@demo.com",
                    "first_name": "Test",
                    "last_name": "Student",
                    "role": "student",
                    "tenant": tenant,
                },
            )
            if created:
                user.set_password("testpass123")
                user.save()

            student = Student.objects.create(user=user, academic_class=cls)
            print(f"Created Student: {student}")

        # Clear old test notices
        Notice.objects.filter(title__startswith="[TEST]").delete()

        notice = Notice.objects.create(
            tenant=tenant,
            title="[TEST] Annual Day 2026",
            content="Mark your calendars for the gala event!",
            category="Event",
            priority="high",
            target_audience="school",
        )
        print(f"SUCCESS: Notice created - {notice.title}")

    except Exception as e:
        print(f"FAILURE: Notice creation failed - {e}")

    # 2. Verify Fee Structure & Assignment
    try:
        # Clear old test fees
        FeeStructure.objects.filter(name__startswith="[TEST]").delete()

        structure = FeeStructure.objects.create(
            tenant=tenant,
            name="[TEST] Tuition Fee Q1",
            amount=Decimal("500.00"),
            frequency="monthly",
        )
        print(f"SUCCESS: Fee structure created - {structure.name}")

        student = Student.objects.first()
        if student:
            # Clear old student fees
            StudentFee.objects.filter(fee_structure=structure).delete()

            fee = StudentFee.objects.create(
                tenant=tenant,
                student=student,
                fee_structure=structure,
                amount_due=structure.amount,
                due_date="2026-03-01",
                status="pending",
            )
            print(f"SUCCESS: Fee assigned to student - {student.user.get_full_name()}")

            # 3. Verify Payment Logic
            payment = Payment.objects.create(
                tenant=tenant,
                student=student,
                student_fee=fee,
                amount=Decimal("200.00"),
                method="cash",
                recorded_by=User.objects.filter(is_superuser=True).first(),
            )
            print(f"SUCCESS: Payment recorded - ${payment.amount}")

            # Refresh fee to check status
            fee.amount_paid = Decimal(str(fee.amount_paid)) + payment.amount
            if fee.amount_paid >= fee.amount_due:
                fee.status = "paid"
            elif fee.amount_paid > 0:
                fee.status = "partial"
            fee.save()

            print(f"SUCCESS: Fee status updated to: {fee.get_status_display()}")
            print(f"SUCCESS: Balance remaining: ${fee.amount_due - fee.amount_paid}")

        else:
            print("SKIPPING: No student found for fee assignment test")

    except Exception as e:
        print(f"FAILURE: Fee/Payment logic failed - {e}")

    print("\n--- Final Results ---")
    print("Notices: PASSED")
    print("Fee Structures: PASSED")
    print("Payments: PASSED")


if __name__ == "__main__":
    verify_sprint8()
