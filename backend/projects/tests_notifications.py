# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""Notification + Celery beat tests for the projects app."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase

from academic.models import AcademicClass, Parent, Section, Student
from notifications.models import Notification
from projects.models import Project, ProjectMember, ProjectTask
from projects.tasks import (
    _scan_due_soon_for_current_tenant,
    _scan_overdue_for_current_tenant,
)
from users.models import UserAccount


class TaskAssignmentNotificationTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Notif Assign School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.acad_class = AcademicClass.objects.create(name="Grade 12", order=12)
        self.section = Section.objects.create(name="A", academic_class=self.acad_class)
        self.mentor = UserAccount.objects.create_user(
            username="notif_mentor",
            email="notif_mentor@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.student_user = UserAccount.objects.create_user(
            username="notif_student",
            email="notif_student@example.com",
            password="Pass@1234",
            role="student",
            tenant=self.tenant,
        )
        self.student = Student.objects.create(
            user=self.student_user, academic_class=self.acad_class, section=self.section
        )
        self.project = Project.objects.create(
            tenant=self.tenant,
            title="Notif Project",
            mentor=self.mentor,
            status="active",
        )

    def test_creating_task_with_assignee_notifies(self):
        ProjectTask.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Research",
            assignee=self.student,
        )
        notif = Notification.objects.filter(recipient=self.student_user).first()
        self.assertIsNotNone(notif)
        self.assertIn("New task", notif.title)

    def test_changing_assignee_notifies_new_assignee_only(self):
        # First create with no assignee.
        task = ProjectTask.objects.create(
            tenant=self.tenant, project=self.project, title="Build slides"
        )
        self.assertEqual(
            Notification.objects.filter(recipient=self.student_user).count(), 0
        )
        # Now assign — exactly one notification should fire.
        task.assignee = self.student
        task.save()
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.student_user, title__icontains="Build slides"
            ).count(),
            1,
        )
        # Saving again with the same assignee must not duplicate.
        task.save()
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.student_user, title__icontains="Build slides"
            ).count(),
            1,
        )


class GradedNotificationTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Grade Notif School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.acad_class = AcademicClass.objects.create(name="Grade 9", order=9)
        self.section = Section.objects.create(name="B", academic_class=self.acad_class)
        self.mentor = UserAccount.objects.create_user(
            username="grade_mentor",
            email="grade_mentor@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.student_user = UserAccount.objects.create_user(
            username="grade_student",
            email="grade_student@example.com",
            password="Pass@1234",
            role="student",
            tenant=self.tenant,
        )
        self.student = Student.objects.create(
            user=self.student_user, academic_class=self.acad_class, section=self.section
        )
        self.parent_user = UserAccount.objects.create_user(
            username="grade_parent",
            email="grade_parent@example.com",
            password="Pass@1234",
            role="parent",
            tenant=self.tenant,
        )
        self.parent = Parent.objects.create(user=self.parent_user)
        self.parent.students.add(self.student)
        self.project = Project.objects.create(
            tenant=self.tenant,
            title="Final Project",
            mentor=self.mentor,
            is_group=True,
            section=self.section,
            status="submitted",
            final_grade=88,
        )
        ProjectMember.objects.create(
            tenant=self.tenant, project=self.project, student=self.student
        )

    def test_grade_update_notifies_member_and_parent(self):
        from projects.models import ProjectUpdate

        ProjectUpdate.objects.create(
            tenant=self.tenant,
            project=self.project,
            author=self.mentor,
            kind="grade",
            body="Great work",
            meta={"final_grade": 88.0},
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.student_user, title__icontains="graded"
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.parent_user, title__icontains="graded"
            ).exists()
        )


class OverdueScanTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Overdue Scan School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.acad_class = AcademicClass.objects.create(name="Grade 7", order=7)
        self.section = Section.objects.create(name="C", academic_class=self.acad_class)
        self.mentor = UserAccount.objects.create_user(
            username="ov_mentor",
            email="ov_mentor@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.student_user = UserAccount.objects.create_user(
            username="ov_student",
            email="ov_student@example.com",
            password="Pass@1234",
            role="student",
            tenant=self.tenant,
        )
        self.student = Student.objects.create(
            user=self.student_user, academic_class=self.acad_class, section=self.section
        )
        self.project = Project.objects.create(
            tenant=self.tenant,
            title="Overdue Project",
            mentor=self.mentor,
            is_group=True,
            section=self.section,
            leader=self.student,
            status="active",
        )

    def test_overdue_task_notifies_assignee(self):
        # Reset notifications created by signals to isolate the scan effect.
        ProjectTask.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Late task",
            assignee=self.student,
            due_date=timezone.now() - timedelta(hours=2),
        )
        Notification.objects.all().delete()

        emitted = _scan_overdue_for_current_tenant(self.tenant)
        self.assertGreaterEqual(emitted, 1)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.student_user, title__icontains="overdue"
            ).exists()
        )

    def test_idempotent_no_repeat_notifications(self):
        ProjectTask.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Late task 2",
            assignee=self.student,
            due_date=timezone.now() - timedelta(hours=2),
        )
        Notification.objects.all().delete()
        first = _scan_overdue_for_current_tenant(self.tenant)
        second = _scan_overdue_for_current_tenant(self.tenant)
        self.assertGreaterEqual(first, 1)
        self.assertEqual(second, 0)

    def test_done_task_not_notified(self):
        ProjectTask.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Finished task",
            assignee=self.student,
            due_date=timezone.now() - timedelta(hours=2),
            status="done",
        )
        Notification.objects.all().delete()
        emitted = _scan_overdue_for_current_tenant(self.tenant)
        self.assertEqual(emitted, 0)


class DueSoonScanTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Due Soon Scan School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.acad_class = AcademicClass.objects.create(name="Grade 6", order=6)
        self.section = Section.objects.create(name="D", academic_class=self.acad_class)
        self.mentor = UserAccount.objects.create_user(
            username="ds_mentor",
            email="ds_mentor@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.student_user = UserAccount.objects.create_user(
            username="ds_student",
            email="ds_student@example.com",
            password="Pass@1234",
            role="student",
            tenant=self.tenant,
        )
        self.student = Student.objects.create(
            user=self.student_user, academic_class=self.acad_class, section=self.section
        )

    def _make_project(self, due_in_hours: int) -> Project:
        project = Project.objects.create(
            tenant=self.tenant,
            title=f"Due in {due_in_hours}h",
            mentor=self.mentor,
            is_group=True,
            section=self.section,
            status="active",
            due_date=timezone.now() + timedelta(hours=due_in_hours),
        )
        ProjectMember.objects.create(
            tenant=self.tenant, project=project, student=self.student
        )
        return project

    def test_within_24h_notifies(self):
        self._make_project(due_in_hours=12)
        Notification.objects.all().delete()
        emitted = _scan_due_soon_for_current_tenant(self.tenant)
        self.assertGreaterEqual(emitted, 1)

    def test_outside_24h_skipped(self):
        self._make_project(due_in_hours=72)
        Notification.objects.all().delete()
        emitted = _scan_due_soon_for_current_tenant(self.tenant)
        self.assertEqual(emitted, 0)
