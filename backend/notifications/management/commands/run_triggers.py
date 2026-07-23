# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.core.management.base import BaseCommand

from academic.tasks import check_daily_attendance, check_upcoming_exams
from billing.tasks import check_overdue_fees


class Command(BaseCommand):
    help = "Runs automated triggers for notifications (Fees, Attendance)"

    def handle(self, *args, **options):
        self.stdout.write("Running automated triggers...")

        try:
            fee_result = check_overdue_fees()
            self.stdout.write(self.style.SUCCESS(f"  Fees: {fee_result}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  Fee Trigger Failed: {e}"))

        try:
            att_result = check_daily_attendance()
            self.stdout.write(self.style.SUCCESS(f"  Attendance: {att_result}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  Attendance Trigger Failed: {e}"))

        try:
            exam_result = check_upcoming_exams()
            self.stdout.write(self.style.SUCCESS(f"  Exams: {exam_result}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  Exam Trigger Failed: {e}"))

        self.stdout.write(self.style.SUCCESS("Done."))
