# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import sys
from datetime import timedelta

import django
from django.utils import timezone

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django_tenants.utils import schema_context

from academic.models import AcademicClass, Attendance, Section, Student, Subject
from billing.models import FeeStructure, StudentFee
from notifications.models import Notification
from users.models import UserAccount


def verify_alerts():
    print("🧪 Verifying Automated Alerts...")

    with schema_context("demo"):
        # 1. Setup Student
        student = Student.objects.first()
        if not student:
            print("❌ No student found")
            return

        print(f"👤 Testing with Student: {student}")

        # 2. Create Overdue Fee
        print("   Creating Overdue Fee...")
        fee_struct, _ = FeeStructure.objects.get_or_create(
            name="Test Overdue Fee",
            defaults={
                "amount": 50,
                "frequency": "one_time",
                "tenant": student.user.tenant,
            },
        )
        StudentFee.objects.create(
            tenant=student.user.tenant,
            student=student,
            fee_structure=fee_struct,
            amount_due=50,
            due_date=timezone.now().date() - timedelta(days=5),  # 5 days ago
            status="pending",
        )

        # 3. Create Low Attendance Data
        print("   Creating Low Attendance Data...")
        # Create 10 absent records
        academic_class = student.academic_class
        try:
            # Try to get a valid section/subject to make attendance valid
            # Assuming simple model for now or just creating records
            if academic_class:
                for i in range(10):
                    Attendance.objects.create(
                        tenant=student.user.tenant,
                        student=student,
                        date=timezone.now().date() - timedelta(days=i),
                        status="absent",
                    )
        except Exception as e:
            print(f"   ⚠️ Could not create attendance records: {e}")

        # 4. Run Alerts Script
        print("🚀 Running Alert Script...")
        # Import dynamically to avoid package issues
        try:
            from scripts.run_alerts import run_alerts
        except ImportError:
            # Fallback if running from within scripts folder or path issues
            sys.path.append(os.path.dirname(os.path.abspath(__file__)))
            from run_alerts import run_alerts

        run_alerts()

        # 5. Verify Notifications
        print("🔍 Verifying Notifications...")
        notifs = Notification.objects.filter(recipient=student.user, is_read=False)

        fee_alert = notifs.filter(title__contains="Overdue Fee").exists()
        att_alert = notifs.filter(title__contains="Low Attendance").exists()

        if fee_alert:
            print("✅ Fee Alert Created")
        else:
            print("❌ Fee Alert Missing")

        if att_alert:
            print("✅ Attendance Alert Created")
        else:
            print("❌ Attendance Alert Missing")

        # Cleanup
        Notification.objects.filter(recipient=student.user).delete()
        StudentFee.objects.filter(fee_structure__name="Test Overdue Fee").delete()


if __name__ == "__main__":
    verify_alerts()
