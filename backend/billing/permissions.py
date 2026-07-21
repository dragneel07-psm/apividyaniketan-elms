# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import permissions


def _role(user) -> str:
    return (getattr(user, "role", "") or "").lower()


class IsSaaSAdminUser(permissions.BasePermission):
    """
    Allows only SaaS-level operators.
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return bool(user.is_superuser or user.is_staff or _role(user) == "saas_admin")


class IsSchoolFinanceManager(permissions.BasePermission):
    """
    Allows tenant-level finance users (admin/staff).
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return _role(user) in {"admin", "staff"}
