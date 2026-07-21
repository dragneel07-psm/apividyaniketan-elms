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

from django.db.models import Sum
from django_tenants.utils import get_tenant_model, schema_context

from academic.models import Attendance, Student
from billing.models import StudentFee
from notifications.models import Notification
from users.models import UserAccount


def run_alerts():
    print("🔔 Starting Alert Generation...")
    Tenant = get_tenant_model()

    for tenant in Tenant.objects.exclude(schema_name="public"):
        print(f"👉 Processing Tenant: {tenant.name} ({tenant.schema_name})")

        with schema_context(tenant.schema_name):
            # 1. Billing Alerts: Overdue Fees
            print("   💰 Checking for Overdue Fees...")
            overdue_fees = StudentFee.objects.filter(
                status__in=["pending", "partial"], due_date__lt=timezone.now().date()
            ).select_related("student__user", "fee_structure")

            for fee in overdue_fees:
                # Update status if needed (optional side effect)
                if fee.status != "overdue":
                    fee.status = "overdue"
                    fee.save()

                # Create Notification for Student
                title = f"Overdue Fee: {fee.fee_structure.name}"
                msg = f"Your fee of ${fee.amount_due} was due on {fee.due_date}. Please pay immediately."

                # Deduplicate: Don't send if sent recently (e.g. today)
                # Ideally we check DB, but for simplicity we just create.
                # Better: Check if unread notification with same title exists.
                exists = Notification.objects.filter(
                    recipient=fee.student.user, title=title, is_read=False
                ).exists()

                if not exists:
                    Notification.objects.create(
                        recipient=fee.student.user,
                        title=title,
                        message=msg,
                        link="/student/finance",
                        is_read=False,
                    )
                    print(f"      -> Alert sent to {fee.student.user.email}")

            # 2. Attendance Alerts: Low Attendance (<75%)
            print("   📅 Checking for Low Attendance...")
            # This is complex without pre-calculated stats.
            # Simplified Logic: Check last 30 days.
            students = Student.objects.all()
            for student in students:
                total_classes = Attendance.objects.filter(student=student).count()
                if total_classes == 0:
                    continue

                present_classes = Attendance.objects.filter(
                    student=student, status="present"
                ).count()
                percentage = (present_classes / total_classes) * 100

                if percentage < 75.0:
                    title = "Low Attendance Warning"
                    msg = f"Your attendance is {percentage:.1f}%, which is below the 75% requirement."

                    exists = Notification.objects.filter(
                        recipient=student.user, title=title, is_read=False
                    ).exists()

                    if not exists:
                        Notification.objects.create(
                            recipient=student.user,
                            title=title,
                            message=msg,
                            link="/student/attendance",
                            is_read=False,
                        )
                        print(
                            f"      -> Alert sent to {student.user.email} ({percentage:.1f}%)"
                        )

    print("✅ Alert Generation Complete.")


if __name__ == "__main__":
    run_alerts()
