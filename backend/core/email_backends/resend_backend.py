# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import base64
from email.mime.base import MIMEBase
from typing import Any

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage, EmailMultiAlternatives


class ResendAPIEmailBackend(BaseEmailBackend):
    """
    Django email backend that sends messages through the Resend HTTP API.

    Configure with:
      EMAIL_BACKEND=core.email_backends.resend_backend.ResendAPIEmailBackend
      RESEND_API_KEY=...
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        self.api_key = (
            kwargs.pop("api_key", None) or getattr(settings, "RESEND_API_KEY", "") or ""
        ).strip()
        self.api_url = (
            kwargs.pop("api_url", None)
            or getattr(settings, "RESEND_API_URL", "")
            or "https://api.resend.com/emails"
        ).strip()
        self.timeout = int(
            kwargs.pop("timeout", None)
            or getattr(settings, "RESEND_REQUEST_TIMEOUT", 10)
            or 10
        )
        super().__init__(*args, **kwargs)

        if not self.api_key and not self.fail_silently:
            raise ValueError("RESEND_API_KEY is required for ResendAPIEmailBackend.")

    def send_messages(self, email_messages: list[EmailMessage] | None) -> int:
        if not email_messages:
            return 0

        sent_count = 0
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        for message in email_messages:
            if not message.recipients():
                continue

            payload = self._build_payload(message)
            try:
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout,
                )
                if 200 <= response.status_code < 300:
                    sent_count += 1
                    continue

                if self.fail_silently:
                    continue
                raise RuntimeError(
                    f"Resend API request failed ({response.status_code}): {response.text}"
                )
            except requests.RequestException as exc:
                if self.fail_silently:
                    continue
                raise RuntimeError(f"Resend API request error: {exc}") from exc

        return sent_count

    def _build_payload(self, message: EmailMessage) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "from": message.from_email or settings.DEFAULT_FROM_EMAIL,
            "to": list(message.to or []),
            "subject": message.subject or "",
        }
        if message.cc:
            payload["cc"] = list(message.cc)
        if message.bcc:
            payload["bcc"] = list(message.bcc)
        if message.reply_to:
            payload["reply_to"] = list(message.reply_to)

        body = message.body or ""
        if getattr(message, "content_subtype", "plain") == "html":
            payload["html"] = body
        else:
            payload["text"] = body

        if isinstance(message, EmailMultiAlternatives):
            for alternative, mimetype in message.alternatives:
                if mimetype == "text/html" and "html" not in payload:
                    payload["html"] = alternative
                elif mimetype == "text/plain" and "text" not in payload:
                    payload["text"] = alternative

        attachments = self._serialize_attachments(message)
        if attachments:
            payload["attachments"] = attachments

        return payload

    def _serialize_attachments(self, message: EmailMessage) -> list[dict[str, str]]:
        serialized: list[dict[str, str]] = []
        for attachment in message.attachments:
            if isinstance(attachment, MIMEBase):
                filename = attachment.get_filename() or "attachment.bin"
                raw_content = attachment.get_payload(decode=True)
                if raw_content is None:
                    continue
                data: dict[str, str] = {
                    "filename": filename,
                    "content": base64.b64encode(raw_content).decode("ascii"),
                }
                content_type = attachment.get_content_type()
                if content_type:
                    data["content_type"] = content_type
                serialized.append(data)
                continue

            if not isinstance(attachment, tuple):
                continue

            filename = attachment[0] if len(attachment) > 0 else "attachment.bin"
            content = attachment[1] if len(attachment) > 1 else b""
            mimetype = attachment[2] if len(attachment) > 2 else None
            if isinstance(content, str):
                raw = content.encode("utf-8")
            else:
                raw = content or b""
            data = {
                "filename": str(filename),
                "content": base64.b64encode(raw).decode("ascii"),
            }
            if mimetype:
                data["content_type"] = str(mimetype)
            serialized.append(data)

        return serialized
