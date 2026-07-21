# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
API + RBAC tests for the projects app.
Run with: python manage.py test projects.tests_api
"""

from datetime import timedelta

from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Parent, Section, Student
from projects.models import Project, ProjectMember, ProjectTask
from users.models import UserAccount


def _enable_projects(tenant):
    tenant.features = {**(tenant.features or {}), "projects": True}
    tenant.save(update_fields=["features"])


class ProjectsApiBaseTestCase(FastTenantTestCase):
    """Common setup: tenant, users for each role, students, parent link."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Projects API Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        _enable_projects(self.tenant)
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )

        # Class + section
        self.acad_class = AcademicClass.objects.create(name="Grade 10", order=10)
        self.section = Section.objects.create(name="A", academic_class=self.acad_class)

        # Mentor (teacher)
        self.mentor_user = UserAccount.objects.create_user(
            username="mentor",
            email="mentor@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        # Other teacher (non-mentor)
        self.other_teacher = UserAccount.objects.create_user(
            username="other_teacher",
            email="other_teacher@example.com",
            password="Pass@1234",
            role="teacher",
            tenant=self.tenant,
        )
        # Admin
        self.admin_user = UserAccount.objects.create_user(
            username="admin1",
            email="admin1@example.com",
            password="Pass@1234",
            role="admin",
            tenant=self.tenant,
        )
        # Student leader
        self.leader_user = UserAccount.objects.create_user(
            username="leader",
            email="leader@example.com",
            password="Pass@1234",
            role="student",
            tenant=self.tenant,
        )
        self.leader_student = Student.objects.create(
            user=self.leader_user,
            academic_class=self.acad_class,
            section=self.section,
        )
        # Student member
        self.member_user = UserAccount.objects.create_user(
            username="member1",
            email="member1@example.com",
            password="Pass@1234",
            role="student",
            tenant=self.tenant,
        )
        self.member_student = Student.objects.create(
            user=self.member_user,
            academic_class=self.acad_class,
            section=self.section,
        )
        # Outsider student (not in project)
        self.outsider_user = UserAccount.objects.create_user(
            username="outsider",
            email="outsider@example.com",
            password="Pass@1234",
            role="student",
            tenant=self.tenant,
        )
        self.outsider_student = Student.objects.create(
            user=self.outsider_user,
            academic_class=self.acad_class,
            section=self.section,
        )
        # Parent of leader
        self.parent_user = UserAccount.objects.create_user(
            username="parent1",
            email="parent1@example.com",
            password="Pass@1234",
            role="parent",
            tenant=self.tenant,
        )
        self.parent = Parent.objects.create(user=self.parent_user)
        self.parent.students.add(self.leader_student)

    def _login(self, user):
        self.client.force_authenticate(user=user)

    def _make_project(self, **overrides):
        defaults = dict(
            tenant=self.tenant,
            title="Capstone",
            mentor=self.mentor_user,
            is_group=True,
            section=self.section,
            min_group_size=2,
            max_group_size=5,
            status="active",
            due_date=timezone.now() + timedelta(days=7),
            leader=self.leader_student,
        )
        defaults.update(overrides)
        project = Project.objects.create(**defaults)
        ProjectMember.objects.create(
            tenant=self.tenant,
            project=project,
            student=self.leader_student,
            role="leader",
        )
        ProjectMember.objects.create(
            tenant=self.tenant,
            project=project,
            student=self.member_student,
            role="member",
        )
        return project


class FeatureFlagTests(ProjectsApiBaseTestCase):
    def test_flag_off_blocks_list(self):
        self.tenant.features = {}
        self.tenant.save(update_fields=["features"])
        self._login(self.mentor_user)
        resp = self.client.get("/api/projects/projects/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_flag_on_allows_list(self):
        self._login(self.mentor_user)
        resp = self.client.get("/api/projects/projects/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class ProjectCreateTests(ProjectsApiBaseTestCase):
    def test_teacher_can_create(self):
        self._login(self.mentor_user)
        resp = self.client.post(
            "/api/projects/projects/",
            {"title": "New Project", "is_group": False},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(str(resp.data["mentor"]), str(self.mentor_user.pk))

    def test_student_cannot_create(self):
        self._login(self.leader_user)
        resp = self.client.post(
            "/api/projects/projects/",
            {"title": "Student Attempt", "is_group": False},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_group_project_without_section_is_allowed(self):
        # Phase 9 #5: cross-class collaboration is supported by allowing a
        # group project to skip the primary-section pin.
        self._login(self.mentor_user)
        resp = self.client.post(
            "/api/projects/projects/",
            {"title": "Cross-Class Group Project", "is_group": True},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertTrue(resp.data["is_group"])
        self.assertIsNone(resp.data["section"])


class ProjectVisibilityTests(ProjectsApiBaseTestCase):
    def test_member_sees_own_project(self):
        project = self._make_project()
        self._login(self.member_user)
        resp = self.client.get("/api/projects/projects/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [p["project_id"] for p in resp.data.get("results", resp.data)]
        self.assertIn(str(project.project_id), ids)

    def test_outsider_does_not_see_project(self):
        project = self._make_project()
        self._login(self.outsider_user)
        resp = self.client.get("/api/projects/projects/")
        ids = [p["project_id"] for p in resp.data.get("results", resp.data)]
        self.assertNotIn(str(project.project_id), ids)

    def test_parent_sees_childs_project(self):
        project = self._make_project()
        self._login(self.parent_user)
        resp = self.client.get("/api/projects/projects/")
        ids = [p["project_id"] for p in resp.data.get("results", resp.data)]
        self.assertIn(str(project.project_id), ids)

    def test_other_teacher_can_read_but_not_write(self):
        project = self._make_project()
        self._login(self.other_teacher)
        resp = self.client.get(f"/api/projects/projects/{project.project_id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        resp = self.client.patch(
            f"/api/projects/projects/{project.project_id}/",
            {"title": "Hijacked"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class TaskRBACTests(ProjectsApiBaseTestCase):
    def setUp(self):
        super().setUp()
        self.project = self._make_project()

    def test_leader_can_create_task(self):
        self._login(self.leader_user)
        resp = self.client.post(
            "/api/projects/tasks/",
            {
                "project": str(self.project.project_id),
                "title": "Research",
                "assignee": str(self.member_student.student_id),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

    def test_member_cannot_create_task(self):
        self._login(self.member_user)
        resp = self.client.post(
            "/api/projects/tasks/",
            {"project": str(self.project.project_id), "title": "Sneaky Task"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_can_update_own_task_status(self):
        task = ProjectTask.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Build slides",
            assignee=self.member_student,
            status="todo",
        )
        self._login(self.member_user)
        resp = self.client.patch(
            f"/api/projects/tasks/{task.task_id}/",
            {"status": "in_progress"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        task.refresh_from_db()
        self.assertEqual(task.status, "in_progress")

    def test_member_cannot_change_someone_elses_task(self):
        task = ProjectTask.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Leader's task",
            assignee=self.leader_student,
        )
        self._login(self.member_user)
        resp = self.client.patch(
            f"/api/projects/tasks/{task.task_id}/",
            {"status": "done"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_cannot_change_title_of_own_task(self):
        task = ProjectTask.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Original",
            assignee=self.member_student,
        )
        self._login(self.member_user)
        resp = self.client.patch(
            f"/api/projects/tasks/{task.task_id}/",
            {"title": "Renamed"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class MembershipActionTests(ProjectsApiBaseTestCase):
    def setUp(self):
        super().setUp()
        self.project = self._make_project(max_group_size=3)

    def test_member_can_list_members(self):
        self._login(self.member_user)
        resp = self.client.get(
            f"/api/projects/projects/{self.project.project_id}/members/"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        student_ids = {str(m["student"]) for m in resp.data}
        self.assertIn(str(self.leader_student.student_id), student_ids)
        self.assertIn(str(self.member_student.student_id), student_ids)

    def test_outsider_cannot_list_members(self):
        self._login(self.outsider_user)
        resp = self.client.get(
            f"/api/projects/projects/{self.project.project_id}/members/"
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_mentor_can_add_member(self):
        self._login(self.mentor_user)
        resp = self.client.post(
            f"/api/projects/projects/{self.project.project_id}/members/",
            {"student": str(self.outsider_student.student_id), "role": "member"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(self.project.members.count(), 3)

    def test_mentor_cannot_exceed_max_group_size(self):
        # Project already has 2 members; max is 3 — first add ok, second add fails.
        self._login(self.mentor_user)
        ok = self.client.post(
            f"/api/projects/projects/{self.project.project_id}/members/",
            {"student": str(self.outsider_student.student_id)},
            format="json",
        )
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED)

        # Build one more student and try to push past cap.
        u4 = UserAccount.objects.create_user(
            username="extra",
            email="extra@example.com",
            password="Pass@1234",
            role="student",
            tenant=self.tenant,
        )
        s4 = Student.objects.create(
            user=u4, academic_class=self.acad_class, section=self.section
        )
        rejected = self.client.post(
            f"/api/projects/projects/{self.project.project_id}/members/",
            {"student": str(s4.student_id)},
            format="json",
        )
        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_cannot_add_member(self):
        self._login(self.leader_user)
        resp = self.client.post(
            f"/api/projects/projects/{self.project.project_id}/members/",
            {"student": str(self.outsider_student.student_id)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class SubmitAndGradeTests(ProjectsApiBaseTestCase):
    def setUp(self):
        super().setUp()
        self.project = self._make_project()

    def test_leader_can_submit(self):
        self._login(self.leader_user)
        resp = self.client.post(
            f"/api/projects/projects/{self.project.project_id}/submit/",
            {"notes": "Done."},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, "submitted")

    def test_member_cannot_submit_group_project(self):
        self._login(self.member_user)
        resp = self.client.post(
            f"/api/projects/projects/{self.project.project_id}/submit/",
            {},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_mentor_can_grade_after_submission(self):
        self.project.status = "submitted"
        self.project.save(update_fields=["status"])
        self._login(self.mentor_user)
        resp = self.client.post(
            f"/api/projects/projects/{self.project.project_id}/grade/",
            {"final_grade": 85.5, "rubric_json": {"presentation": 9}},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, "graded")
        self.assertEqual(float(self.project.final_grade), 85.5)

    def test_student_cannot_grade(self):
        self.project.status = "submitted"
        self.project.save(update_fields=["status"])
        self._login(self.leader_user)
        resp = self.client.post(
            f"/api/projects/projects/{self.project.project_id}/grade/",
            {"final_grade": 100},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class CommentTests(ProjectsApiBaseTestCase):
    def setUp(self):
        super().setUp()
        self.project = self._make_project()

    def test_member_can_post_comment(self):
        self._login(self.member_user)
        resp = self.client.post(
            "/api/projects/updates/",
            {
                "project": str(self.project.project_id),
                "kind": "comment",
                "body": "Working on slides.",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

    def test_outsider_cannot_post_comment(self):
        self._login(self.outsider_user)
        resp = self.client.post(
            "/api/projects/updates/",
            {
                "project": str(self.project.project_id),
                "kind": "comment",
                "body": "Hello.",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_cannot_force_grade_kind(self):
        self._login(self.member_user)
        resp = self.client.post(
            "/api/projects/updates/",
            {
                "project": str(self.project.project_id),
                "kind": "grade",
                "body": "I gave myself 100",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
