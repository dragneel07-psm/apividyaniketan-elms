# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework.throttling import ScopedRateThrottle


class LoginRateThrottle(ScopedRateThrottle):
    scope = "auth_login"


class RefreshRateThrottle(ScopedRateThrottle):
    scope = "auth_refresh"


class RegisterRateThrottle(ScopedRateThrottle):
    scope = "auth_register"


class PasswordResetRateThrottle(ScopedRateThrottle):
    scope = "auth_password_reset"


class PasswordResetConfirmRateThrottle(ScopedRateThrottle):
    scope = "auth_password_reset_confirm"


class EmailVerificationRateThrottle(ScopedRateThrottle):
    scope = "auth_email_verify"
