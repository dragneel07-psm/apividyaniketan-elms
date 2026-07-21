# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging

from django.conf import settings
from django.core.mail import send_mail

from core.async_jobs import enqueue

from .models import Notification

logger = logging.getLogger(__name__)


class EmailService:
    @staticmethod
    def send_email(recipient_email, subject, message, html_message=None):
        """
        Sends an email using Django's send_mail.
        """
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [recipient_email],
                fail_silently=False,
                html_message=html_message,
            )
            logger.info(f"Email sent to {recipient_email}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
            return False


class SMSService:
    SPARROW_URL = "http://api.sparrowsms.com/v2/sms/"

    @staticmethod
    def send_sms(recipient_phone: str, message: str) -> bool:
        import logging

        import requests
        from django.conf import settings

        logger = logging.getLogger(__name__)

        if not recipient_phone:
            return False
        token = getattr(settings, "SPARROW_SMS_TOKEN", "")
        if not token:
            logger.warning(
                "SPARROW_SMS_TOKEN not configured; skipping SMS to %s", recipient_phone
            )
            return False
        try:
            resp = requests.post(
                SMSService.SPARROW_URL,
                data={
                    "token": token,
                    "from": getattr(settings, "SPARROW_SMS_FROM", "School"),
                    "to": recipient_phone,
                    "text": message,
                },
                timeout=10,
            )
            data = resp.json()
            if data.get("response_code") == 200:
                logger.info("SMS sent to %s", recipient_phone)
                return True
            logger.warning("Sparrow SMS failed: %s", data)
            return False
        except Exception as e:
            logger.error("Sparrow SMS error: %s", e)
            return False


class NotificationService:
    @staticmethod
    def create_notification(
        recipient, title, message, tenant=None, link=None, channels=None
    ):
        """
        Creates a notification for a user and optionally sends via other channels.
        channels: list of 'email', 'sms', 'in_app' (default: in_app only)
        """
        if not tenant:
            tenant = getattr(recipient, "tenant", None)

        # 1. In-App Notification (Always created if not disabled explicitly, but usually yes)
        notification = Notification.objects.create(
            tenant=tenant, recipient=recipient, title=title, message=message, link=link
        )

        channels = channels or []

        # 2. Email
        if "email" in channels and recipient.email:
            from notifications.tasks import send_email_notification_task

            enqueue(send_email_notification_task, recipient.email, title, message)

        # 3. SMS
        # Assuming user profile has phone number.
        # We need to access the profile safely.
        if "sms" in channels:
            # Try to get phone from related profile if it exists
            phone = getattr(recipient, "phone_number", None)
            if not phone and hasattr(recipient, "student_profile"):
                phone = recipient.student_profile.phone_number
            elif not phone and hasattr(recipient, "teacher_profile"):
                phone = recipient.teacher_profile.phone_number
            elif not phone and hasattr(recipient, "parent_profile"):
                phone = recipient.parent_profile.phone_number

            if phone:
                from notifications.tasks import send_sms_notification_task

                enqueue(send_sms_notification_task, phone, message)
            else:
                logger.warning(
                    f"Could not send SMS to {recipient.email}: No phone number found."
                )

        # 4. Expo push notification (fires whenever the user has a token)
        if getattr(recipient, "expo_push_token", None):
            from notifications.tasks import send_expo_push_task

            enqueue(
                send_expo_push_task,
                recipient_id=str(recipient.pk),
                title=title,
                body=message,
            )

        return notification

    @staticmethod
    def notify_role(tenant, role, title, message, link=None, channels=None):
        """
        Sends a notification to all users with a specific role within a tenant.
        """
        from users.models import UserAccount

        users = UserAccount.objects.filter(tenant=tenant, role=role)
        notifications = []
        for user in users:
            notifications.append(
                NotificationService.create_notification(
                    user, title, message, tenant=tenant, link=link, channels=channels
                )
            )
        return notifications

    @staticmethod
    def notify_class(tenant, academic_class, title, message, link=None, channels=None):
        """
        Sends a notification to all students in a specific class.
        """
        from academic.models import Student

        students = Student.objects.filter(
            academic_class=academic_class, user__tenant=tenant
        )
        notifications = []
        for student in students:
            # Notify the student User
            notifications.append(
                NotificationService.create_notification(
                    student.user,
                    title,
                    message,
                    tenant=tenant,
                    link=link,
                    channels=channels,
                )
            )
        return notifications
