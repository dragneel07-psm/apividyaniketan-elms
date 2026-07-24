# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework.permissions import BasePermission

ADMIN_ROLES = {"admin", "staff"}
PLATFORM_SETTINGS_ROLES = ADMIN_ROLES | {"saas_admin", "saas_staff"}


class IsAdminOrStaff(BasePermission):
    """Allow access only to users with admin or staff roles."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) in ADMIN_ROLES
        )


class IsPlatformSettingsAdmin(BasePermission):
    """
    Allow access to GlobalSettings: school admin/staff (read-only in the
    frontend, which shows these fields as disabled) plus SaaS platform
    admin/staff — the SaaS Profile & Security page reads this same endpoint
    and is available to both saas_admin and saas_staff.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) in PLATFORM_SETTINGS_ROLES
        )
