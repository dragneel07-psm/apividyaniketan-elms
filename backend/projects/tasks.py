# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Celery tasks for the projects app.

  - scan_overdue_tasks: hourly. Finds open tasks past their due date and
    notifies the assignee + project leader. Idempotent: skips tasks
    already flagged via a 'task_overdue_flagged' marker on
    ProjectUpdate.meta.

  - scan_due_soon_projects: daily. For active projects whose due_date is
    within 24 hours, notifies all members and the mentor. Idempotent
    via 'project_due_soon_flagged' marker on ProjectUpdate.meta.
"""

from __future__ import annotations

import logging
from datetime import timedelta

try:
    from celery import shared_task
except Exception:  # pragma: no cover — sync fallback for envs without celery
    from core.async_jobs import background_task as shared_task

from django.utils import timezone
from django_tenants.utils import get_tenant_model, schema_context

logger = logging.getLogger(__name__)


@shared_task(name="projects.scan_overdue_tasks")
def scan_overdue_tasks() -> dict:
    """Scan every tenant for overdue open tasks and notify assignees + leader."""
    Tenant = get_tenant_model()
    notified = 0
    scanned_tenants = 0
    for tenant in Tenant.objects.exclude(schema_name="public"):
        with schema_context(tenant.schema_name):
            scanned_tenants += 1
            notified += _scan_overdue_for_current_tenant(tenant)
    return {"tenants": scanned_tenants, "notifications_emitted": notified}


@shared_task(name="projects.scan_due_soon_projects")
def scan_due_soon_projects() -> dict:
    Tenant = get_tenant_model()
    notified = 0
    scanned_tenants = 0
    for tenant in Tenant.objects.exclude(schema_name="public"):
        with schema_context(tenant.schema_name):
            scanned_tenants += 1
            notified += _scan_due_soon_for_current_tenant(tenant)
    return {"tenants": scanned_tenants, "notifications_emitted": notified}


def _scan_overdue_for_current_tenant(tenant) -> int:
    from notifications.models import Notification

    from .models import Project, ProjectTask, ProjectUpdate

    now = timezone.now()
    qs = (
        ProjectTask.objects.select_related("project", "assignee", "assignee__user")
        .filter(due_date__lt=now)
        .exclude(status="done")
        .exclude(status="blocked")
        .filter(project__status="active")
    )
    notified = 0
    for task in qs:
        already_flagged = ProjectUpdate.objects.filter(
            project=task.project,
            task=task,
            kind="status_change",
            meta__task_overdue_flagged=True,
        ).exists()
        if already_flagged:
            continue
        recipients = []
        assignee_user = getattr(task.assignee, "user", None) if task.assignee else None
        if assignee_user is not None:
            recipients.append(assignee_user)
        leader_user = (
            getattr(task.project.leader, "user", None)
            if task.project.leader_id
            else None
        )
        if leader_user is not None and leader_user not in recipients:
            recipients.append(leader_user)
        for user in recipients:
            Notification.objects.create(
                tenant=tenant,
                recipient=user,
                title=f"Task overdue: {task.title}",
                message=(
                    f"The task '{task.title}' in project '{task.project.title}' "
                    f"was due {task.due_date:%Y-%m-%d %H:%M} and is not done."
                ),
                link=f"/student/projects/{task.project_id}",
            )
            notified += 1
        # Idempotency marker so future runs don't re-notify.
        ProjectUpdate.objects.create(
            tenant=tenant,
            project=task.project,
            task=task,
            kind="status_change",
            body=f"{task.title}: marked overdue",
            meta={"task_overdue_flagged": True, "due_date": task.due_date.isoformat()},
        )
    return notified


def _scan_due_soon_for_current_tenant(tenant) -> int:
    from notifications.models import Notification

    from .models import Project, ProjectUpdate

    now = timezone.now()
    horizon = now + timedelta(hours=24)
    qs = (
        Project.objects.filter(status="active")
        .filter(due_date__gte=now, due_date__lte=horizon)
        .select_related("mentor")
        .prefetch_related("members__student__user")
    )
    notified = 0
    for project in qs:
        already_flagged = ProjectUpdate.objects.filter(
            project=project,
            kind="status_change",
            meta__project_due_soon_flagged=True,
        ).exists()
        if already_flagged:
            continue
        recipients = set()
        if project.mentor_id:
            recipients.add(project.mentor)
        for member in project.members.all():
            user = getattr(member.student, "user", None)
            if user is not None:
                recipients.add(user)
        for user in recipients:
            Notification.objects.create(
                tenant=tenant,
                recipient=user,
                title=f"Project due soon: {project.title}",
                message=(
                    f"The project '{project.title}' is due "
                    f"{project.due_date:%Y-%m-%d %H:%M}."
                ),
                link=f"/student/projects/{project.pk}",
            )
            notified += 1
        ProjectUpdate.objects.create(
            tenant=tenant,
            project=project,
            kind="status_change",
            body=f"{project.title}: due in <24h",
            meta={"project_due_soon_flagged": True},
        )
    return notified
