# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""Shared RBAC + visibility helpers for the projects app."""

from typing import Optional

from django.db.models import Q

from academic.models import Parent, Student
from projects.models import Project

ADMIN_ROLES = {"admin", "staff", "saas_admin"}


def role_of(user) -> str:
    return getattr(user, "role", "") or ""


def is_admin(user) -> bool:
    return role_of(user) in ADMIN_ROLES


def get_student_for(user) -> Optional[Student]:
    if not user or not user.is_authenticated:
        return None
    return Student.objects.filter(user=user).first()


def get_parent_for(user) -> Optional[Parent]:
    if not user or not user.is_authenticated:
        return None
    return Parent.objects.filter(user=user).first()


def is_mentor_of(user, project: Project) -> bool:
    return bool(user and user.is_authenticated and project.mentor_id == user.pk)


def is_member_of(student: Optional[Student], project: Project) -> bool:
    if student is None:
        return False
    return project.members.filter(student=student).exists()


def is_leader_of(student: Optional[Student], project: Project) -> bool:
    if student is None:
        return False
    return project.leader_id == student.student_id


def project_visibility_q(user) -> Q:
    """Q filter restricting Project queryset to what `user` can see."""
    role = role_of(user)
    if is_admin(user):
        return Q()  # admins see all projects in their tenant
    if role == "teacher":
        # Teachers see projects they mentor + projects in classes they teach (any teacher in tenant
        # is allowed read access to keep coordination simple — write access is mentor-only).
        return Q()
    if role == "student":
        student = get_student_for(user)
        if student is None:
            return Q(pk__in=[])
        return Q(members__student=student) | Q(leader=student)
    if role == "parent":
        parent = get_parent_for(user)
        if parent is None:
            return Q(pk__in=[])
        child_ids = list(parent.students.values_list("student_id", flat=True))
        if not child_ids:
            return Q(pk__in=[])
        return Q(members__student_id__in=child_ids) | Q(leader_id__in=child_ids)
    return Q(pk__in=[])


def tenant_has_projects_enabled(tenant) -> bool:
    if tenant is None:
        return False
    features = getattr(tenant, "features", None) or {}
    value = features.get("projects", False)
    if isinstance(value, dict):
        return bool(value.get("enabled", False))
    return bool(value)
