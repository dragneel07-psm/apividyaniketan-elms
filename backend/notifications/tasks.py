# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

try:
    from celery import shared_task
except Exception:
    from core.async_jobs import background_task as shared_task

from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context

from core.models import Tenant
from notifications.services import EmailService, SMSService


@shared_task(name="notifications.send_email")
def send_email_notification_task(
    recipient_email: str,
    subject: str,
    message: str,
    html_message: str | None = None,
):
    return EmailService.send_email(
        recipient_email=recipient_email,
        subject=subject,
        message=message,
        html_message=html_message,
    )


@shared_task(name="notifications.send_sms")
def send_sms_notification_task(recipient_phone: str, message: str):
    return SMSService.send_sms(recipient_phone=recipient_phone, message=message)


@shared_task(name="notifications.send_push")
def send_expo_push_task(
    *,
    recipient_id: str,
    title: str,
    body: str,
    data: dict | None = None,
):
    """
    Send an Expo push notification to a single user.
    Uses the Expo Push API directly (no SDK needed — just HTTP).
    Silently skips if the user has no registered push token.
    """
    import json
    import urllib.error
    import urllib.request

    user_model = get_user_model()
    user = user_model.objects.filter(pk=recipient_id).first()
    if not user:
        return {"skipped": "user_not_found"}

    token = getattr(user, "expo_push_token", None)
    if not token:
        return {"skipped": "no_push_token"}

    payload = json.dumps(
        {
            "to": token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://exp.host/--/api/v2/push/send",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        return {"error": str(exc)}


@shared_task(name="notifications.send_notification")
def send_notification_task(
    *,
    tenant_schema: str,
    recipient_id: str,
    title: str,
    message: str,
    link: str | None = None,
    channels: list[str] | None = None,
):
    from notifications.services import NotificationService

    schema_name = str(tenant_schema or "").strip().lower() or "public"
    with schema_context(schema_name):
        with schema_context("public"):
            tenant = Tenant.objects.filter(schema_name=schema_name).first()
        user_model = get_user_model()
        recipient = user_model.objects.filter(pk=recipient_id).first()
        if not recipient:
            raise ValueError("Recipient not found")

        notification = NotificationService.create_notification(
            recipient=recipient,
            title=title,
            message=message,
            tenant=tenant,
            link=link,
            channels=channels or [],
        )
        return {
            "notification_id": notification.id,
            "recipient_id": str(recipient.pk),
        }
