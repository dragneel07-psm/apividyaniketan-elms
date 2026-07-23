# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import (
    AcademicClass,
    Chapter,
    Lesson,
    Section,
    Student,
    Subject,
    Teacher,
)
from academic.models.assessment import Assessment, Result
from academic.services.academic_year_service import ensure_current_academic_year
from academic.models.submission import Submission

User = get_user_model()


class StudentProfileOverviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin_user = User.objects.create_user(
            username="student_profile_admin",
            email="student_profile_admin@example.com",
            password="Admin@1234",
            role="admin",
            first_name="Admin",
            last_name="User",
        )
        self.teacher_user = User.objects.create_user(
            username="student_profile_teacher",
            email="student_profile_teacher@example.com",
            password="Teacher@1234",
            role="teacher",
            first_name="Class",
            last_name="Teacher",
        )
        self.unassigned_teacher_user = User.objects.create_user(
            username="student_profile_other_teacher",
            email="student_profile_other_teacher@example.com",
            password="Teacher@1234",
            role="teacher",
            first_name="Other",
            last_name="Teacher",
        )
        self.student_user = User.objects.create_user(
            username="student_profile_student",
            email="student_profile_student@example.com",
            password="Student@1234",
            role="student",
            first_name="Ravi",
            last_name="Karki",
        )

        self.academic_class = AcademicClass.objects.create(name="Grade 9", order=9)
        self.section = Section.objects.create(
            name="A", academic_class=self.academic_class
        )
        self.other_class = AcademicClass.objects.create(name="Grade 10", order=10)

        self.teacher_profile = Teacher.objects.create(
            user=self.teacher_user, designation="class_teacher"
        )
        self.teacher_profile.assigned_classes.add(self.academic_class)
        self.unassigned_teacher_profile = Teacher.objects.create(
            user=self.unassigned_teacher_user, designation="subject_teacher"
        )
        self.unassigned_teacher_profile.assigned_classes.add(self.other_class)

        self.student = Student.objects.create(
            user=self.student_user,
            academic_class=self.academic_class,
            section=self.section,
            learning_style="visual",
            daily_study_goal=45,
            focus_score=78,
            current_streak=5,
            total_minutes_learned=210,
        )

        self.year = ensure_current_academic_year()

        self.math = Subject.objects.create(
            name="Mathematics",
            code="MTH-9",
            academic_class=self.academic_class,
            academic_year=self.year,
            teacher=self.teacher_profile,
            is_active=True,
        )
        self.science = Subject.objects.create(
            name="Science",
            code="SCI-9",
            academic_class=self.academic_class,
            academic_year=self.year,
            teacher=self.teacher_profile,
            is_active=True,
        )

        self._create_lessons(self.math, total=3, published=2)
        self._create_lessons(self.science, total=2, published=1)

        self.quiz = Assessment.objects.create(
            academic_year=self.year,
            subject=self.math,
            section=self.section,
            title="Math Quiz 1",
            type="quiz",
            total_marks=20,
            passing_marks=8,
            scheduled_at=timezone.now() - timedelta(days=1),
            due_date=timezone.now() + timedelta(days=7),
            duration_minutes=30,
            blooms_level="apply",
        )
        self.assignment = Assessment.objects.create(
            academic_year=self.year,
            subject=self.science,
            section=self.section,
            title="Science Assignment 1",
            type="assignment",
            total_marks=30,
            passing_marks=12,
            scheduled_at=timezone.now() - timedelta(days=2),
            due_date=timezone.now() + timedelta(days=5),
            duration_minutes=60,
            blooms_level="understand",
        )

        Result.objects.create(
            assessment=self.quiz,
            student=self.student,
            score=16,
            time_taken_minutes=22,
        )
        submission = Submission.objects.create(
            assessment=self.assignment,
            student=self.student,
            status="submitted",
            content="Submitted assignment content",
            is_graded=True,
        )
        Result.objects.create(
            assessment=self.assignment,
            student=self.student,
            score=24,
            time_taken_minutes=45,
        )
        submission.status = "graded"
        submission.save(update_fields=["status"])

    def _create_lessons(self, subject, total, published):
        chapter = Chapter.objects.create(
            subject=subject, title=f"{subject.name} Chapter", order=1, is_published=True
        )
        for index in range(total):
            Lesson.objects.create(
                chapter=chapter,
                title=f"{subject.name} Lesson {index + 1}",
                order=index + 1,
                is_published=index < published,
            )

    def test_admin_can_view_enriched_student_profile_overview(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            f"/api/academic/students/{self.student.student_id}/profile-overview/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["student"]["first_name"], "Ravi")
        self.assertEqual(response.data["overall"]["total_subjects"], 2)
        self.assertEqual(response.data["overall"]["total_assessments"], 2)
        self.assertEqual(response.data["overall"]["total_assignments"], 1)
        self.assertEqual(response.data["overall"]["submitted_assignments"], 1)
        self.assertEqual(response.data["overall"]["average_score_percentage"], 80.0)

        subject_rows = response.data["subject_progress"]
        math_row = next(
            item for item in subject_rows if item["subject_name"] == "Mathematics"
        )
        science_row = next(
            item for item in subject_rows if item["subject_name"] == "Science"
        )

        self.assertEqual(math_row["assessments_total"], 1)
        self.assertEqual(math_row["average_score_percentage"], 80.0)
        self.assertEqual(science_row["assignment_total"], 1)
        self.assertEqual(science_row["assignment_submitted"], 1)
        self.assertEqual(science_row["assignment_pending"], 0)

        self.assertGreaterEqual(len(response.data["recent_results"]), 2)
        self.assertEqual(response.data["analytics"]["momentum_label"], "steady")

    def test_assigned_teacher_can_view_student_profile_overview(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get(
            f"/api/academic/students/{self.student.student_id}/profile-overview/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unassigned_teacher_cannot_view_student_profile_overview(self):
        # The queryset scopes students to classes the teacher teaches/is
        # assigned to, so an out-of-scope student is 404 (not found in this
        # teacher's scope) rather than 403 — avoids confirming existence.
        self.client.force_authenticate(user=self.unassigned_teacher_user)
        response = self.client.get(
            f"/api/academic/students/{self.student.student_id}/profile-overview/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
