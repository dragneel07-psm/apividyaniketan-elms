# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Management command: reset_saas_admin_password

Resets the password (and optionally regenerates the TOTP 2FA secret)
for an existing SaaS admin account. Use as the break-glass recovery
path when the operator has lost their password and/or authenticator.

Password is always collected via getpass — never accepted as a flag,
to prevent leakage into shell history, CI logs, or process listings.

Usage:
    python manage.py reset_saas_admin_password
    python manage.py reset_saas_admin_password --email admin@example.com
    python manage.py reset_saas_admin_password --email admin@example.com --reset-2fa
"""

from __future__ import annotations

import getpass

import pyotp
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = "Reset a SaaS admin password (CLI only). Optionally regenerate 2FA."

    def add_arguments(self, parser):
        parser.add_argument("--email", type=str, help="SaaS admin email address")
        parser.add_argument(
            "--reset-2fa",
            action="store_true",
            dest="reset_2fa",
            help="Regenerate the TOTP 2FA secret and print it (lost-authenticator recovery).",
        )

    def handle(self, *args, **options):
        from users.models import (
            UserAccount,  # local import avoids circular-import at module load
        )

        self.stdout.write(self.style.WARNING("\n=== SaaS Admin Password Reset ===\n"))

        email = (options.get("email") or input("Email: ")).strip().lower()
        if not email:
            raise CommandError("Email is required.")

        try:
            user = UserAccount.objects.get(email__iexact=email, role="saas_admin")
        except UserAccount.DoesNotExist:
            raise CommandError(f"No saas_admin account found for email '{email}'.")

        while True:
            password = getpass.getpass("New password: ")
            try:
                validate_password(password, user=user)
            except ValidationError as exc:
                self.stderr.write(self.style.ERROR("\n".join(exc.messages)))
                continue
            confirm = getpass.getpass("Confirm new password: ")
            if password != confirm:
                self.stderr.write(
                    self.style.ERROR("Passwords do not match. Try again.")
                )
                continue
            break

        reset_2fa = options.get("reset_2fa", False)

        update_fields = ["password"]
        new_secret: str | None = None
        qr_uri: str | None = None

        if reset_2fa:
            new_secret = pyotp.random_base32()
            issuer = getattr(settings, "TOTP_ISSUER_NAME", "E-Learning Platform")
            qr_uri = pyotp.TOTP(new_secret).provisioning_uri(
                name=user.email, issuer_name=issuer
            )

        with transaction.atomic():
            user.set_password(password)
            if reset_2fa:
                user.two_factor_secret = new_secret
                user.is_2fa_enabled = True
                update_fields += ["two_factor_secret", "is_2fa_enabled"]
            user.save(update_fields=update_fields)

            try:
                from core.utils.audit import record_audit_event

                record_audit_event(
                    action="users.saas_admin_password_reset_cli",
                    user=user,
                    request=None,
                    details={
                        "target_user_id": str(getattr(user, "user_id", "") or user.pk),
                        "target_email": user.email,
                        "reset_2fa": bool(reset_2fa),
                    },
                )
            except (
                Exception
            ) as exc:  # noqa: BLE001 — audit failure must not roll back reset
                self.stderr.write(self.style.WARNING(f"Audit log write failed: {exc}"))

        self.stdout.write(
            self.style.SUCCESS(f"\n✓ Password reset for SaaS admin: {user.email}")
        )

        if reset_2fa:
            self.stdout.write(
                self.style.WARNING(
                    "\n=== IMPORTANT: Save these 2FA credentials NOW ==="
                )
            )
            self.stdout.write(f"\n  TOTP Secret : {new_secret}")
            self.stdout.write(f"\n  QR URI      : {qr_uri}")
            self.stdout.write(
                "\n\nAdd the secret (or scan the QR URI at https://qr.io/) "
                "to Google Authenticator, Authy, or 1Password.\n"
                "This secret will NOT be shown again.\n"
            )
