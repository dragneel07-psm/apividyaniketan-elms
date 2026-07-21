# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""ViewSets for the projects app — REST API surface for project tracking."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.mixins import TenantScopedQuerysetMixin

from ._helpers import (
    get_parent_for,
    get_student_for,
    is_admin,
    is_leader_of,
    is_member_of,
    is_mentor_of,
    project_visibility_q,
    role_of,
)
from .models import (
    Project,
    ProjectAttachment,
    ProjectMember,
    ProjectSubmission,
    ProjectTask,
    ProjectUpdate,
    RubricTemplate,
)
from .permissions import (
    CanCommentOnProject,
    CanWriteOnProjectTask,
    IsProjectMentorOrReadOnly,
    IsProjectsEnabled,
)
from .serializers import (
    ProjectAttachmentSerializer,
    ProjectMemberSerializer,
    ProjectSerializer,
    ProjectSubmissionSerializer,
    ProjectTaskSerializer,
    ProjectUpdateSerializer,
    RubricTemplateSerializer,
)

# --- Project ---


class ProjectViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Project.objects.select_related(
        "mentor", "leader", "section", "subject"
    ).all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsProjectsEnabled, IsProjectMentorOrReadOnly]
    tenant_field = "tenant"

    # Actions where the mentor-write rule shouldn't apply because the action body
    # implements its own role-aware authorization.
    _CUSTOM_ACTIONS = {
        "mine",
        "mentor_dashboard",
        "members",
        "remove_member",
        "set_leader",
        "activate",
        "submit",
        "grade",
    }

    def get_permissions(self):
        if self.action in self._CUSTOM_ACTIONS:
            return [IsAuthenticated(), IsProjectsEnabled()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset().distinct()
        return qs.filter(project_visibility_q(self.request.user)).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        if role_of(user) not in {"teacher", "admin", "staff", "saas_admin"}:
            raise PermissionDenied("Only teachers/admins can create projects.")
        tenant = getattr(user, "tenant", None) or getattr(self.request, "tenant", None)
        if tenant is None:
            raise PermissionDenied("No tenant context.")
        # Default mentor to the requesting teacher unless an admin set someone else.
        mentor = serializer.validated_data.get("mentor") or user
        serializer.save(tenant=tenant, mentor=mentor, created_by=user)

    def perform_update(self, serializer):
        if serializer.instance.status not in {"draft", "active"}:
            raise PermissionDenied(
                "Cannot edit a project that is submitted/graded/archived."
            )
        serializer.save()

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        """Convenience: projects relevant to the current user (mentored or member)."""
        qs = self.get_queryset()
        if role_of(request.user) == "teacher":
            qs = qs.filter(mentor=request.user)
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page or qs, many=True)
        return (
            self.get_paginated_response(serializer.data)
            if page is not None
            else Response(serializer.data)
        )

    @action(detail=False, methods=["get"], url_path="dashboard/mentor")
    def mentor_dashboard(self, request):
        """Mentor view: own projects + at-risk flag (overdue tasks > 0)."""
        if role_of(request.user) not in {"teacher", "admin", "staff", "saas_admin"}:
            raise PermissionDenied("Mentor dashboard is for teachers/admins.")
        qs = (
            self.get_queryset().filter(mentor=request.user)
            if role_of(request.user) == "teacher"
            else self.get_queryset()
        )
        data = []
        for project in qs:
            overdue = sum(1 for t in project.tasks.all() if t.is_overdue)
            data.append(
                {
                    "project_id": str(project.project_id),
                    "title": project.title,
                    "status": project.status,
                    "progress_percent": project.progress_percent,
                    "progress_label": project.progress_label,
                    "due_date": project.due_date,
                    "overdue_task_count": overdue,
                    "is_at_risk": overdue > 0,
                }
            )
        return Response(data)

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            queryset = project.members.select_related("student", "student__user").all()
            data = ProjectMemberSerializer(queryset, many=True).data
            return Response(data)
        if not (is_admin(request.user) or is_mentor_of(request.user, project)):
            raise PermissionDenied("Only the mentor or admin can add members.")
        student_id = request.data.get("student")
        role = request.data.get("role", "member")
        if not student_id:
            raise ValidationError({"student": "Required."})
        if not project.is_group:
            raise ValidationError("Cannot add members to a non-group project.")
        from academic.models import Student

        try:
            student = Student.objects.filter(student_id=student_id).first()
        except (ValueError, DjangoValidationError):
            raise ValidationError({"student": "Invalid student id."})
        if student is None:
            raise ValidationError({"student": "Student not found."})
        if project.members.filter(student=student).exists():
            raise ValidationError(
                {"student": "Student is already a member of this project."}
            )
        member = ProjectMember(
            tenant=project.tenant, project=project, student=student, role=role
        )
        try:
            member.clean()
        except DjangoValidationError as exc:
            raise ValidationError(exc.messages)
        try:
            member.save()
        except IntegrityError:
            raise ValidationError(
                {"student": "Student is already a member of this project."}
            )
        if role == "leader":
            project.leader = student
            project.save(update_fields=["leader", "updated_at"])
        return Response(
            ProjectMemberSerializer(member).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["delete"], url_path=r"members/(?P<student_pk>[^/.]+)")
    def remove_member(self, request, pk=None, student_pk=None):
        project = self.get_object()
        if not (is_admin(request.user) or is_mentor_of(request.user, project)):
            raise PermissionDenied("Only the mentor or admin can remove members.")
        deleted, _ = ProjectMember.objects.filter(
            project=project, student_id=student_pk
        ).delete()
        if deleted == 0:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if project.leader_id and str(project.leader_id) == str(student_pk):
            project.leader = None
            project.save(update_fields=["leader", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="leader")
    def set_leader(self, request, pk=None):
        project = self.get_object()
        if not (is_admin(request.user) or is_mentor_of(request.user, project)):
            raise PermissionDenied("Only the mentor or admin can set the leader.")
        student_id = request.data.get("student")
        if not student_id:
            raise ValidationError({"student": "Required."})
        member = project.members.filter(student_id=student_id).first()
        if member is None:
            raise ValidationError(
                {"student": "Leader must already be a project member."}
            )
        project.members.filter(role="leader").update(role="member")
        member.role = "leader"
        member.save(update_fields=["role"])
        from academic.models import Student

        student = Student.objects.filter(student_id=student_id).first()
        project.leader = student
        project.save(update_fields=["leader", "updated_at"])
        return Response(ProjectSerializer(project, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        project = self.get_object()
        if not (is_admin(request.user) or is_mentor_of(request.user, project)):
            raise PermissionDenied("Only the mentor or admin can activate a project.")
        if not project.can_transition_to("active"):
            raise ValidationError(f"Cannot activate from status '{project.status}'.")
        if project.is_group and project.min_group_size:
            if project.members.count() < project.min_group_size:
                raise ValidationError(
                    f"Need at least {project.min_group_size} members to activate."
                )
        project.status = "active"
        project.save(update_fields=["status", "updated_at"])
        return Response(ProjectSerializer(project, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        project = self.get_object()
        user = request.user
        student = get_student_for(user)
        allowed = (
            is_admin(user)
            or is_mentor_of(user, project)
            or is_leader_of(student, project)
            or (not project.is_group and is_member_of(student, project))
        )
        if not allowed:
            raise PermissionDenied("Only the leader (or mentor) can submit a project.")
        if not project.can_transition_to("submitted"):
            raise ValidationError(f"Cannot submit from status '{project.status}'.")
        sub = ProjectSubmission.objects.create(
            tenant=project.tenant,
            project=project,
            submitted_by=user,
            notes=request.data.get("notes", ""),
        )
        project.status = "submitted"
        project.save(update_fields=["status", "updated_at"])
        ProjectUpdate.objects.create(
            tenant=project.tenant,
            project=project,
            author=user,
            kind="submission",
            body=request.data.get("notes", ""),
            meta={"submission_id": str(sub.submission_id), "is_late": sub.is_late},
        )
        return Response(
            ProjectSubmissionSerializer(sub).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"], url_path="grade")
    def grade(self, request, pk=None):
        project = self.get_object()
        if not (is_admin(request.user) or is_mentor_of(request.user, project)):
            raise PermissionDenied("Only the mentor or admin can grade.")
        if not project.can_transition_to("graded"):
            raise ValidationError(f"Cannot grade from status '{project.status}'.")
        final_grade = request.data.get("final_grade")
        if final_grade is None:
            raise ValidationError({"final_grade": "Required."})
        try:
            project.final_grade = float(final_grade)
        except (TypeError, ValueError):
            raise ValidationError({"final_grade": "Must be a number."})
        rubric = request.data.get("rubric_json")
        if rubric is not None:
            project.rubric_json = rubric
        project.status = "graded"
        project.save(
            update_fields=["final_grade", "rubric_json", "status", "updated_at"]
        )
        ProjectUpdate.objects.create(
            tenant=project.tenant,
            project=project,
            author=request.user,
            kind="grade",
            body=request.data.get("note", ""),
            meta={"final_grade": float(project.final_grade)},
        )
        return Response(ProjectSerializer(project, context={"request": request}).data)


# --- Task ---


class ProjectTaskViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = ProjectTask.objects.select_related(
        "project", "assignee", "created_by"
    ).all()
    serializer_class = ProjectTaskSerializer
    permission_classes = [IsAuthenticated, IsProjectsEnabled, CanWriteOnProjectTask]
    tenant_field = "tenant"

    def get_queryset(self):
        qs = super().get_queryset()
        # Limit tasks to projects visible to the user.
        visible_projects = Project.objects.filter(
            project_visibility_q(self.request.user)
        )
        qs = qs.filter(project__in=visible_projects)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.distinct()

    def perform_create(self, serializer):
        user = self.request.user
        project = serializer.validated_data["project"]
        student = get_student_for(user)
        if not (
            is_admin(user)
            or is_mentor_of(user, project)
            or is_leader_of(student, project)
        ):
            raise PermissionDenied("Only mentor or leader can create tasks.")
        serializer.save(tenant=project.tenant, created_by=user)
        ProjectUpdate.objects.create(
            tenant=project.tenant,
            project=project,
            task=serializer.instance,
            author=user,
            kind="task_added",
            body=serializer.instance.title,
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        old_status = instance.status
        new_status = serializer.validated_data.get("status", old_status)
        student = get_student_for(self.request.user)
        # Members can only update their own task's status — block any other field changes.
        if (
            not is_admin(self.request.user)
            and not is_mentor_of(self.request.user, instance.project)
            and not is_leader_of(student, instance.project)
        ):
            allowed_fields = {"status"}
            attempted = set(serializer.validated_data.keys())
            disallowed = attempted - allowed_fields
            if disallowed:
                raise PermissionDenied(
                    f"Members can only update task status, not: {', '.join(sorted(disallowed))}."
                )
        serializer.save()
        if new_status != old_status:
            ProjectUpdate.objects.create(
                tenant=instance.tenant,
                project=instance.project,
                task=instance,
                author=self.request.user,
                kind="task_completed" if new_status == "done" else "status_change",
                body=f"{instance.title}: {old_status} → {new_status}",
                meta={"from": old_status, "to": new_status},
            )


# --- Update / activity feed ---


class ProjectUpdateViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = ProjectUpdate.objects.select_related("project", "author", "task").all()
    serializer_class = ProjectUpdateSerializer
    permission_classes = [IsAuthenticated, IsProjectsEnabled, CanCommentOnProject]
    tenant_field = "tenant"
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        visible_projects = Project.objects.filter(
            project_visibility_q(self.request.user)
        )
        qs = qs.filter(project__in=visible_projects)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.distinct()

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        # Members/leader/mentor/admin can post comments; CanCommentOnProject already
        # enforces this via has_object_permission on detail routes — for create we
        # validate here.
        user = self.request.user
        student = get_student_for(user)
        if not (
            is_admin(user)
            or is_mentor_of(user, project)
            or is_member_of(student, project)
            or is_leader_of(student, project)
        ):
            raise PermissionDenied("Only project participants can post updates.")
        # Only allow the comment kind via the public API; system kinds emitted by viewsets.
        kind = serializer.validated_data.get("kind", "comment")
        if kind != "comment" and not is_admin(user):
            raise PermissionDenied(
                "Only 'comment' updates can be created via this endpoint."
            )
        serializer.save(tenant=project.tenant, author=user)


# --- Submission ---


class ProjectSubmissionViewSet(
    TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet
):
    """Submissions are created via Project.submit; this viewset exposes them read-only."""

    queryset = ProjectSubmission.objects.select_related("project", "submitted_by").all()
    serializer_class = ProjectSubmissionSerializer
    permission_classes = [IsAuthenticated, IsProjectsEnabled]
    tenant_field = "tenant"

    def get_queryset(self):
        qs = super().get_queryset()
        visible_projects = Project.objects.filter(
            project_visibility_q(self.request.user)
        )
        qs = qs.filter(project__in=visible_projects)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.distinct()


# --- Attachment ---


class ProjectAttachmentViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = ProjectAttachment.objects.select_related(
        "project", "task", "update", "uploaded_by"
    ).all()
    serializer_class = ProjectAttachmentSerializer
    permission_classes = [IsAuthenticated, IsProjectsEnabled, CanCommentOnProject]
    tenant_field = "tenant"
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        visible_projects = Project.objects.filter(
            project_visibility_q(self.request.user)
        )
        qs = qs.filter(project__in=visible_projects)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.distinct()

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        user = self.request.user
        student = get_student_for(user)
        if not (
            is_admin(user)
            or is_mentor_of(user, project)
            or is_member_of(student, project)
            or is_leader_of(student, project)
        ):
            raise PermissionDenied("Only project participants can upload attachments.")
        f = serializer.validated_data.get("file")
        size = getattr(f, "size", 0) or 0
        mime = getattr(f, "content_type", "") or ""
        serializer.save(
            tenant=project.tenant, uploaded_by=user, size_bytes=size, mime_type=mime
        )


# --- Rubric template ---


class RubricTemplateViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    """Teacher-managed reusable grading rubrics.

    Visibility:
      - admins: all templates in the tenant
      - teachers: own templates + tenant-shared (owner=null)
      - students/parents: 403
    Write access:
      - create: any teacher/admin (the owner is set to the requester)
      - update/delete: owner or admin only
    """

    queryset = RubricTemplate.objects.select_related("owner", "subject").all()
    serializer_class = RubricTemplateSerializer
    permission_classes = [IsAuthenticated, IsProjectsEnabled]
    tenant_field = "tenant"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        role = role_of(request.user)
        if role not in {"teacher", "admin", "staff", "saas_admin"}:
            raise PermissionDenied("Only teachers and admins can use rubric templates.")

    def get_queryset(self):
        qs = super().get_queryset()
        if is_admin(self.request.user):
            return qs
        # Teacher: own + tenant-shared.
        return qs.filter(Q(owner=self.request.user) | Q(owner__isnull=True))

    def perform_create(self, serializer):
        user = self.request.user
        tenant = getattr(user, "tenant", None) or getattr(self.request, "tenant", None)
        if tenant is None:
            raise PermissionDenied("No tenant context.")
        serializer.save(tenant=tenant, owner=user)

    def perform_update(self, serializer):
        instance = serializer.instance
        if (
            not is_admin(self.request.user)
            and instance.owner_id != self.request.user.pk
        ):
            raise PermissionDenied("You can only edit your own rubric templates.")
        serializer.save()

    def perform_destroy(self, instance):
        if (
            not is_admin(self.request.user)
            and instance.owner_id != self.request.user.pk
        ):
            raise PermissionDenied("You can only delete your own rubric templates.")
        instance.delete()
