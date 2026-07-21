# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import permissions


def _role(user) -> str:
    return (getattr(user, "role", "") or "").lower()


class IsHRManager(permissions.BasePermission):
    """Allows admin and staff roles to manage HR data."""

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return _role(user) in {"admin", "staff"}


class IsHRManagerOrReadOnly(permissions.BasePermission):
    """Allows read for any authenticated user; write only for admin/staff."""

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return _role(user) in {"admin", "staff"}


class IsOwnLeaveOrHRManager(permissions.BasePermission):
    """Employee can see their own leaves; HR manager can see all."""

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if _role(user) in {"admin", "staff"}:
            return True
        # Employee can access their own leave
        employee = getattr(user, "employee_profile", None)
        return employee is not None and obj.employee == employee
