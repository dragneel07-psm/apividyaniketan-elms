# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context

from academic.models import (
    AcademicClass,
    Assessment,
    Attendance,
    Chapter,
    Lesson,
    LessonProgress,
    Parent,
    Result,
    Student,
    Subject,
    Teacher,
)
from academic.models.submission import Submission
from ai_engine.services.risk_analytics_service import RiskAnalyticsService
from notifications.models import Notification

User = get_user_model()


class RiskAnalyticsServiceTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Risk Analytics School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        with tenant_context(self.tenant):
            self.teacher_user = User.objects.create_user(
                username="risk_teacher",
                email="risk_teacher@example.com",
                password="RiskTeacher@123",
                role="teacher",
                tenant=self.tenant,
            )
            self.parent_user = User.objects.create_user(
                username="risk_parent",
                email="risk_parent@example.com",
                password="RiskParent@123",
                role="parent",
                tenant=self.tenant,
            )
            self.risky_user = User.objects.create_user(
                username="risk_student_1",
                email="risk_student_1@example.com",
                password="RiskStudent@123",
                role="student",
                tenant=self.tenant,
                first_name="Risky",
                last_name="Learner",
            )
            self.safe_user = User.objects.create_user(
                username="risk_student_2",
                email="risk_student_2@example.com",
                password="RiskStudent@123",
                role="student",
                tenant=self.tenant,
                first_name="Steady",
                last_name="Learner",
            )

            self.academic_class = AcademicClass.objects.create(name="Grade 9")
            self.teacher_profile = Teacher.objects.create(
                user=self.teacher_user, designation="class_teacher"
            )
            self.teacher_profile.assigned_classes.add(self.academic_class)

            self.risky_student = Student.objects.create(
                user=self.risky_user, academic_class=self.academic_class
            )
            self.safe_student = Student.objects.create(
                user=self.safe_user, academic_class=self.academic_class
            )

            parent_profile = Parent.objects.create(user=self.parent_user)
            parent_profile.students.add(self.risky_student)

            self.subject = Subject.objects.create(
                name="Science",
                academic_class=self.academic_class,
                is_active=True,
                teacher=self.teacher_profile,
            )
            chapter = Chapter.objects.create(
                subject=self.subject, title="Motion", order=1, is_published=True
            )
            self.lessons = [
                Lesson.objects.create(
                    chapter=chapter,
                    title=f"Lesson {idx + 1}",
                    content_type="text",
                    content="Physics topic content",
                    order=idx + 1,
                    is_published=True,
                    duration_minutes=40,
                )
                for idx in range(4)
            ]

            # Attendance trend: risky student declines sharply in recent window.
            base_date = timezone.localdate() - timedelta(days=19)
            for day in range(20):
                date_value = base_date + timedelta(days=day)
                Attendance.objects.create(
                    student=self.risky_student,
                    subject=self.subject,
                    date=date_value,
                    status="present" if day < 10 else "absent",
                )
                Attendance.objects.create(
                    student=self.safe_student,
                    subject=self.subject,
                    date=date_value,
                    status="present" if day not in {5, 14} else "late",
                )

            # Grade trend: risky student drops in recent results.
            risky_scores = [90, 85, 80, 50, 45, 40]
            safe_scores = [80, 82, 84, 85, 83, 86]
            for idx in range(6):
                assessment = Assessment.objects.create(
                    subject=self.subject,
                    title=f"Quiz {idx + 1}",
                    type="quiz",
                    total_marks=100,
                    passing_marks=40,
                    duration_minutes=30,
                )
                risky_result = Result.objects.create(
                    assessment=assessment,
                    student=self.risky_student,
                    score=risky_scores[idx],
                )
                safe_result = Result.objects.create(
                    assessment=assessment,
                    student=self.safe_student,
                    score=safe_scores[idx],
                )
                submitted_at = timezone.now() - timedelta(days=30 - (idx * 3))
                Result.objects.filter(result_id=risky_result.result_id).update(
                    submitted_at=submitted_at
                )
                Result.objects.filter(result_id=safe_result.result_id).update(
                    submitted_at=submitted_at
                )

            # Missing assignments for risky student.
            assignment_one = Assessment.objects.create(
                subject=self.subject,
                title="Assignment A",
                type="assignment",
                total_marks=20,
                passing_marks=8,
                due_date=timezone.now() - timedelta(days=5),
                duration_minutes=30,
            )
            assignment_two = Assessment.objects.create(
                subject=self.subject,
                title="Assignment B",
                type="assignment",
                total_marks=20,
                passing_marks=8,
                due_date=timezone.now() - timedelta(days=3),
                duration_minutes=30,
            )
            Submission.objects.create(
                assessment=assignment_one,
                student=self.safe_student,
                content="Submitted",
                status="submitted",
            )
            Submission.objects.create(
                assessment=assignment_two,
                student=self.safe_student,
                content="Submitted",
                status="submitted",
            )

            # Lesson activity/inactivity.
            risky_progress = LessonProgress.objects.create(
                student=self.risky_student,
                lesson=self.lessons[0],
                completed=False,
                progress_percent=10,
            )
            LessonProgress.objects.filter(pk=risky_progress.pk).update(
                last_accessed=timezone.now() - timedelta(days=30)
            )

            for lesson in self.lessons:
                LessonProgress.objects.create(
                    student=self.safe_student,
                    lesson=lesson,
                    completed=True,
                    progress_percent=100,
                )

    def test_computes_high_risk_for_declining_student(self):
        with tenant_context(self.tenant):
            service = RiskAnalyticsService(tenant=self.tenant, user=self.teacher_user)
            payload = service.get_at_risk_students(
                class_id=self.academic_class.id, send_notifications=False
            )

        self.assertGreaterEqual(len(payload), 1)
        top_row = payload[0]
        self.assertEqual(str(top_row["student_id"]), str(self.risky_student.student_id))
        self.assertGreaterEqual(int(top_row["risk_score"]), 60)

        reasons = " ".join(top_row.get("reasons", [])).lower()
        self.assertIn("attendance", reasons)
        self.assertIn("assignment", reasons)
        self.assertIn("lesson", reasons)

        all_student_ids = {str(row["student_id"]) for row in payload}
        self.assertNotIn(str(self.safe_student.student_id), all_student_ids)

    @override_settings(AI_AT_RISK_NOTIFICATION_THRESHOLD=60, AI_AT_RISK_MIN_SCORE=40)
    def test_creates_notifications_for_teacher_and_parent_when_threshold_crossed(self):
        with tenant_context(self.tenant):
            service = RiskAnalyticsService(tenant=self.tenant, user=self.teacher_user)
            payload = service.get_at_risk_students(
                class_id=self.academic_class.id, send_notifications=True
            )

            self.assertTrue(payload)
            self.assertTrue(
                Notification.objects.filter(
                    recipient=self.teacher_user, tenant=self.tenant
                ).exists()
            )
            self.assertTrue(
                Notification.objects.filter(
                    recipient=self.parent_user, tenant=self.tenant
                ).exists()
            )
