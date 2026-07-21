# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Management command: create_saas_admin

Creates a SaaS admin account with TOTP 2FA pre-configured.
This is the ONLY authorised way to provision a new SaaS admin.
Public API registration for this role is disabled.

Usage:
    python manage.py create_saas_admin
    python manage.py create_saas_admin --email admin@example.com --first-name John --last-name Doe
    python manage.py create_saas_admin --skip-2fa   # not recommended
"""

from __future__ import annotations

import getpass

import pyotp
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create a SaaS admin user (CLI only — API registration is disabled for this role)"

    def add_arguments(self, parser):
        parser.add_argument("--email", type=str, help="Admin email address")
        parser.add_argument(
            "--first-name", type=str, dest="first_name", help="First name"
        )
        parser.add_argument("--last-name", type=str, dest="last_name", help="Last name")
        parser.add_argument(
            "--skip-2fa",
            action="store_true",
            dest="skip_2fa",
            help="Skip 2FA setup (not recommended — account cannot log in until 2FA is configured)",
        )

    def handle(self, *args, **options):
        from users.models import (
            UserAccount,  # local import avoids circular-import at module load
        )

        self.stdout.write(
            self.style.WARNING("\n=== SaaS Admin Account Provisioning ===\n")
        )

        # Collect inputs
        email = (options.get("email") or input("Email: ")).strip().lower()
        if not email:
            raise CommandError("Email is required.")

        if UserAccount.objects.filter(email=email).exists():
            raise CommandError(f"A user with email '{email}' already exists.")

        first_name = (options.get("first_name") or input("First name: ")).strip()
        last_name = (options.get("last_name") or input("Last name: ")).strip()

        # Password prompt with validation
        while True:
            password = getpass.getpass("Password: ")
            try:
                validate_password(password)
            except ValidationError as exc:
                self.stderr.write(self.style.ERROR("\n".join(exc.messages)))
                continue
            confirm = getpass.getpass("Confirm password: ")
            if password != confirm:
                self.stderr.write(
                    self.style.ERROR("Passwords do not match. Try again.")
                )
                continue
            break

        skip_2fa = options.get("skip_2fa", False)

        # Generate TOTP secret upfront (before saving user)
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        issuer = getattr(settings, "TOTP_ISSUER_NAME", "E-Learning Platform")
        qr_uri = totp.provisioning_uri(name=email, issuer_name=issuer)

        # Create user
        user = UserAccount.objects.create_user(
            email=email,
            username=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role="saas_admin",
            tenant=None,  # SaaS admin is global, not tenant-scoped
            is_staff=True,
            is_superuser=True,
            is_active=True,  # CLI creation — no email verification flow
        )

        if not skip_2fa:
            user.two_factor_secret = secret
            user.is_2fa_enabled = True
            user.save(update_fields=["two_factor_secret", "is_2fa_enabled"])

            self.stdout.write(self.style.SUCCESS(f"\n✓ SaaS admin created: {email}"))
            self.stdout.write(
                self.style.WARNING(
                    "\n=== IMPORTANT: Save these 2FA credentials NOW ==="
                )
            )
            self.stdout.write(f"\n  TOTP Secret : {secret}")
            self.stdout.write(f"\n  QR URI      : {qr_uri}")
            self.stdout.write(
                "\n\nAdd the secret (or scan the QR URI at https://qr.io/) "
                "to Google Authenticator, Authy, or 1Password.\n"
                "This secret will NOT be shown again.\n"
            )
        else:
            user.save()
            self.stdout.write(
                self.style.WARNING(
                    f"\n⚠ SaaS admin created WITHOUT 2FA: {email}\n"
                    "This account cannot log in until 2FA is configured.\n"
                    "Run: POST /api/users/2fa/setup/ and /api/users/2fa/activate/ "
                    "from the /saas-login page to complete setup.\n"
                )
            )
