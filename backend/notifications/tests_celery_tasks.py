# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from notifications.tasks import send_email_notification_task


class NotificationCeleryTaskTests(SimpleTestCase):
    @override_settings(
        CELERY_TASK_ALWAYS_EAGER=True,
        CELERY_TASK_EAGER_PROPAGATES=True,
        CELERY_TASK_STORE_EAGER_RESULT=True,
    )
    @patch("notifications.tasks.EmailService.send_email", return_value=True)
    def test_email_task_delay_runs_in_eager_mode(self, mocked_send_email):
        result = send_email_notification_task.delay(
            "student@example.com",
            "Test Subject",
            "Body",
            None,
        )

        if hasattr(result, "successful"):
            self.assertTrue(result.successful())
            self.assertTrue(result.result)
        else:
            self.assertTrue(result)
        mocked_send_email.assert_called_once_with(
            recipient_email="student@example.com",
            subject="Test Subject",
            message="Body",
            html_message=None,
        )
