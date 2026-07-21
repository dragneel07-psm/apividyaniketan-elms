# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Tests for the reset_saas_admin_password management command.
"""

from __future__ import annotations

from io import StringIO
from unittest.mock import patch

import pyotp
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

User = get_user_model()


class ResetSaasAdminPasswordCommandTests(TestCase):
    OLD_PASSWORD = "OldS@asP@ss123!"
    NEW_PASSWORD = "NewS@asP@ss456!"

    def setUp(self):
        self.saas_admin = User.objects.create_user(
            username="saas-cli",
            email="saas-cli@elearning.dev",
            password=self.OLD_PASSWORD,
            role="saas_admin",
            tenant=None,
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )

    @patch("getpass.getpass")
    def test_happy_path_resets_password(self, mock_getpass):
        mock_getpass.side_effect = [self.NEW_PASSWORD, self.NEW_PASSWORD]
        out = StringIO()
        call_command(
            "reset_saas_admin_password",
            "--email",
            "saas-cli@elearning.dev",
            stdout=out,
        )

        self.saas_admin.refresh_from_db()
        self.assertTrue(self.saas_admin.check_password(self.NEW_PASSWORD))
        self.assertFalse(self.saas_admin.check_password(self.OLD_PASSWORD))
        # 2FA fields should be untouched on this path.
        self.assertFalse(self.saas_admin.is_2fa_enabled)
        self.assertFalse(self.saas_admin.two_factor_secret)

    @patch("getpass.getpass")
    def test_wrong_role_rejects(self, mock_getpass):
        # Even if getpass were called, we should fail before reaching it.
        mock_getpass.side_effect = [self.NEW_PASSWORD, self.NEW_PASSWORD]

        other = User.objects.create_user(
            username="not-saas",
            email="teacher@elearning.dev",
            password=self.OLD_PASSWORD,
            role="teacher",
        )

        with self.assertRaises(CommandError) as ctx:
            call_command(
                "reset_saas_admin_password",
                "--email",
                "teacher@elearning.dev",
                stdout=StringIO(),
                stderr=StringIO(),
            )
        self.assertIn("No saas_admin account found", str(ctx.exception))

        # Password unchanged.
        other.refresh_from_db()
        self.assertTrue(other.check_password(self.OLD_PASSWORD))

    @patch("getpass.getpass")
    def test_reset_2fa_regenerates_secret(self, mock_getpass):
        mock_getpass.side_effect = [self.NEW_PASSWORD, self.NEW_PASSWORD]
        # Pre-existing TOTP secret to confirm regeneration replaces it.
        self.saas_admin.two_factor_secret = "OLDSECRETOLDSECRETOLDSEC"
        self.saas_admin.is_2fa_enabled = True
        self.saas_admin.save(update_fields=["two_factor_secret", "is_2fa_enabled"])

        out = StringIO()
        call_command(
            "reset_saas_admin_password",
            "--email",
            "saas-cli@elearning.dev",
            "--reset-2fa",
            stdout=out,
        )

        self.saas_admin.refresh_from_db()
        self.assertTrue(self.saas_admin.check_password(self.NEW_PASSWORD))
        self.assertTrue(self.saas_admin.is_2fa_enabled)
        self.assertNotEqual(
            self.saas_admin.two_factor_secret, "OLDSECRETOLDSECRETOLDSEC"
        )
        # New secret must be a usable TOTP seed.
        try:
            pyotp.TOTP(self.saas_admin.two_factor_secret).now()
        except Exception as exc:  # noqa: BLE001
            self.fail(f"Regenerated TOTP secret is not valid base32: {exc}")
        # Operator-facing output exposes the secret exactly once.
        self.assertIn("TOTP Secret", out.getvalue())
