# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
WebSocket consumers for the projects app.

ProjectStreamConsumer
  URL: ws://<host>/ws/projects/<project_id>/?token=<jwt>

  Push-only stream of project events to authorized viewers (mentor,
  members, leader, parents-of-members, admin).

  Server → Client frames:
    { "type": "project.task.created", "task": {...}, "project_id": "..." }
    { "type": "project.task.updated", "task": {...}, "project_id": "..." }
    { "type": "project.task.deleted", "task_id": "...", "project_id": "..." }
    { "type": "project.update.created", "update": {...}, "project_id": "..." }
    { "type": "project.status.changed", "from": "...", "to": "...",
      "project_id": "..." }
    { "type": "project.graded", "final_grade": 85.5, "project_id": "..." }
    { "type": "project.progress", "percent": 60.0, "label": "3 of 5 tasks done",
      "project_id": "..." }

  Client → Server:
    { "type": "ping" } → { "type": "pong" }
"""

from __future__ import annotations

import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


def project_group_name(project_id) -> str:
    return f"project_{project_id}"


def mentor_group_name(user_id) -> str:
    return f"mentor_{user_id}"


class ProjectStreamConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        try:
            self.project_id = self.scope["url_route"]["kwargs"]["project_id"]
        except KeyError:
            await self.close(code=4400)
            return

        allowed = await self._user_can_view(user, self.project_id)
        if not allowed:
            await self.close(code=4403)
            return

        self.group_name = project_group_name(self.project_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.debug(
            "WS project connect: user=%s project=%s group=%s",
            user.pk,
            self.project_id,
            self.group_name,
        )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            await self.send_json({"type": "error", "detail": "Invalid JSON."})
            return
        if data.get("type") == "ping":
            await self.send_json({"type": "pong"})
            return
        await self.send_json({"type": "error", "detail": "Unknown message type."})

    # --- Channel layer message handlers ---
    # Channels routes events whose `type` is `project.task.created` to
    # `project_task_created` (dot → underscore).

    async def project_task_created(self, event):
        await self.send_json({**event, "type": "project.task.created"})

    async def project_task_updated(self, event):
        await self.send_json({**event, "type": "project.task.updated"})

    async def project_task_deleted(self, event):
        await self.send_json({**event, "type": "project.task.deleted"})

    async def project_update_created(self, event):
        await self.send_json({**event, "type": "project.update.created"})

    async def project_status_changed(self, event):
        await self.send_json({**event, "type": "project.status.changed"})

    async def project_graded(self, event):
        await self.send_json({**event, "type": "project.graded"})

    async def project_progress(self, event):
        await self.send_json({**event, "type": "project.progress"})

    # --- Helpers ---

    async def send_json(self, payload: dict) -> None:
        await self.send(text_data=json.dumps(payload, default=str))

    @database_sync_to_async
    def _user_can_view(self, user, project_id: str) -> bool:
        from ._helpers import (
            get_parent_for,
            get_student_for,
            is_admin,
            is_leader_of,
            is_member_of,
            is_mentor_of,
            tenant_has_projects_enabled,
        )
        from .models import Project

        project = Project.objects.filter(pk=project_id).first()
        if project is None:
            return False
        # Tenant safety: caller must be in the same tenant as the project.
        user_tenant = getattr(user, "tenant", None)
        if user_tenant is not None and project.tenant_id != user_tenant.pk:
            return False
        # Feature flag: same gate the REST API enforces via IsProjectsEnabled.
        if not tenant_has_projects_enabled(user_tenant or project.tenant):
            return False
        if is_admin(user):
            return True
        if is_mentor_of(user, project):
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
        # Any teacher in the same tenant gets read access (matches HTTP visibility).
        if getattr(user, "role", "") == "teacher":
            return True
        return False


class MentorDigestStreamConsumer(AsyncWebsocketConsumer):
    """Per-mentor digest channel.

    URL: ws://<host>/ws/projects/digest/?token=<jwt>

    Joins group `mentor_<user_id>`. Signals on ProjectTask + ProjectUpdate
    fan a `project.summary` event into this group whenever any of the
    teacher's mentored projects changes — so the mentor dashboard updates
    without opening a separate WebSocket per project.

    Server → Client frames:
      { "type": "project.summary",
        "project_id": "...",
        "status": "active",
        "progress_percent": 60.0,
        "overdue_task_count": 1,
        "is_at_risk": true }
      { "type": "pong" }
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        role = (getattr(user, "role", "") or "").lower()
        if role not in {"teacher", "admin", "staff", "saas_admin"}:
            await self.close(code=4403)
            return

        # Tenant feature gate — mirrors REST IsProjectsEnabled.
        allowed = await self._tenant_allows(user)
        if not allowed:
            await self.close(code=4403)
            return

        self.group_name = mentor_group_name(user.pk)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.debug(
            "WS mentor-digest connect: user=%s group=%s", user.pk, self.group_name
        )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            await self.send_json({"type": "error", "detail": "Invalid JSON."})
            return
        if data.get("type") == "ping":
            await self.send_json({"type": "pong"})
            return
        await self.send_json({"type": "error", "detail": "Unknown message type."})

    # Channel layer event handler. group_send type "project.summary" → method
    # name `project_summary` (dot → underscore).
    async def project_summary(self, event):
        await self.send_json({**event, "type": "project.summary"})

    async def send_json(self, payload: dict) -> None:
        await self.send(text_data=json.dumps(payload, default=str))

    @database_sync_to_async
    def _tenant_allows(self, user) -> bool:
        from ._helpers import tenant_has_projects_enabled

        tenant = getattr(user, "tenant", None)
        if tenant is None:
            # Allow saas_admin (no tenant) through — global visibility.
            role = (getattr(user, "role", "") or "").lower()
            return role in {"saas_admin", "admin", "staff"}
        return tenant_has_projects_enabled(tenant)
