# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import logging
from typing import cast
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .models import UserAccount

logger = logging.getLogger(__name__)


def _base_scheme() -> str:
    parsed = urlsplit(getattr(settings, "FRONTEND_URL", "") or "")
    if parsed.scheme:
        return parsed.scheme
    return "https"


def _normalize_base_url(raw_url: str) -> str:
    value = (raw_url or "").strip().rstrip("/")
    if not value:
        return ""
    if "://" in value:
        return value
    return f"{_base_scheme()}://{value}"


def _user_email(user: UserAccount) -> str:
    return cast(str, getattr(user, "email", ""))


def _user_first_name(user: UserAccount) -> str:
    return cast(str, getattr(user, "first_name", "")) or ""


def _user_pk(user: UserAccount) -> str:
    return str(getattr(user, "pk", ""))


def frontend_url() -> str:
    return (
        _normalize_base_url(getattr(settings, "FRONTEND_URL", ""))
        or "http://localhost:3000"
    )


def build_password_reset_link(user: UserAccount) -> str:
    uidb64 = urlsafe_base64_encode(force_bytes(_user_pk(user)))
    token = default_token_generator.make_token(user)
    return f"{frontend_url()}/reset-password?uidb64={uidb64}&token={token}"


def build_email_verification_link(user: UserAccount) -> str:
    uidb64 = urlsafe_base64_encode(force_bytes(_user_pk(user)))
    token = default_token_generator.make_token(user)
    return f"{frontend_url()}/verify-email?uidb64={uidb64}&token={token}"


def send_password_reset_email(
    user: UserAccount,
    *,
    reason: str = "password_reset",
) -> None:
    reset_link = build_password_reset_link(user)
    subject = "Password Reset Request"
    message = (
        f"Hello {_user_first_name(user) or 'there'},\n\n"
        "We received a request to reset your password.\n"
        f"Use this secure link to continue:\n{reset_link}\n\n"
        "If you did not request this, you can safely ignore this email."
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
        recipient_list=[_user_email(user)],
        fail_silently=False,
    )
    logger.info(
        "Password reset email sent",
        extra={"email": _user_email(user), "reason": reason},
    )
