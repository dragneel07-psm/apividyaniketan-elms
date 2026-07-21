# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Signal handlers for the projects app.

  - Broadcast project events over the channel layer to ws/projects/<id>/
  - Emit Notification rows for assignee changes and project grading
"""

from __future__ import annotations

import logging

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import Project, ProjectTask, ProjectUpdate

logger = logging.getLogger(__name__)


def _broadcast(project_id, event: dict) -> None:
    """Push an event onto the project's channel-layer group. Best-effort."""
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        from .consumers import project_group_name

        layer = get_channel_layer()
        if layer is None:
            return
        async_to_sync(layer.group_send)(project_group_name(project_id), event)
    except Exception:
        logger.exception("project ws broadcast failed for project_id=%s", project_id)


def _broadcast_mentor_summary(project: Project) -> None:
    """Fan a digest event to the mentor's group whenever the project changes.

    The dashboard listens on ws/projects/digest/ and refetches its data on
    any summary push, so the at-risk widget stays accurate without one
    WebSocket per project.
    """
    if not project.mentor_id:
        return
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        from .consumers import mentor_group_name

        layer = get_channel_layer()
        if layer is None:
            return
        overdue = sum(1 for t in project.tasks.all() if t.is_overdue)
        payload = {
            "type": "project.summary",
            "project_id": str(project.pk),
            "status": project.status,
            "progress_percent": project.progress_percent,
            "overdue_task_count": overdue,
            "is_at_risk": overdue > 0,
        }
        async_to_sync(layer.group_send)(mentor_group_name(project.mentor_id), payload)
    except Exception:
        logger.exception("mentor digest broadcast failed for project_id=%s", project.pk)


def _serialize_task(task: ProjectTask) -> dict:
    return {
        "task_id": str(task.task_id),
        "title": task.title,
        "status": task.status,
        "weight": task.weight,
        "assignee_id": str(task.assignee_id) if task.assignee_id else None,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }


def _serialize_update(update: ProjectUpdate) -> dict:
    return {
        "update_id": str(update.update_id),
        "kind": update.kind,
        "body": update.body,
        "task_id": str(update.task_id) if update.task_id else None,
        "author_id": str(update.author_id) if update.author_id else None,
        "created_at": update.created_at.isoformat() if update.created_at else None,
        "meta": update.meta or {},
    }


def _broadcast_project_progress(project: Project) -> None:
    _broadcast(
        project.pk,
        {
            "type": "project.progress",
            "project_id": str(project.pk),
            "percent": project.progress_percent,
            "label": project.progress_label,
        },
    )
    # Mentor dashboard cares about progress changes too.
    _broadcast_mentor_summary(project)


# --- ProjectTask: assignee change tracking ---


@receiver(pre_save, sender=ProjectTask)
def _stash_old_task_state(sender, instance: ProjectTask, **kwargs):
    if not instance.pk:
        instance._old_assignee_id = None
        instance._old_status = None
        return
    try:
        previous = ProjectTask.objects.only("assignee_id", "status").get(pk=instance.pk)
    except ProjectTask.DoesNotExist:
        instance._old_assignee_id = None
        instance._old_status = None
        return
    instance._old_assignee_id = previous.assignee_id
    instance._old_status = previous.status


@receiver(post_save, sender=ProjectTask)
def _on_task_saved(sender, instance: ProjectTask, created, **kwargs):
    project_id = str(instance.project_id)
    if created:
        _broadcast(
            project_id,
            {
                "type": "project.task.created",
                "project_id": project_id,
                "task": _serialize_task(instance),
            },
        )
    else:
        _broadcast(
            project_id,
            {
                "type": "project.task.updated",
                "project_id": project_id,
                "task": _serialize_task(instance),
            },
        )
    _broadcast_project_progress(instance.project)

    # Notify newly-assigned student.
    old_assignee = getattr(instance, "_old_assignee_id", None)
    if instance.assignee_id and instance.assignee_id != old_assignee:
        _notify_task_assigned(instance)


@receiver(post_delete, sender=ProjectTask)
def _on_task_deleted(sender, instance: ProjectTask, **kwargs):
    project_id = str(instance.project_id)
    _broadcast(
        project_id,
        {
            "type": "project.task.deleted",
            "project_id": project_id,
            "task_id": str(instance.task_id),
        },
    )
    try:
        _broadcast_project_progress(instance.project)
    except Project.DoesNotExist:
        pass


# --- ProjectUpdate: activity feed events ---


@receiver(post_save, sender=ProjectUpdate)
def _on_update_saved(sender, instance: ProjectUpdate, created, **kwargs):
    if not created:
        return
    project_id = str(instance.project_id)
    _broadcast(
        project_id,
        {
            "type": "project.update.created",
            "project_id": project_id,
            "update": _serialize_update(instance),
        },
    )
    if instance.kind == "grade":
        _broadcast(
            project_id,
            {
                "type": "project.graded",
                "project_id": project_id,
                "final_grade": (instance.meta or {}).get("final_grade"),
            },
        )
        _broadcast_mentor_summary(instance.project)
        _notify_project_graded(instance.project)
    elif instance.kind in {"submission"}:
        _broadcast(
            project_id,
            {
                "type": "project.status.changed",
                "project_id": project_id,
                "from": "active",
                "to": "submitted",
            },
        )
        _broadcast_mentor_summary(instance.project)


# --- Notifications ---


def _emit_notification(
    *, recipient, title: str, message: str, link: str, tenant
) -> None:
    """Create a Notification row. Errors are swallowed — best-effort delivery."""
    if recipient is None:
        return
    try:
        from notifications.models import Notification

        Notification.objects.create(
            tenant=tenant,
            recipient=recipient,
            title=title,
            message=message,
            link=link,
            is_read=False,
        )
    except Exception:
        logger.exception(
            "Failed to emit project notification for user=%s",
            getattr(recipient, "pk", None),
        )


def _notify_task_assigned(task: ProjectTask) -> None:
    student = task.assignee
    if student is None:
        return
    user = getattr(student, "user", None)
    if user is None:
        return
    _emit_notification(
        recipient=user,
        title=f"New task: {task.title}",
        message=f"You have been assigned a task in '{task.project.title}'.",
        link=f"/student/projects/{task.project_id}",
        tenant=task.tenant,
    )


def _notify_project_graded(project: Project) -> None:
    if project.final_grade is None:
        return
    grade = float(project.final_grade)
    title = f"Project graded: {project.title}"
    message = f"Your project '{project.title}' has been graded ({grade})."
    member_users = []
    for member in project.members.select_related("student", "student__user").all():
        u = getattr(member.student, "user", None)
        if u is not None:
            member_users.append(u)
    for user in member_users:
        _emit_notification(
            recipient=user,
            title=title,
            message=message,
            link=f"/student/projects/{project.pk}",
            tenant=project.tenant,
        )
    # Also notify parents-of-members (use academic.Parent.students M2M).
    try:
        from academic.models import Parent

        student_ids = list(project.members.values_list("student_id", flat=True))
        if project.leader_id and project.leader_id not in student_ids:
            student_ids.append(project.leader_id)
        for parent in Parent.objects.filter(
            students__student_id__in=student_ids
        ).distinct():
            _emit_notification(
                recipient=parent.user,
                title=title,
                message=message,
                link=f"/parent/projects/{project.pk}",
                tenant=project.tenant,
            )
    except Exception:
        logger.exception("Failed to notify parents for graded project=%s", project.pk)
