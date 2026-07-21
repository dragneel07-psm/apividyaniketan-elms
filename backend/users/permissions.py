# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import permissions


class IsSaaSAdmin(permissions.BasePermission):
    """
    Allocates permissions for SaaS Super Admins
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "saas_admin"
        )


class IsAdmin(permissions.BasePermission):
    """
    Allocates permissions for School Admins (Principals/IT)
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsTeacher(permissions.BasePermission):
    """
    Allocates permissions for Teachers
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "teacher"
        )


class IsStudent(permissions.BasePermission):
    """
    Allocates permissions for Students
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "student"
        )


class IsParent(permissions.BasePermission):
    """
    Allocates permissions for Parents
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "parent"
        )


# Composite Permissions (Mixins)
class IsTeacherOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        allowed_roles = ["teacher", "admin", "saas_admin"]
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in allowed_roles
        )


class IsAdminOrSaaSAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        allowed_roles = ["admin", "saas_admin"]
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in allowed_roles
        )


class IsSaaSAdminOrStaff(permissions.BasePermission):
    """
    Grants access to both saas_admin (super admin) and saas_staff.
    Use this for SaaS portal views that staff members are allowed to use.
    Use IsSaaSAdmin directly when only the super admin should have access (e.g. staff management).
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("saas_admin", "saas_staff")
        )


class IsSISStaff(permissions.BasePermission):
    """
    Student Information System access: admin / saas_admin or any staff
    user whose staff_role is 'receptionist' (front-desk staff routinely
    handle health records, leave requests, document issuance and
    incident logging on the admin's behalf).
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        role = (getattr(user, "role", "") or "").lower()
        if role in ("admin", "saas_admin"):
            return True
        if (
            role == "staff"
            and (getattr(user, "staff_role", "") or "").lower() == "receptionist"
        ):
            return True
        return False
