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

from core.models.tenant import Domain, Tenant

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


def _tenant_subdomain(tenant: Tenant | None) -> str:
    return cast(str | None, getattr(tenant, "subdomain", None)) or ""


def _tenant_name(tenant: Tenant | None) -> str:
    return cast(str, getattr(tenant, "name", "")) if tenant else ""


def _tenant_schema_name(tenant: Tenant) -> str:
    return cast(str, getattr(tenant, "schema_name", ""))


def _domain_name(domain: Domain | None) -> str:
    return cast(str, getattr(domain, "domain", "")) if domain else ""


def _user_email(user: UserAccount) -> str:
    return cast(str, getattr(user, "email", ""))


def _user_first_name(user: UserAccount) -> str:
    return cast(str, getattr(user, "first_name", "")) or ""


def _user_role(user: UserAccount) -> str:
    return cast(str, getattr(user, "role", "user")) or "user"


def _user_tenant(user: UserAccount) -> Tenant | None:
    return cast(Tenant | None, getattr(user, "tenant", None))


def _user_pk(user: UserAccount) -> str:
    return str(getattr(user, "pk", ""))


def resolve_frontend_url_for_tenant(tenant: Tenant | None = None) -> str:
    default_frontend = (
        _normalize_base_url(getattr(settings, "FRONTEND_URL", ""))
        or "http://localhost:3000"
    )
    if not tenant:
        return default_frontend

    try:
        primary_domain = Domain.objects.filter(tenant=tenant, is_primary=True).first()
    except Exception:
        primary_domain = None

    primary_domain_name = _domain_name(primary_domain)
    if primary_domain_name:
        return _normalize_base_url(primary_domain_name) or default_frontend

    subdomain = _tenant_subdomain(tenant).strip().lower()
    base_domain = (getattr(settings, "BASE_DOMAIN", "") or "").strip().lower()
    if subdomain and base_domain:
        return f"{_base_scheme()}://{subdomain}.{base_domain}"

    return default_frontend


def build_password_reset_link(
    user: UserAccount, *, tenant: Tenant | None = None
) -> str:
    tenant_for_link: Tenant | None = tenant or _user_tenant(user)
    frontend_base = resolve_frontend_url_for_tenant(tenant_for_link)
    uidb64 = urlsafe_base64_encode(force_bytes(_user_pk(user)))
    token = default_token_generator.make_token(user)
    return f"{frontend_base}/reset-password?uidb64={uidb64}&token={token}"


def build_email_verification_link(user: UserAccount) -> str:
    frontend_base = resolve_frontend_url_for_tenant(None)
    uidb64 = urlsafe_base64_encode(force_bytes(_user_pk(user)))
    token = default_token_generator.make_token(user)
    return f"{frontend_base}/verify-email?uidb64={uidb64}&token={token}"


def send_password_reset_email(
    user: UserAccount,
    *,
    tenant: Tenant | None = None,
    reason: str = "password_reset",
) -> None:
    reset_link = build_password_reset_link(user, tenant=tenant)
    tenant_name = _tenant_name(tenant or _user_tenant(user)) or "your account"
    subject = "Password Reset Request"
    message = (
        f"Hello {_user_first_name(user) or 'there'},\n\n"
        f"We received a request to reset your password for {tenant_name}.\n"
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


def send_saas_admin_registration_email(user: UserAccount) -> None:
    verify_link = build_email_verification_link(user)
    login_url = f"{resolve_frontend_url_for_tenant(None)}/login/saas"
    subject = "Verify Your SaaS Admin Email Address"
    message = (
        f"Hello {_user_first_name(user) or 'there'},\n\n"
        "Thanks for registering your SaaS admin account.\n"
        "Please verify your email address before signing in:\n"
        f"{verify_link}\n\n"
        f"After verification, sign in at: {login_url}\n\n"
        "Regards,\nE-Learning Platform"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
        recipient_list=[_user_email(user)],
        fail_silently=False,
    )
    logger.info(
        "SaaS admin registration email sent", extra={"email": _user_email(user)}
    )


def send_saas_admin_login_alert(
    user: UserAccount, *, ip_address: str, user_agent: str
) -> None:
    """Send an email alert to a SaaS admin when a new login occurs."""
    from datetime import datetime
    from datetime import timezone as dt_timezone

    login_time = datetime.now(dt_timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    login_url = f"{resolve_frontend_url_for_tenant(None)}/saas-login"
    subject = "Security Alert: New SaaS Admin Login"
    message = (
        f"Hello {_user_first_name(user) or 'there'},\n\n"
        "A new login to your SaaS Admin account was just recorded:\n\n"
        f"  Time:       {login_time}\n"
        f"  IP Address: {ip_address}\n"
        f"  Device:     {user_agent[:120] or 'Unknown'}\n\n"
        "If this was you, no action is needed.\n"
        "If you did NOT initiate this login, change your password and revoke access immediately:\n"
        f"{login_url}\n\n"
        "Regards,\nE-Learning Platform Security Team"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
        recipient_list=[_user_email(user)],
        fail_silently=True,
    )
    logger.info(
        "SaaS admin login alert sent",
        extra={"email": _user_email(user), "ip": ip_address},
    )


def send_tenant_account_created_email(user: UserAccount, *, tenant: Tenant) -> None:
    tenant_base = resolve_frontend_url_for_tenant(tenant)
    login_url = f"{tenant_base}/login"
    reset_link = build_password_reset_link(user, tenant=tenant)
    tenant_name = _tenant_name(tenant)
    subject = f"Your {tenant_name} Account Is Ready"
    message = (
        f"Hello {_user_first_name(user) or 'there'},\n\n"
        f"An account has been created for you in {tenant_name}.\n"
        f"Role: {_user_role(user)}\n\n"
        f"Login URL: {login_url}\n"
        f"Forgot password / set a new password: {reset_link}\n\n"
        "If this was unexpected, contact your school administrator."
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
        recipient_list=[_user_email(user)],
        fail_silently=False,
    )
    logger.info(
        "Tenant account created email sent",
        extra={"email": _user_email(user), "tenant": _tenant_schema_name(tenant)},
    )
