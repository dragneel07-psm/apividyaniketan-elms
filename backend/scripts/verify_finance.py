# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys

import django
from django.utils import timezone

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django_tenants.utils import schema_context
from rest_framework.test import APIClient

from academic.models import AcademicClass, Student
from billing.models import FeeStructure, Payment, StudentFee
from users.models import UserAccount


def run_verification():
    print("💰 Starting Finance Module Verification...")

    with schema_context("demo"):
        # 1. Setup Data
        try:
            admin_user = (
                UserAccount.objects.filter(role="admin").first()
                or UserAccount.objects.filter(is_superuser=True).first()
            )
            student = Student.objects.first()
            if not student:
                print("❌ No student found. Please create one.")
                return

            academic_class = student.academic_class
            if not academic_class:
                print("⚠️ Student has no class. Assigning 'Grade 10'.")
                academic_class, _ = AcademicClass.objects.get_or_create(name="Grade 10")
                student.academic_class = academic_class
                student.save()

            print(f"👤 Using Student: {student} (Class: {academic_class})")

            # 2. Create Fee Structure
            print("🏗️ Creating Fee Structure...")
            fee_structure, created = FeeStructure.objects.get_or_create(
                name="Verification Tuition Fee",
                defaults={
                    "amount": 1000.00,
                    "frequency": "one_time",
                    "tenant": student.user.tenant,
                    "academic_class": academic_class,
                },
            )
            print(f"✅ Fee Structure: {fee_structure.name} (${fee_structure.amount})")

            # 3. Assign Fee to Student (Simulating Bulk Assign or Manual)
            print("📝 Assigning Fee to Student...")
            # Clean up old test fees
            StudentFee.objects.filter(
                student=student, fee_structure=fee_structure
            ).delete()

            student_fee = StudentFee.objects.create(
                tenant=student.user.tenant,
                student=student,
                fee_structure=fee_structure,
                amount_due=fee_structure.amount,
                due_date=timezone.now().date(),
                status="pending",
            )
            print(f"✅ Assigned. Status: {student_fee.status}")

            # 4. Record Partial Payment
            print("💸 Recording Partial Payment ($400)...")
            client = APIClient()
            client.force_authenticate(user=admin_user)

            payment_data = {
                "student": student.id,
                "student_fee": student_fee.student_fee_id,
                "amount": 400.00,
                "method": "cash",
            }
            res = client.post("/api/billing/payments/", payment_data, format="json")

            if res.status_code == 201:
                print("✅ Payment 1 Recorded")
                student_fee.refresh_from_db()
                print(
                    f"   Fee Status: {student_fee.status} (Paid: {student_fee.amount_paid}/{student_fee.amount_due})"
                )

                if student_fee.status != "partial":
                    print("❌ Fee status should be 'partial'")
            else:
                print(f"❌ Payment Failed: {res.data}")
                return

            # 5. Record Remaining Payment
            print("💸 Recording Remaining Payment ($600)...")
            payment_data["amount"] = 600.00
            res = client.post("/api/billing/payments/", payment_data, format="json")

            if res.status_code == 201:
                print("✅ Payment 2 Recorded")
                student_fee.refresh_from_db()
                print(
                    f"   Fee Status: {student_fee.status} (Paid: {student_fee.amount_paid}/{student_fee.amount_due})"
                )

                if student_fee.status == "paid":
                    print("🎉 Fee Verification Complete: Status is PAID!")
                else:
                    print("❌ Fee status should be 'paid'")
            else:
                print(f"❌ Payment 2 Failed: {res.data}")

        except Exception as e:
            print(f"💥 CRASH: {e}")
            import traceback

            traceback.print_exc()


if __name__ == "__main__":
    run_verification()
