# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from unittest.mock import Mock, patch

from django.core.mail import EmailMultiAlternatives
from django.test import SimpleTestCase

from core.email_backends.resend_backend import ResendAPIEmailBackend


class ResendAPIEmailBackendTests(SimpleTestCase):
    def test_send_messages_posts_to_resend_api(self):
        backend = ResendAPIEmailBackend(
            api_key="re_test_key",
            api_url="https://api.resend.com/emails",
            timeout=5,
        )
        msg = EmailMultiAlternatives(
            subject="Reset password",
            body="Plain body",
            from_email="noreply@example.com",
            to=["student@example.com"],
        )
        msg.attach_alternative("<p>HTML body</p>", "text/html")

        with patch("core.email_backends.resend_backend.requests.post") as mock_post:
            mock_post.return_value = Mock(status_code=202, text='{"id":"abc"}')
            sent_count = backend.send_messages([msg])

        self.assertEqual(sent_count, 1)
        mock_post.assert_called_once()
        payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(payload["from"], "noreply@example.com")
        self.assertEqual(payload["to"], ["student@example.com"])
        self.assertEqual(payload["subject"], "Reset password")
        self.assertEqual(payload["text"], "Plain body")
        self.assertEqual(payload["html"], "<p>HTML body</p>")

    def test_missing_api_key_raises_when_not_silent(self):
        with self.assertRaises(ValueError):
            ResendAPIEmailBackend(api_key="", fail_silently=False)
