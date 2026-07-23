# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.test import TestCase
from rest_framework.test import APIClient

from notifications.models import Notification
from notifications.services import NotificationService

User = get_user_model()


class NotificationAsyncDeliveryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="notify_user",
            email="notify_user@example.com",
            password="Notify@1234",
            role="student",
            phone_number="+9779800000001",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @override_settings(ASYNC_TASK_BACKEND="sync")
    @patch("notifications.services.EmailService.send_email", return_value=True)
    def test_create_notification_dispatches_email_task(self, mocked_send_email):
        NotificationService.create_notification(
            recipient=self.user,
            title="Fee Reminder",
            message="Your fee is due.",
            channels=["email"],
        )

        self.assertEqual(Notification.objects.filter(recipient=self.user).count(), 1)
        mocked_send_email.assert_called_once_with(
            recipient_email=self.user.email,
            subject="Fee Reminder",
            message="Your fee is due.",
            html_message=None,
        )

    @override_settings(ASYNC_TASK_BACKEND="sync")
    @patch("notifications.services.SMSService.send_sms", return_value=True)
    def test_create_notification_dispatches_sms_task(self, mocked_send_sms):
        NotificationService.create_notification(
            recipient=self.user,
            title="Class Alert",
            message="Class starts at 9 AM.",
            channels=["sms"],
        )

        self.assertEqual(Notification.objects.filter(recipient=self.user).count(), 1)
        mocked_send_sms.assert_called_once_with(
            recipient_phone="+9779800000001",
            message="Class starts at 9 AM.",
        )

    @override_settings(ASYNC_TASK_BACKEND="sync")
    def test_dispatch_endpoint_enqueues_job_and_status_is_queryable(self):
        response = self.client.post(
            "/api/notifications/dispatch/",
            {
                "recipient_id": str(self.user.pk),
                "title": "Reminder",
                "message": "Complete your assignment.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 202)
        job_id = response.data.get("job_id")
        self.assertTrue(job_id)

        status_response = self.client.get(f"/api/core/jobs/{job_id}/")
        self.assertEqual(status_response.status_code, 200)
        self.assertEqual(status_response.data.get("status"), "success")
