# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import (
    AcademicClass,
    AcademicYear,
    Assessment,
    AssessmentResultPublicationAudit,
    Attendance,
    Chapter,
    Lesson,
    LessonMaterial,
    Result,
    Section,
    Student,
    StudentPromotionDecision,
    StudentPromotionDecisionHistory,
    Subject,
    Timetable,
)
from academic.models.question import Question

User = get_user_model()


class AcademicYearRolloverAndPromotionTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Rollover Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.admin_user = User.objects.create_user(
            username="rollover_admin",
            email="rollover_admin@example.com",
            password="Admin@1234",
            role="admin",
            first_name="Rollover",
            last_name="Admin",
            tenant=self.tenant,
        )
        self.client.force_authenticate(user=self.admin_user)

    def test_rollover_migrates_selected_data_and_promotes_students(self):
        source_year = AcademicYear.objects.create(
            name="2091-2092",
            start_date="2025-04-01",
            end_date="2026-03-31",
            is_current=True,
        )
        class_8 = AcademicClass.objects.create(name="Grade 8", order=8)
        class_9 = AcademicClass.objects.create(name="Grade 9", order=9)
        section_8a = Section.objects.create(name="A", academic_class=class_8)
        section_9a = Section.objects.create(name="A", academic_class=class_9)

        student_user = User.objects.create_user(
            username="rollover_student",
            email="rollover_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        student = Student.objects.create(
            user=student_user,
            academic_class=class_8,
            section=section_8a,
        )

        subject = Subject.objects.create(
            name="Mathematics",
            code="MATH-8",
            academic_class=class_8,
            academic_year=source_year,
            is_active=True,
        )
        assessment = Assessment.objects.create(
            academic_year=source_year,
            subject=subject,
            section=section_8a,
            title="Final Term Math",
            type="exam",
            total_marks=100,
            passing_marks=40,
            is_final_assessment=True,
        )
        Question.objects.create(
            assessment=assessment,
            text="2 + 2 = ?",
            type="mcq",
            options=["2", "3", "4", "5"],
            correct_answer="4",
            points=1,
            order=1,
        )
        chapter = Chapter.objects.create(
            subject=subject,
            title="Numbers",
            order=1,
            is_published=True,
        )
        lesson = Lesson.objects.create(
            chapter=chapter,
            title="Whole Numbers",
            content_type="text",
            content="Intro lesson",
            order=1,
            is_published=True,
            assessment=assessment,
            duration_minutes=40,
        )
        LessonMaterial.objects.create(
            lesson=lesson,
            title="Worksheet",
            material_type="link",
            link="https://example.com/worksheet",
        )
        Timetable.objects.create(
            academic_year=source_year,
            academic_class=class_8,
            day_of_week="Monday",
            start_time="09:00",
            end_time="10:00",
            subject_name="Mathematics",
            entry_type="main",
        )

        payload = {
            "source_year": source_year.id,
            "target": {
                "name": "2092-2093",
                "start_date": "2026-04-01",
                "end_date": "2027-03-31",
            },
            "confirm": True,
            "options": {
                "migrate_timetable": True,
                "migrate_courses": True,
                "migrate_lessons": True,
                "migrate_quizzes": True,
                "auto_upgrade_students": True,
            },
        }
        response = self.client.post(
            "/api/academic/years/rollover/", payload, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        target_year = AcademicYear.objects.get(name="2092-2093")
        self.assertTrue(target_year.is_current)

        self.assertTrue(
            Subject.objects.filter(
                name="Mathematics",
                academic_class=class_8,
                academic_year=target_year,
            ).exists()
        )
        target_subject = Subject.objects.get(
            name="Mathematics",
            academic_class=class_8,
            academic_year=target_year,
        )
        self.assertTrue(
            Chapter.objects.filter(subject=target_subject, title="Numbers").exists()
        )
        target_chapter = Chapter.objects.get(subject=target_subject, title="Numbers")
        self.assertTrue(
            Lesson.objects.filter(
                chapter=target_chapter, title="Whole Numbers"
            ).exists()
        )
        target_lesson = Lesson.objects.get(
            chapter=target_chapter, title="Whole Numbers"
        )
        self.assertTrue(
            LessonMaterial.objects.filter(
                lesson=target_lesson, title="Worksheet"
            ).exists()
        )
        self.assertTrue(
            Assessment.objects.filter(
                academic_year=target_year,
                subject=target_subject,
                title="Final Term Math",
            ).exists()
        )
        self.assertTrue(
            Timetable.objects.filter(
                academic_year=target_year,
                academic_class=class_8,
                day_of_week="Monday",
                start_time="09:00",
            ).exists()
        )

        student.refresh_from_db()
        self.assertEqual(student.academic_class_id, class_9.id)
        self.assertEqual(student.section_id, section_9a.id)

        summary = response.data.get("summary", {})
        self.assertGreaterEqual(summary.get("subjects_migrated", 0), 1)
        self.assertGreaterEqual(summary.get("lessons_migrated", 0), 1)
        self.assertGreaterEqual(summary.get("assessments_migrated", 0), 1)
        self.assertGreaterEqual(summary.get("students_promoted", 0), 1)

    def test_rollover_requires_confirm_and_supports_dry_run_preview(self):
        source_year = AcademicYear.objects.create(
            name="2061-2062",
            start_date="2022-04-01",
            end_date="2023-03-31",
            is_current=True,
        )
        academic_class = AcademicClass.objects.create(name="Grade 5", order=5)
        Subject.objects.create(
            name="Social Studies",
            code="SOC-5",
            academic_class=academic_class,
            academic_year=source_year,
            is_active=True,
        )

        base_payload = {
            "source_year": source_year.id,
            "target": {
                "name": "2062-2063",
                "start_date": "2023-04-01",
                "end_date": "2024-03-31",
            },
            "options": {
                "migrate_courses": True,
                "migrate_lessons": False,
                "migrate_quizzes": False,
                "migrate_timetable": False,
                "auto_upgrade_students": False,
            },
        }

        preview_response = self.client.post(
            "/api/academic/years/rollover/",
            {**base_payload, "dry_run": True},
            format="json",
        )
        self.assertEqual(preview_response.status_code, status.HTTP_200_OK)
        self.assertTrue(preview_response.data.get("dry_run"))
        self.assertIn("summary", preview_response.data)
        self.assertEqual(
            preview_response.data["summary"].get("subjects_to_migrate", 0),
            1,
        )
        self.assertFalse(AcademicYear.objects.filter(name="2062-2063").exists())

        missing_confirm = self.client.post(
            "/api/academic/years/rollover/", base_payload, format="json"
        )
        self.assertEqual(missing_confirm.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm", str(missing_confirm.data.get("detail", "")).lower())

        confirmed = self.client.post(
            "/api/academic/years/rollover/",
            {**base_payload, "confirm": True},
            format="json",
        )
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)
        self.assertTrue(AcademicYear.objects.filter(name="2062-2063").exists())

    def test_publish_final_results_promotes_only_target_assessment_scope(self):
        year = AcademicYear.objects.create(
            name="2081-2082",
            start_date="2024-04-01",
            end_date="2025-03-31",
            is_current=True,
        )
        class_7 = AcademicClass.objects.create(name="Grade 7", order=7)
        class_8 = AcademicClass.objects.create(name="Grade 8", order=8)
        class_9 = AcademicClass.objects.create(name="Grade 9", order=9)
        section_7a = Section.objects.create(name="A", academic_class=class_7)
        section_8a = Section.objects.create(name="A", academic_class=class_8)
        Section.objects.create(name="A", academic_class=class_9)

        promoted_user = User.objects.create_user(
            username="promotion_target",
            email="promotion_target@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        promoted_student = Student.objects.create(
            user=promoted_user,
            academic_class=class_7,
            section=section_7a,
        )

        unaffected_user = User.objects.create_user(
            username="promotion_other",
            email="promotion_other@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        unaffected_student = Student.objects.create(
            user=unaffected_user,
            academic_class=class_8,
            section=section_8a,
        )

        subject = Subject.objects.create(
            name="Science",
            code="SCI-7",
            academic_class=class_7,
            academic_year=year,
            is_active=True,
        )
        assessment = Assessment.objects.create(
            academic_year=year,
            subject=subject,
            section=section_7a,
            title="Grade 7 Final Science",
            type="exam",
            total_marks=100,
            passing_marks=40,
            is_final_assessment=True,
        )
        Result.objects.create(
            assessment=assessment,
            student=promoted_student,
            score=85,
            time_taken_minutes=45,
        )

        response = self.client.post(
            f"/api/academic/assessments/{assessment.assessment_id}/publish_results/?academic_year={year.id}",
            {"publish": True, "auto_upgrade_students": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assessment.refresh_from_db()
        promoted_student.refresh_from_db()
        unaffected_student.refresh_from_db()

        self.assertTrue(assessment.results_published)
        self.assertTrue(response.data.get("student_promotion"))
        self.assertEqual(response.data["student_promotion"]["promoted_students"], 1)
        self.assertEqual(promoted_student.academic_class_id, class_8.id)
        self.assertEqual(unaffected_student.academic_class_id, class_8.id)

    def test_publish_final_results_applies_threshold_rules_and_manual_overrides(self):
        year = AcademicYear.objects.create(
            name="2071-2072",
            start_date="2023-04-01",
            end_date="2024-03-31",
            is_current=True,
        )
        class_6 = AcademicClass.objects.create(name="Grade 6", order=6)
        class_7 = AcademicClass.objects.create(name="Grade 7", order=7)
        section_6a = Section.objects.create(name="A", academic_class=class_6)
        Section.objects.create(name="A", academic_class=class_7)

        low_score_user = User.objects.create_user(
            username="low_score_student",
            email="low_score_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        low_score_student = Student.objects.create(
            user=low_score_user,
            academic_class=class_6,
            section=section_6a,
        )
        manual_promote_user = User.objects.create_user(
            username="manual_promote_student",
            email="manual_promote_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        manual_promote_student = Student.objects.create(
            user=manual_promote_user,
            academic_class=class_6,
            section=section_6a,
        )
        manual_hold_user = User.objects.create_user(
            username="manual_hold_student",
            email="manual_hold_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        manual_hold_student = Student.objects.create(
            user=manual_hold_user,
            academic_class=class_6,
            section=section_6a,
        )

        subject = Subject.objects.create(
            name="English",
            code="ENG-6",
            academic_class=class_6,
            academic_year=year,
            is_active=True,
        )
        assessment = Assessment.objects.create(
            academic_year=year,
            subject=subject,
            section=section_6a,
            title="Grade 6 Final English",
            type="exam",
            total_marks=100,
            passing_marks=40,
            is_final_assessment=True,
        )

        Result.objects.create(
            assessment=assessment,
            student=low_score_student,
            score=30,
            time_taken_minutes=40,
        )
        Result.objects.create(
            assessment=assessment,
            student=manual_promote_student,
            score=20,
            time_taken_minutes=40,
        )
        Result.objects.create(
            assessment=assessment,
            student=manual_hold_student,
            score=95,
            time_taken_minutes=40,
        )

        Attendance.objects.create(
            student=low_score_student,
            subject=subject,
            date="2023-05-02",
            status="present",
        )
        Attendance.objects.create(
            student=low_score_student,
            subject=subject,
            date="2023-05-03",
            status="absent",
        )
        Attendance.objects.create(
            student=manual_promote_student,
            subject=subject,
            date="2023-05-02",
            status="absent",
        )
        Attendance.objects.create(
            student=manual_hold_student,
            subject=subject,
            date="2023-05-02",
            status="present",
        )

        response = self.client.post(
            f"/api/academic/assessments/{assessment.assessment_id}/publish_results/?academic_year={year.id}",
            {
                "publish": True,
                "auto_upgrade_students": True,
                "promotion_rules": {
                    "min_score_percentage": 40,
                    "min_attendance_percentage": 60,
                    "manual_promote_student_ids": [
                        str(manual_promote_student.student_id)
                    ],
                    "manual_hold_student_ids": [str(manual_hold_student.student_id)],
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summary = response.data.get("student_promotion") or {}

        low_score_student.refresh_from_db()
        manual_promote_student.refresh_from_db()
        manual_hold_student.refresh_from_db()

        self.assertEqual(low_score_student.academic_class_id, class_6.id)
        self.assertEqual(manual_promote_student.academic_class_id, class_7.id)
        self.assertEqual(manual_hold_student.academic_class_id, class_6.id)

        self.assertEqual(summary.get("promoted_students"), 1)
        self.assertEqual(summary.get("failed_score"), 1)
        self.assertEqual(summary.get("manual_promoted"), 1)
        self.assertEqual(summary.get("manual_held"), 1)

    def test_promotion_exception_center_supports_single_and_bulk_decisions(self):
        year = AcademicYear.objects.create(
            name="2094-2095",
            start_date="2027-04-01",
            end_date="2028-03-31",
            is_current=True,
        )
        class_5 = AcademicClass.objects.create(name="Grade 5", order=5)
        class_6 = AcademicClass.objects.create(name="Grade 6", order=6)
        section_5a = Section.objects.create(name="A", academic_class=class_5)
        section_6a = Section.objects.create(name="A", academic_class=class_6)

        low_score_user = User.objects.create_user(
            username="exception_low_score",
            email="exception_low_score@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        low_score_student = Student.objects.create(
            user=low_score_user,
            academic_class=class_5,
            section=section_5a,
        )
        low_attendance_user = User.objects.create_user(
            username="exception_low_attendance",
            email="exception_low_attendance@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        low_attendance_student = Student.objects.create(
            user=low_attendance_user,
            academic_class=class_5,
            section=section_5a,
        )
        pass_user = User.objects.create_user(
            username="exception_pass_student",
            email="exception_pass_student@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        pass_student = Student.objects.create(
            user=pass_user,
            academic_class=class_5,
            section=section_5a,
        )

        subject = Subject.objects.create(
            name="Mathematics",
            code="MATH-5",
            academic_class=class_5,
            academic_year=year,
            is_active=True,
        )
        assessment = Assessment.objects.create(
            academic_year=year,
            subject=subject,
            section=section_5a,
            title="Grade 5 Final Mathematics",
            type="exam",
            total_marks=100,
            passing_marks=40,
            is_final_assessment=True,
        )

        Result.objects.create(
            assessment=assessment,
            student=low_score_student,
            score=30,
            time_taken_minutes=30,
        )
        Result.objects.create(
            assessment=assessment,
            student=low_attendance_student,
            score=80,
            time_taken_minutes=30,
        )
        Result.objects.create(
            assessment=assessment, student=pass_student, score=82, time_taken_minutes=30
        )

        Attendance.objects.create(
            student=low_score_student,
            subject=subject,
            date="2027-05-01",
            status="present",
        )
        Attendance.objects.create(
            student=low_score_student,
            subject=subject,
            date="2027-05-02",
            status="present",
        )
        Attendance.objects.create(
            student=low_attendance_student,
            subject=subject,
            date="2027-05-01",
            status="present",
        )
        Attendance.objects.create(
            student=low_attendance_student,
            subject=subject,
            date="2027-05-02",
            status="absent",
        )
        Attendance.objects.create(
            student=pass_student, subject=subject, date="2027-05-01", status="present"
        )
        Attendance.objects.create(
            student=pass_student, subject=subject, date="2027-05-02", status="present"
        )

        list_response = self.client.get(
            (
                f"/api/academic/assessments/{assessment.assessment_id}/promotion_exceptions/"
                f"?academic_year={year.id}&min_score_percentage=40&min_attendance_percentage=60"
            )
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data["summary"]["recommended_hold"], 2)

        rows = {item["student_id"]: item for item in list_response.data["students"]}
        self.assertEqual(
            rows[str(low_score_student.student_id)]["hold_reason"],
            "score_below_threshold",
        )
        self.assertEqual(
            rows[str(low_attendance_student.student_id)]["hold_reason"],
            "attendance_below_threshold",
        )
        self.assertEqual(
            rows[str(pass_student.student_id)]["recommended_action"], "promote"
        )

        bulk_response = self.client.post(
            f"/api/academic/assessments/{assessment.assessment_id}/promotion_exceptions/bulk/?academic_year={year.id}",
            {
                "action": "promote",
                "decision_reason": "Approved by exam committee",
                "fail_reason": "score_below_threshold",
                "min_score_percentage": 40,
                "min_attendance_percentage": 60,
            },
            format="json",
        )
        self.assertEqual(bulk_response.status_code, status.HTTP_200_OK)
        self.assertEqual(bulk_response.data["updated"], 1)

        decide_response = self.client.post(
            f"/api/academic/assessments/{assessment.assessment_id}/promotion_exceptions/decide/?academic_year={year.id}",
            {
                "student_id": str(pass_student.student_id),
                "action": "hold",
                "decision_reason": "Disciplinary hold after review",
                "min_score_percentage": 40,
                "min_attendance_percentage": 60,
            },
            format="json",
        )
        self.assertEqual(decide_response.status_code, status.HTTP_200_OK)

        missing_reason_response = self.client.post(
            f"/api/academic/assessments/{assessment.assessment_id}/promotion_exceptions/decide/?academic_year={year.id}",
            {
                "student_id": str(low_attendance_student.student_id),
                "action": "promote",
            },
            format="json",
        )
        self.assertEqual(
            missing_reason_response.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertIn(
            "decision_reason", str(missing_reason_response.data.get("detail", ""))
        )

        self.assertEqual(
            StudentPromotionDecision.objects.filter(assessment=assessment).count(),
            2,
        )
        promoted_decision = StudentPromotionDecision.objects.get(
            assessment=assessment,
            student=low_score_student,
        )
        self.assertEqual(promoted_decision.decision, "promote")
        self.assertEqual(
            promoted_decision.decision_reason, "Approved by exam committee"
        )
        self.assertEqual(promoted_decision.decided_by_id, self.admin_user.pk)

        held_decision = StudentPromotionDecision.objects.get(
            assessment=assessment,
            student=pass_student,
        )
        self.assertEqual(held_decision.decision, "hold")
        self.assertEqual(
            held_decision.decision_reason, "Disciplinary hold after review"
        )
        self.assertEqual(held_decision.decided_by_id, self.admin_user.pk)

        history_rows = StudentPromotionDecisionHistory.objects.filter(
            assessment=assessment
        )
        self.assertEqual(history_rows.count(), 2)
        self.assertTrue(
            history_rows.filter(
                student=low_score_student,
                action="promote",
                previous_decision__isnull=True,
                new_decision="promote",
                decision_reason="Approved by exam committee",
                decided_by=self.admin_user,
            ).exists()
        )
        self.assertTrue(
            history_rows.filter(
                student=pass_student,
                action="hold",
                previous_decision__isnull=True,
                new_decision="hold",
                decision_reason="Disciplinary hold after review",
                decided_by=self.admin_user,
            ).exists()
        )

        refreshed_list = self.client.get(
            (
                f"/api/academic/assessments/{assessment.assessment_id}/promotion_exceptions/"
                f"?academic_year={year.id}&min_score_percentage=40&min_attendance_percentage=60"
            )
        )
        self.assertEqual(refreshed_list.status_code, status.HTTP_200_OK)
        refreshed_rows = {
            item["student_id"]: item for item in refreshed_list.data["students"]
        }
        self.assertEqual(
            refreshed_rows[str(pass_student.student_id)]["decision"]["decision_reason"],
            "Disciplinary hold after review",
        )
        self.assertEqual(
            refreshed_rows[str(pass_student.student_id)]["history"][0]["new_decision"],
            "hold",
        )
        self.assertEqual(
            refreshed_rows[str(pass_student.student_id)]["history"][0][
                "decision_reason"
            ],
            "Disciplinary hold after review",
        )

        publish_response = self.client.post(
            f"/api/academic/assessments/{assessment.assessment_id}/publish_results/?academic_year={year.id}",
            {
                "publish": True,
                "auto_upgrade_students": True,
                "promotion_rules": {
                    "min_score_percentage": 40,
                    "min_attendance_percentage": 60,
                },
            },
            format="json",
        )
        self.assertEqual(publish_response.status_code, status.HTTP_200_OK)
        summary = publish_response.data.get("student_promotion") or {}

        low_score_student.refresh_from_db()
        low_attendance_student.refresh_from_db()
        pass_student.refresh_from_db()

        self.assertEqual(low_score_student.academic_class_id, class_6.id)
        self.assertEqual(low_score_student.section_id, section_6a.id)
        self.assertEqual(low_attendance_student.academic_class_id, class_5.id)
        self.assertEqual(pass_student.academic_class_id, class_5.id)

        self.assertEqual(summary.get("promoted_students"), 1)
        self.assertEqual(summary.get("manual_promoted"), 1)
        self.assertEqual(summary.get("manual_held"), 1)
        self.assertEqual(summary.get("failed_attendance"), 1)

        locked_decide = self.client.post(
            f"/api/academic/assessments/{assessment.assessment_id}/promotion_exceptions/decide/?academic_year={year.id}",
            {
                "student_id": str(low_attendance_student.student_id),
                "action": "promote",
                "decision_reason": "Late correction attempt",
            },
            format="json",
        )
        self.assertEqual(locked_decide.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("locked", str(locked_decide.data.get("detail", "")).lower())

        reopen_without_reason = self.client.post(
            f"/api/academic/assessments/{assessment.assessment_id}/reopen_results/?academic_year={year.id}",
            {},
            format="json",
        )
        self.assertEqual(reopen_without_reason.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(
            "reason", str(reopen_without_reason.data.get("detail", "")).lower()
        )

        reopen_response = self.client.post(
            f"/api/academic/assessments/{assessment.assessment_id}/reopen_results/?academic_year={year.id}",
            {"reason": "Reopen for correction after committee review"},
            format="json",
        )
        self.assertEqual(reopen_response.status_code, status.HTTP_200_OK)
        self.assertTrue(reopen_response.data.get("reopened"))
        self.assertFalse(reopen_response.data.get("results_published"))

        unlocked_decide = self.client.post(
            f"/api/academic/assessments/{assessment.assessment_id}/promotion_exceptions/decide/?academic_year={year.id}",
            {
                "student_id": str(low_attendance_student.student_id),
                "action": "promote",
                "decision_reason": "Override after reopened moderation",
                "min_score_percentage": 40,
                "min_attendance_percentage": 60,
            },
            format="json",
        )
        self.assertEqual(unlocked_decide.status_code, status.HTTP_200_OK)

        audit_rows = AssessmentResultPublicationAudit.objects.filter(
            assessment=assessment
        )
        self.assertTrue(
            audit_rows.filter(
                action="publish",
                is_published=True,
                was_published=False,
            ).exists()
        )
        self.assertTrue(
            audit_rows.filter(
                action="reopen",
                reason="Reopen for correction after committee review",
                is_published=False,
                was_published=True,
                performed_by=self.admin_user,
            ).exists()
        )
