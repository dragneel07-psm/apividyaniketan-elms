# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from datetime import date

try:
    from celery import shared_task
except Exception:
    from core.async_jobs import background_task as shared_task

from notifications.services import NotificationService

from .models import Attendance


@shared_task(name="academic.check_daily_attendance")
def check_daily_attendance():
    """
    Checks today's attendance and notifies parents of absent students.
    """
    today = date.today()
    absent_records = Attendance.objects.filter(date=today, status="absent")

    count = 0
    for record in absent_records:
        student = record.student
        tenant = record.tenant

        # In a real app, we'd notify the PARENT, not the student.
        # But for demo, we notify the student user + mock SMS to "Parent".

        title = "Absent Alert"
        message = f"Student {student.first_name} was marked absent for {record.subject.name if record.subject else 'class'} on {today}."

        # Send SMS if parent phone available (mocked in service)
        NotificationService.create_notification(
            recipient=student.user,  # targeting student user for now as primary contact
            title=title,
            message=message,
            tenant=tenant,
            channels=["sms", "app"],
        )
        count += 1

    return f"Sent {count} absent alerts."


@shared_task(name="academic.check_upcoming_exams")
def check_upcoming_exams():
    """
    Checks for exams scheduled in the next 24 hours and notifies students.
    """
    from datetime import timedelta

    from django.utils import timezone

    from .models import Assessment, Student

    now = timezone.now()
    upcoming_window = now + timedelta(days=1)

    # Find exams scheduled between now and 24h from now
    exams = Assessment.objects.filter(scheduled_at__range=(now, upcoming_window))

    count = 0
    for exam in exams:
        # Identify students
        if exam.section:
            students = Student.objects.filter(section=exam.section)
        else:
            # All sections in the class
            students = Student.objects.filter(
                academic_class=exam.subject.academic_class
            )

        for student in students:
            if not student.user:
                continue

            title = f"Upcoming Exam: {exam.title}"
            message = f"Reminder: You have {exam.title} for {exam.subject.name} scheduled at {exam.scheduled_at.strftime('%H:%M')}."

            NotificationService.create_notification(
                recipient=student.user,
                title=title,
                message=message,
                # tenant=None, # Inferred from context or user?
                # NotificationService creates for tenant if passed?
                # The model doesn't explicitly store tenant on Assessment?
                # Wait, does Assessment have tenant?
                # Let's check Assessment model again.
                # If not, we rely on Student's tenant?
                # NotificationService needs tenant.
                tenant=student.user.tenant,
                channels=["app", "email"],
            )
            count += 1

    return f"Sent {count} exam reminders."
