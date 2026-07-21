# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework.permissions import BasePermission

ADMIN_ROLES = {"admin", "staff", "saas_admin"}


class IsAdminOrStaff(BasePermission):
    """Allow access only to users with admin, staff, or saas_admin roles."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) in ADMIN_ROLES
        )
