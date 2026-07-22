# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Seeds Project/ProjectMember/ProjectTask/ProjectUpdate/ProjectSubmission/
RubricTemplate demo data for an existing school tenant, so the teacher
portal's Projects pages have content across every workflow status
(draft/active/submitted/graded). Idempotent (existence-check throughout).

Assumes seed_school_demo_data has already been run for the target schema.

Usage:
  python manage.py seed_projects_demo_data --schema apividyaniketan
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django_tenants.utils import schema_context

from academic.models import Section, Student, Subject
from core.models import Tenant
from projects.models import (
    Project,
    ProjectMember,
    ProjectSubmission,
    ProjectTask,
    ProjectUpdate,
    RubricTemplate,
)
from users.models import UserAccount

PROJECT_TITLES = [
    "Community Awareness Campaign",
    "Science Fair Investigation",
    "Digital Storytelling Project",
    "Environmental Sustainability Study",
    "Local History Documentary",
    "Model United Nations Brief",
    "Robotics Build Challenge",
    "School Newsletter Launch",
]

# (status, is_group, task statuses)
PROJECT_SPECS = [
    ("draft", True, ["todo", "todo", "todo", "todo"]),
    ("active", True, ["done", "in_progress", "todo", "todo"]),
    ("submitted", True, ["done", "done", "done", "review"]),
    ("graded", False, ["done", "done", "done", "done"]),
]

TASK_TITLES = ["Research & Planning", "Draft / Prototype", "Peer Review", "Final Presentation"]

RUBRIC_TEMPLATES = [
    (
        "Group Project Rubric",
        [
            {"criterion": "Collaboration", "max": 20},
            {"criterion": "Content Quality", "max": 40},
            {"criterion": "Presentation", "max": 20},
            {"criterion": "Timeliness", "max": 20},
        ],
    ),
    (
        "Individual Research Rubric",
        [
            {"criterion": "Depth of Research", "max": 30},
            {"criterion": "Analysis & Critical Thinking", "max": 30},
            {"criterion": "Writing Quality", "max": 20},
            {"criterion": "Citations & Sources", "max": 20},
        ],
    ),
    (
        "Presentation Rubric",
        [
            {"criterion": "Clarity", "max": 25},
            {"criterion": "Visual Design", "max": 25},
            {"criterion": "Delivery", "max": 25},
            {"criterion": "Q&A Handling", "max": 25},
        ],
    ),
]


class Command(BaseCommand):
    help = (
        "Seed Project/ProjectTask/ProjectMember/ProjectUpdate/"
        "ProjectSubmission/RubricTemplate demo data for an existing "
        "tenant. Run seed_school_demo_data first."
    )

    def add_arguments(self, parser):
        parser.add_argument("--schema", required=True, help="Tenant schema to seed into.")
        parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducible sampling.")

    def handle(self, *args, **options):
        schema = str(options["schema"]).strip().lower()
        rng = random.Random(int(options["seed"]))

        if not schema or schema == "public":
            raise CommandError("--schema must be a non-public tenant schema.")

        tenant = Tenant.objects.filter(schema_name=schema).first()
        if not tenant:
            raise CommandError(f"Tenant schema '{schema}' not found.")

        with schema_context(schema):
            sections = list(
                Section.objects.select_related("academic_class").order_by("academic_class__order", "name")
            )
            if not sections:
                raise CommandError(
                    f"No classes/sections found in schema '{schema}'. Run seed_school_demo_data first."
                )
            admin_user = UserAccount.objects.filter(tenant=tenant, role="admin").order_by("email").first()

            projects_created = 0
            members_created = 0
            tasks_created = 0
            updates_created = 0
            submissions_created = 0

            for idx, section in enumerate(sections):
                cls = section.academic_class
                status, is_group, task_statuses = PROJECT_SPECS[idx % len(PROJECT_SPECS)]
                title = f"{PROJECT_TITLES[idx % len(PROJECT_TITLES)]} ({cls.name})"

                students = list(Student.objects.filter(academic_class=cls, section=section).select_related("user"))
                if not students:
                    continue
                subject_with_teacher = (
                    Subject.objects.filter(academic_class=cls, teacher__isnull=False).select_related("teacher__user").first()
                )
                mentor_user = subject_with_teacher.teacher.user if subject_with_teacher else admin_user
                if not mentor_user:
                    continue

                due_date = (
                    timezone.now() - timedelta(days=5)
                    if status in ("submitted", "graded")
                    else timezone.now() + timedelta(days=14)
                )
                members_pool = students[: rng.randint(2, min(4, len(students)))] if is_group else students[:1]
                leader = members_pool[0] if is_group and members_pool else None

                project, project_created = Project.objects.get_or_create(
                    tenant=tenant,
                    title=title,
                    defaults={
                        "description": f"A {'group' if is_group else 'individual'} project for {cls.name}: {title}.",
                        "subject": subject_with_teacher,
                        "section": section,
                        "mentor": mentor_user,
                        "leader": leader,
                        "is_group": is_group,
                        "min_group_size": 2 if is_group else None,
                        "max_group_size": 4 if is_group else None,
                        "start_date": timezone.localdate() - timedelta(days=20),
                        "due_date": due_date,
                        "status": status,
                        "final_grade": Decimal(str(rng.randint(70, 95))) if status == "graded" else None,
                        "created_by": mentor_user,
                    },
                )
                if not project_created:
                    continue
                projects_created += 1

                for member_idx, student in enumerate(members_pool):
                    _, member_created = ProjectMember.objects.get_or_create(
                        tenant=tenant,
                        project=project,
                        student=student,
                        defaults={"role": "leader" if student == leader else "member"},
                    )
                    if member_created:
                        members_created += 1

                assignee_cycle = members_pool or students[:1]
                task_objs = []
                for task_idx, (task_title, task_status) in enumerate(zip(TASK_TITLES, task_statuses)):
                    task = ProjectTask.objects.create(
                        tenant=tenant,
                        project=project,
                        title=task_title,
                        description=f"{task_title} for {title}.",
                        assignee=assignee_cycle[task_idx % len(assignee_cycle)],
                        weight=1,
                        status=task_status,
                        order=task_idx + 1,
                        due_date=due_date - timedelta(days=(len(TASK_TITLES) - task_idx) * 3),
                        created_by=mentor_user,
                    )
                    task_objs.append(task)
                    tasks_created += 1

                ProjectUpdate.objects.create(
                    tenant=tenant, project=project, author=mentor_user,
                    kind="comment", body=f"Kickoff meeting held for '{title}'. Roles assigned.",
                )
                updates_created += 1
                if status in ("active", "submitted", "graded"):
                    ProjectUpdate.objects.create(
                        tenant=tenant, project=project, task=task_objs[0] if task_objs else None,
                        author=mentor_user, kind="task_completed",
                        body=f"{task_objs[0].title} marked complete." if task_objs else "First milestone complete.",
                    )
                    updates_created += 1

                if status in ("submitted", "graded"):
                    submitted_at = due_date + timedelta(days=1) if idx % 3 == 0 else due_date - timedelta(days=1)
                    ProjectSubmission.objects.create(
                        tenant=tenant, project=project,
                        submitted_by=(leader.user if leader else mentor_user),
                        notes=f"Final submission for {title}.",
                        is_final=True, submitted_at=submitted_at,
                    )
                    submissions_created += 1
                if status == "graded":
                    ProjectUpdate.objects.create(
                        tenant=tenant, project=project, author=mentor_user,
                        kind="grade", body=f"Graded {project.final_grade}/100.",
                    )
                    updates_created += 1

            rubrics_created = 0
            for name, criteria in RUBRIC_TEMPLATES:
                _, rubric_created = RubricTemplate.objects.get_or_create(
                    tenant=tenant, name=name, owner=None,
                    defaults={"description": f"Tenant-shared rubric: {name}.", "criteria_json": criteria},
                )
                if rubric_created:
                    rubrics_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nProjects demo data seeded into schema={schema}: {projects_created} projects, "
                f"{members_created} members, {tasks_created} tasks, {updates_created} updates, "
                f"{submissions_created} submissions, {rubrics_created} rubric templates created."
            )
        )
