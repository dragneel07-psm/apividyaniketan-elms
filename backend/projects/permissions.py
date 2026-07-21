# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework.permissions import SAFE_METHODS, BasePermission

from ._helpers import (
    get_parent_for,
    get_student_for,
    is_admin,
    is_leader_of,
    is_member_of,
    is_mentor_of,
    role_of,
    tenant_has_projects_enabled,
)


class IsProjectsEnabled(BasePermission):
    """Block all access when the tenant has not enabled the projects feature."""

    message = "The projects feature is not enabled for this school."

    def has_permission(self, request, view):
        tenant = getattr(request.user, "tenant", None) or getattr(
            request, "tenant", None
        )
        return tenant_has_projects_enabled(tenant)


class IsProjectMentorOrReadOnly(BasePermission):
    """Write operations on a Project require the user to be its mentor (or admin).

    Read access falls through to the queryset filter applied by the viewset.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if is_admin(request.user):
            return True
        return is_mentor_of(request.user, obj)


class CanWriteOnProjectTask(BasePermission):
    """Permission for ProjectTask write operations.

    Rules:
      - admin/mentor: full access
      - leader of the project: create + edit any task in that project
      - member assigned to the task: edit the task's status/notes only
      - others: read-only (handled by viewset queryset)
    """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if is_admin(user):
            return True
        project = obj.project
        if is_mentor_of(user, project):
            return True
        student = get_student_for(user)
        if is_leader_of(student, project):
            return True
        if obj.assignee_id and student and obj.assignee_id == student.student_id:
            # Member can update only their own task and only its status/notes.
            return True
        return False


class CanCommentOnProject(BasePermission):
    """Allow project members, leader, mentor, admin, and parents-of-members to read.

    Write (POST a comment) requires the user to be a project member, leader, mentor, or admin.
    """

    def has_object_permission(self, request, view, obj):
        project = obj.project if hasattr(obj, "project") else obj
        user = request.user
        if request.method in SAFE_METHODS:
            if is_admin(user) or is_mentor_of(user, project):
                return True
            student = get_student_for(user)
            if is_member_of(student, project) or is_leader_of(student, project):
                return True
            parent = get_parent_for(user)
            if parent is not None:
                child_ids = set(parent.students.values_list("student_id", flat=True))
                member_ids = set(project.members.values_list("student_id", flat=True))
                if project.leader_id:
                    member_ids.add(project.leader_id)
                return bool(child_ids & member_ids)
            return False
        # Write: members/leader/mentor/admin only
        if is_admin(user) or is_mentor_of(user, project):
            return True
        student = get_student_for(user)
        return is_member_of(student, project) or is_leader_of(student, project)
