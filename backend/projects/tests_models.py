# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Model invariant tests for the projects app.
Run with: python manage.py test projects.tests_models
"""

from datetime import timedelta

from django.core.exceptions import ValidationError
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase

from academic.models import AcademicClass, Section, Student
from projects.models import Project, ProjectMember, ProjectSubmission, ProjectTask
from users.models import UserAccount


class ProjectInvariantTests(FastTenantTestCase):
    """Status transitions, group-size validation, group/section requirement."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Projects Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.mentor = UserAccount.objects.create_user(
            username="proj_mentor",
            email="proj_mentor@example.com",
            password="Teacher@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.acad_class = AcademicClass.objects.create(name="Grade 8", order=8)
        self.section = Section.objects.create(name="A", academic_class=self.acad_class)

    def _make_project(self, **overrides):
        defaults = dict(
            tenant=self.tenant,
            title="Solar System Model",
            mentor=self.mentor,
            is_group=False,
        )
        defaults.update(overrides)
        return Project(**defaults)

    # --- Status transitions ---

    def test_draft_can_transition_to_active(self):
        p = self._make_project()
        self.assertTrue(p.can_transition_to("active"))

    def test_draft_cannot_skip_to_graded(self):
        p = self._make_project()
        self.assertFalse(p.can_transition_to("graded"))

    def test_active_to_submitted_allowed(self):
        p = self._make_project(status="active")
        self.assertTrue(p.can_transition_to("submitted"))

    def test_archived_is_terminal(self):
        p = self._make_project(status="archived")
        for target in ("draft", "active", "submitted", "graded"):
            self.assertFalse(p.can_transition_to(target))

    # --- Group/section invariant ---

    def test_group_project_without_section_is_allowed(self):
        # Cross-class collaboration: members can span sections so the project
        # itself doesn't need to pin to one. (Phase 9 #5 dropped the rule
        # that group projects must carry a primary section.)
        p = self._make_project(is_group=True, section=None)
        p.clean()  # should not raise

    def test_group_project_with_section_passes(self):
        p = self._make_project(is_group=True, section=self.section)
        p.clean()  # should not raise

    def test_individual_project_does_not_need_section(self):
        p = self._make_project(is_group=False, section=None)
        p.clean()  # should not raise

    # --- Group size limits ---

    def test_min_greater_than_max_rejected(self):
        p = self._make_project(
            is_group=True, section=self.section, min_group_size=5, max_group_size=2
        )
        with self.assertRaises(ValidationError):
            p.clean()

    def test_min_equal_to_max_allowed(self):
        p = self._make_project(
            is_group=True, section=self.section, min_group_size=3, max_group_size=3
        )
        p.clean()

    def test_size_limits_only_for_group_projects(self):
        p = self._make_project(is_group=False, min_group_size=2, max_group_size=4)
        with self.assertRaises(ValidationError):
            p.clean()


class ProjectProgressTests(FastTenantTestCase):
    """progress_percent across edge cases."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Progress Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.mentor = UserAccount.objects.create_user(
            username="progress_mentor",
            email="progress_mentor@example.com",
            password="Teacher@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.project = Project.objects.create(
            tenant=self.tenant,
            title="Progress Project",
            mentor=self.mentor,
            status="active",
        )

    def _add_task(self, status="todo", weight=1):
        return ProjectTask.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Task",
            status=status,
            weight=weight,
        )

    def test_zero_tasks_progress_is_zero(self):
        self.assertEqual(self.project.progress_percent, 0)
        self.assertEqual(self.project.progress_label, "0 of 0 tasks done")

    def test_all_done_progress_is_100(self):
        for _ in range(3):
            self._add_task(status="done")
        self.assertEqual(self.project.progress_percent, 100.0)
        self.assertEqual(self.project.progress_label, "3 of 3 tasks done")

    def test_half_done_progress_is_50(self):
        self._add_task(status="done")
        self._add_task(status="todo")
        self.assertEqual(self.project.progress_percent, 50.0)

    def test_weighted_tasks_reflect_weight(self):
        self._add_task(status="done", weight=3)
        self._add_task(status="todo", weight=1)
        # 3/(3+1) = 75%
        self.assertEqual(self.project.progress_percent, 75.0)

    def test_blocked_task_does_not_count_as_done(self):
        self._add_task(status="blocked")
        self._add_task(status="done")
        self.assertEqual(self.project.progress_percent, 50.0)


class ProjectTaskTests(FastTenantTestCase):
    """save() side effects on ProjectTask."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Task Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.mentor = UserAccount.objects.create_user(
            username="task_mentor",
            email="task_mentor@example.com",
            password="Teacher@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.project = Project.objects.create(
            tenant=self.tenant, title="P", mentor=self.mentor, status="active"
        )

    def test_marking_done_sets_completed_at(self):
        task = ProjectTask.objects.create(
            tenant=self.tenant, project=self.project, title="T", status="todo"
        )
        self.assertIsNone(task.completed_at)
        task.status = "done"
        task.save()
        self.assertIsNotNone(task.completed_at)

    def test_reverting_from_done_clears_completed_at(self):
        task = ProjectTask.objects.create(
            tenant=self.tenant, project=self.project, title="T", status="done"
        )
        self.assertIsNotNone(task.completed_at)
        task.status = "in_progress"
        task.save()
        self.assertIsNone(task.completed_at)

    def test_weight_floors_to_one(self):
        task = ProjectTask.objects.create(
            tenant=self.tenant, project=self.project, title="T", weight=0
        )
        # save() should bump weight up to 1
        self.assertEqual(task.weight, 1)


class ProjectMembershipTests(FastTenantTestCase):
    """ProjectMember validation against max_group_size."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Membership Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.mentor = UserAccount.objects.create_user(
            username="member_mentor",
            email="member_mentor@example.com",
            password="Teacher@1234",
            role="teacher",
            tenant=self.tenant,
        )
        self.acad_class = AcademicClass.objects.create(name="Grade 9", order=9)
        self.section = Section.objects.create(name="A", academic_class=self.acad_class)
        self.project = Project.objects.create(
            tenant=self.tenant,
            title="Capstone",
            mentor=self.mentor,
            is_group=True,
            section=self.section,
            max_group_size=2,
        )

    def _make_student(self, username):
        user = UserAccount.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        return Student.objects.create(
            user=user, academic_class=self.acad_class, section=self.section
        )

    def test_adding_within_cap_succeeds(self):
        s1 = self._make_student("mem_s1")
        ProjectMember.objects.create(
            tenant=self.tenant, project=self.project, student=s1
        )
        # No exception expected.

    def test_exceeding_max_group_size_rejected(self):
        s1 = self._make_student("mem_s2")
        s2 = self._make_student("mem_s3")
        s3 = self._make_student("mem_s4")
        ProjectMember.objects.create(
            tenant=self.tenant, project=self.project, student=s1
        )
        ProjectMember.objects.create(
            tenant=self.tenant, project=self.project, student=s2
        )
        third = ProjectMember(tenant=self.tenant, project=self.project, student=s3)
        with self.assertRaises(ValidationError):
            third.clean()

    def test_cross_class_members_allowed(self):
        # Phase 9 #5: a group project with no primary section can pull
        # members from any section.
        other_class = AcademicClass.objects.create(name="Grade 10", order=10)
        other_section = Section.objects.create(name="B", academic_class=other_class)

        cross_class_project = Project.objects.create(
            tenant=self.tenant,
            title="Cross-Class Capstone",
            mentor=self.mentor,
            is_group=True,
            section=None,  # no primary section — purely member-driven scoping
            max_group_size=5,
        )

        # Member from the original class.
        s1 = self._make_student("xc_s1")
        ProjectMember.objects.create(
            tenant=self.tenant, project=cross_class_project, student=s1
        )
        # Member from a *different* class section.
        u2 = UserAccount.objects.create_user(
            username="xc_s2",
            email="xc_s2@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        s2 = Student.objects.create(
            user=u2, academic_class=other_class, section=other_section
        )
        ProjectMember.objects.create(
            tenant=self.tenant, project=cross_class_project, student=s2
        )

        # Both members are accepted; no clean()/save() error.
        self.assertEqual(cross_class_project.members.count(), 2)


class ProjectSubmissionTests(FastTenantTestCase):
    """is_late auto-flag based on project.due_date."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Submission Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.mentor = UserAccount.objects.create_user(
            username="sub_mentor",
            email="sub_mentor@example.com",
            password="Teacher@1234",
            role="teacher",
            tenant=self.tenant,
        )

    def _make_project(self, due_offset_minutes):
        return Project.objects.create(
            tenant=self.tenant,
            title="Submitted",
            mentor=self.mentor,
            status="active",
            due_date=timezone.now() + timedelta(minutes=due_offset_minutes),
        )

    def test_on_time_submission_flagged_not_late(self):
        project = self._make_project(due_offset_minutes=60)
        sub = ProjectSubmission.objects.create(
            tenant=self.tenant, project=project, submitted_by=self.mentor
        )
        self.assertFalse(sub.is_late)

    def test_overdue_submission_flagged_late(self):
        project = self._make_project(due_offset_minutes=-60)
        sub = ProjectSubmission.objects.create(
            tenant=self.tenant, project=project, submitted_by=self.mentor
        )
        self.assertTrue(sub.is_late)

    def test_no_due_date_means_never_late(self):
        project = Project.objects.create(
            tenant=self.tenant,
            title="No Due Date",
            mentor=self.mentor,
            status="active",
        )
        sub = ProjectSubmission.objects.create(
            tenant=self.tenant, project=project, submitted_by=self.mentor
        )
        self.assertFalse(sub.is_late)
