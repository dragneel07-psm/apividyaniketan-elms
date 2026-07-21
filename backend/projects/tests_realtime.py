# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Tests for ProjectStreamConsumer + post-save broadcast signals.

Mirrors ai_engine/tests_ws_consumers.py — uses InMemoryChannelLayer so no
Redis is required. The class-level override_settings does not propagate
into async test methods when combined with FastTenantTestCase, so each
async test wraps its body in an inline override_settings context.
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock

from channels.testing import WebsocketCommunicator
from django.test import TestCase, override_settings
from django_tenants.test.cases import FastTenantTestCase

from academic.models import AcademicClass, Section, Student
from projects.consumers import (
    MentorDigestStreamConsumer,
    ProjectStreamConsumer,
    mentor_group_name,
    project_group_name,
)
from projects.models import Project, ProjectMember
from users.models import UserAccount

IN_MEMORY_CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
}


def _anon_user():
    return MagicMock(is_authenticated=False)


def _enable_projects(tenant):
    tenant.features = {**(tenant.features or {}), "projects": True}
    tenant.save(update_fields=["features"])


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS)
class ProjectStreamConsumerAuthTests(TestCase):
    def _app(self):
        return ProjectStreamConsumer.as_asgi()

    async def test_unauthenticated_rejected(self):
        comm = WebsocketCommunicator(self._app(), "/ws/projects/abc/")
        comm.scope["user"] = _anon_user()
        comm.scope["url_route"] = {"kwargs": {"project_id": "abc"}}
        connected, code = await comm.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4001)
        await comm.disconnect()

    async def test_missing_url_kwarg_rejected(self):
        user = MagicMock(is_authenticated=True, pk="u-1")
        comm = WebsocketCommunicator(self._app(), "/ws/projects/abc/")
        comm.scope["user"] = user
        comm.scope["url_route"] = {"kwargs": {}}
        connected, code = await comm.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4400)
        await comm.disconnect()


class ProjectStreamConsumerVisibilityTests(FastTenantTestCase):
    """Connect-time visibility check uses the real DB."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "WS Visibility Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        _enable_projects(self.tenant)
        self.acad_class = AcademicClass.objects.create(name="Grade 11", order=11)
        self.section = Section.objects.create(name="A", academic_class=self.acad_class)
        self.mentor = UserAccount.objects.create_user(
            username="ws_mentor",
            email="ws_mentor@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.member_user = UserAccount.objects.create_user(
            username="ws_member",
            email="ws_member@example.com",
            password="Pass@1234",
            role="student",
            tenant=self.tenant,
        )
        self.member_student = Student.objects.create(
            user=self.member_user, academic_class=self.acad_class, section=self.section
        )
        self.outsider_user = UserAccount.objects.create_user(
            username="ws_outsider",
            email="ws_outsider@example.com",
            password="Pass@1234",
            role="student",
            tenant=self.tenant,
        )
        Student.objects.create(
            user=self.outsider_user,
            academic_class=self.acad_class,
            section=self.section,
        )
        self.project = Project.objects.create(
            tenant=self.tenant,
            title="WS Project",
            mentor=self.mentor,
            is_group=True,
            section=self.section,
            status="active",
        )
        ProjectMember.objects.create(
            tenant=self.tenant, project=self.project, student=self.member_student
        )

    async def _connect_as(self, user):
        comm = WebsocketCommunicator(
            ProjectStreamConsumer.as_asgi(), f"/ws/projects/{self.project.pk}/"
        )
        comm.scope["user"] = user
        comm.scope["url_route"] = {"kwargs": {"project_id": str(self.project.pk)}}
        return comm

    async def test_member_can_connect(self):
        with override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS):
            comm = await self._connect_as(self.member_user)
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            await comm.disconnect()

    async def test_outsider_rejected(self):
        with override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS):
            comm = await self._connect_as(self.outsider_user)
            connected, code = await comm.connect()
            self.assertFalse(connected)
            self.assertEqual(code, 4403)
            await comm.disconnect()

    async def test_mentor_can_connect(self):
        with override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS):
            comm = await self._connect_as(self.mentor)
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            await comm.disconnect()


class ProjectStreamFeatureFlagTests(FastTenantTestCase):
    """Feature flag off must reject the WebSocket connect with 4403."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "WS Feature Flag Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        # Deliberately do NOT call _enable_projects — the flag is off.
        self.tenant.features = {**(self.tenant.features or {}), "projects": False}
        self.tenant.save(update_fields=["features"])
        self.mentor = UserAccount.objects.create_user(
            username="ff_mentor",
            email="ff_mentor@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.project = Project.objects.create(
            tenant=self.tenant, title="FF", mentor=self.mentor, status="active"
        )

    async def test_flag_off_rejects_connect(self):
        with override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS):
            comm = WebsocketCommunicator(
                ProjectStreamConsumer.as_asgi(), f"/ws/projects/{self.project.pk}/"
            )
            comm.scope["user"] = self.mentor
            comm.scope["url_route"] = {"kwargs": {"project_id": str(self.project.pk)}}
            connected, code = await comm.connect()
            self.assertFalse(connected)
            self.assertEqual(code, 4403)
            await comm.disconnect()


class ProjectStreamBroadcastTests(FastTenantTestCase):
    """Verify channel-layer events from group_send reach the connected client."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "WS Broadcast Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        _enable_projects(self.tenant)
        self.mentor = UserAccount.objects.create_user(
            username="bcast_mentor",
            email="bcast_mentor@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.project = Project.objects.create(
            tenant=self.tenant, title="Bcast", mentor=self.mentor, status="active"
        )

    async def test_task_created_event_pushed(self):
        with override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS):
            from channels.layers import get_channel_layer

            comm = WebsocketCommunicator(
                ProjectStreamConsumer.as_asgi(), f"/ws/projects/{self.project.pk}/"
            )
            comm.scope["user"] = self.mentor
            comm.scope["url_route"] = {"kwargs": {"project_id": str(self.project.pk)}}
            connected, _ = await comm.connect()
            self.assertTrue(connected)

            layer = get_channel_layer()
            await layer.group_send(
                project_group_name(self.project.pk),
                {
                    "type": "project.task.created",
                    "project_id": str(self.project.pk),
                    "task": {"task_id": "t-1", "title": "Research"},
                },
            )
            frame = await comm.receive_json_from()
            self.assertEqual(frame["type"], "project.task.created")
            self.assertEqual(frame["task"]["task_id"], "t-1")
            await comm.disconnect()

    async def test_ping_pong(self):
        with override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS):
            comm = WebsocketCommunicator(
                ProjectStreamConsumer.as_asgi(), f"/ws/projects/{self.project.pk}/"
            )
            comm.scope["user"] = self.mentor
            comm.scope["url_route"] = {"kwargs": {"project_id": str(self.project.pk)}}
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            await comm.send_to(text_data=json.dumps({"type": "ping"}))
            frame = await comm.receive_json_from()
            self.assertEqual(frame["type"], "pong")
            await comm.disconnect()


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS)
class MentorDigestAuthTests(TestCase):
    def _app(self):
        return MentorDigestStreamConsumer.as_asgi()

    async def test_unauthenticated_rejected(self):
        comm = WebsocketCommunicator(self._app(), "/ws/projects/digest/")
        comm.scope["user"] = _anon_user()
        connected, code = await comm.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4001)
        await comm.disconnect()


class MentorDigestVisibilityTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Mentor Digest School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        _enable_projects(self.tenant)
        self.acad_class = AcademicClass.objects.create(name="Grade 12", order=12)
        self.section = Section.objects.create(name="A", academic_class=self.acad_class)
        self.mentor = UserAccount.objects.create_user(
            username="md_mentor",
            email="md_mentor@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.student = UserAccount.objects.create_user(
            username="md_student",
            email="md_student@example.com",
            password="Pass@1234",
            role="student",
            tenant=self.tenant,
        )

    async def test_teacher_can_connect(self):
        with override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS):
            comm = WebsocketCommunicator(
                MentorDigestStreamConsumer.as_asgi(), "/ws/projects/digest/"
            )
            comm.scope["user"] = self.mentor
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            await comm.disconnect()

    async def test_student_rejected(self):
        with override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS):
            comm = WebsocketCommunicator(
                MentorDigestStreamConsumer.as_asgi(), "/ws/projects/digest/"
            )
            comm.scope["user"] = self.student
            connected, code = await comm.connect()
            self.assertFalse(connected)
            self.assertEqual(code, 4403)
            await comm.disconnect()


class MentorDigestBroadcastTests(FastTenantTestCase):
    """group_send to mentor_<id> reaches the connected client."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Mentor Digest Bcast School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        _enable_projects(self.tenant)
        self.mentor = UserAccount.objects.create_user(
            username="md_bcast_mentor",
            email="md_bcast_mentor@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )

    async def test_summary_event_pushed_to_client(self):
        from channels.layers import get_channel_layer

        with override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL_LAYERS):
            comm = WebsocketCommunicator(
                MentorDigestStreamConsumer.as_asgi(), "/ws/projects/digest/"
            )
            comm.scope["user"] = self.mentor
            connected, _ = await comm.connect()
            self.assertTrue(connected)

            layer = get_channel_layer()
            await layer.group_send(
                mentor_group_name(self.mentor.pk),
                {
                    "type": "project.summary",
                    "project_id": "p-123",
                    "status": "active",
                    "progress_percent": 60.0,
                    "overdue_task_count": 1,
                    "is_at_risk": True,
                },
            )
            frame = await comm.receive_json_from()
            self.assertEqual(frame["type"], "project.summary")
            self.assertEqual(frame["project_id"], "p-123")
            self.assertTrue(frame["is_at_risk"])
            await comm.disconnect()
