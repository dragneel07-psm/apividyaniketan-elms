# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Admin-only server-side action endpoints.

POST /api/academic/admin/actions/seed-attendance/
POST /api/academic/admin/actions/generate-ai-reports/

Both require an authenticated admin/staff session.  These exist so
demo/setup tasks can be triggered from the API without SSH access.
"""

import random
from datetime import date, timedelta

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from academic.models import Assessment, Attendance, Result, Student, Subject
from academic.services.academic_year_service import ensure_current_academic_year
from core.permissions import IsAdminOrStaff


def _school_days(end: date, count: int):
    days = []
    cursor = end
    while len(days) < count:
        if cursor.weekday() < 5:
            days.append(cursor)
        cursor -= timedelta(days=1)
    return days


def _attendance_status() -> str:
    r = random.random()
    if r < 0.83:
        return "present"
    if r < 0.95:
        return "absent"
    return "late"


class SeedAttendanceView(APIView):
    """
    POST /api/academic/admin/actions/seed-attendance/
    Body (optional): { "days": 30, "clear": false }
    """

    permission_classes = [IsAuthenticated, IsAdminOrStaff]

    def post(self, request):
        days_count = int(request.data.get("days", 30))
        do_clear = bool(request.data.get("clear", False))

        if days_count < 1 or days_count > 365:
            return Response(
                {"detail": "days must be between 1 and 365."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_year = ensure_current_academic_year()

        if do_clear:
            deleted, _ = Attendance.objects.all().delete()
        else:
            deleted = 0

        subjects = list(
            Subject.objects.filter(academic_year=current_year).select_related(
                "academic_class"
            )
            if current_year
            else Subject.objects.select_related("academic_class").all()
        )

        if not subjects:
            return Response(
                {"detail": "No subjects found. Seed subjects first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        class_subjects: dict = {}
        for subj in subjects:
            class_subjects.setdefault(subj.academic_class_id, []).append(subj)

        students = list(
            Student.objects.select_related("academic_class").filter(
                academic_class_id__in=class_subjects.keys()
            )
        )

        if not students:
            return Response(
                {"detail": "No students found in classes with subjects."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        school_days = _school_days(date.today(), days_count)
        records = []
        seen: set = set()

        for student in students:
            subj_list = class_subjects.get(student.academic_class_id, [])
            for day in school_days:
                for subj in subj_list:
                    key = (student.pk, subj.pk, day)
                    if key not in seen:
                        seen.add(key)
                        records.append(
                            Attendance(
                                student=student,
                                subject=subj,
                                date=day,
                                status=_attendance_status(),
                            )
                        )

        created_count = 0
        batch_size = 500
        for i in range(0, len(records), batch_size):
            objs = Attendance.objects.bulk_create(
                records[i : i + batch_size], ignore_conflicts=True
            )
            created_count += len(objs)

        return Response(
            {
                "status": "ok",
                "deleted": deleted,
                "created": created_count,
                "students": len(students),
                "subjects": len(subjects),
                "days": days_count,
                "academic_year": current_year.name if current_year else None,
            }
        )


class SeedResultsView(APIView):
    """
    POST /api/academic/admin/actions/seed-results/
    Body (optional): { "clear": false }
    Creates realistic Result records so grades appear on dashboards.
    Each student gets a result for every past assessment in their class.
    """

    permission_classes = [IsAuthenticated, IsAdminOrStaff]

    def post(self, request):
        do_clear = bool(request.data.get("clear", False))

        if do_clear:
            deleted, _ = Result.objects.all().delete()
        else:
            deleted = 0

        current_year = ensure_current_academic_year()

        base_qs = Assessment.objects.select_related(
            "subject", "subject__academic_class"
        )
        if current_year:
            assessments = list(base_qs.filter(academic_year=current_year))
        else:
            assessments = list(base_qs.all())

        if not assessments:
            return Response({"detail": "No assessments found to seed results for."})

        class_to_assessments: dict = {}
        for a in assessments:
            class_to_assessments.setdefault(a.subject.academic_class_id, []).append(a)

        students = list(
            Student.objects.filter(academic_class_id__in=class_to_assessments.keys())
        )

        existing = set(
            Result.objects.filter(student__in=students).values_list(
                "assessment_id", "student_id"
            )
        )

        records = []
        for student in students:
            for assessment in class_to_assessments.get(student.academic_class_id, []):
                if (assessment.pk, student.pk) in existing:
                    continue
                total = assessment.total_marks
                # Normally-distributed score: mean 72%, std 15%
                raw = random.gauss(0.72, 0.15)
                score = max(0, min(total, round(raw * total)))
                records.append(
                    Result(
                        student=student,
                        assessment=assessment,
                        score=score,
                        time_taken_minutes=random.randint(
                            5, max(5, assessment.duration_minutes or 60)
                        ),
                    )
                )

        created_count = 0
        for i in range(0, len(records), 500):
            objs = Result.objects.bulk_create(
                records[i : i + 500], ignore_conflicts=True
            )
            created_count += len(objs)

        return Response(
            {
                "status": "ok",
                "deleted": deleted,
                "created": created_count,
                "students": len(students),
                "assessments": len(assessments),
            }
        )


class YearAlignmentCheckView(APIView):
    """
    GET /api/academic/admin/actions/check-year-alignment/
    Reports whether seeded subjects, assessments and attendance records are
    aligned with the current academic year.  Returns counts per year so
    mismatches are immediately visible.
    Note: Chapter/Lesson don't carry their own academic_year — they inherit it
    via Subject, so only Subject/Assessment/Attendance are checked here.
    """

    permission_classes = [IsAuthenticated, IsAdminOrStaff]

    def get(self, request):
        from django.db.models import Count

        current_year = ensure_current_academic_year()
        current_year_id = current_year.pk if current_year else None

        def _year_counts(qs, year_field="academic_year"):
            rows = qs.values(year_field).annotate(count=Count("pk")).order_by("-count")
            return [
                {
                    "year_id": r[year_field],
                    "count": r["count"],
                    "is_current": r[year_field] == current_year_id,
                }
                for r in rows
            ]

        subjects_by_year = _year_counts(Subject.objects.all())
        assessments_by_year = _year_counts(Assessment.objects.all())

        # Attendance links to subject → derive year via subject
        att_by_year = (
            Attendance.objects.values("subject__academic_year")
            .annotate(count=Count("pk"))
            .order_by("-count")
        )
        attendance_by_year = [
            {
                "year_id": r["subject__academic_year"],
                "count": r["count"],
                "is_current": r["subject__academic_year"] == current_year_id,
            }
            for r in att_by_year
        ]

        # Results: derive year via assessment
        results_by_year = (
            Result.objects.values("assessment__academic_year")
            .annotate(count=Count("pk"))
            .order_by("-count")
        )
        results_by_year_list = [
            {
                "year_id": r["assessment__academic_year"],
                "count": r["count"],
                "is_current": r["assessment__academic_year"] == current_year_id,
            }
            for r in results_by_year
        ]

        def _aligned(rows):
            if not rows:
                return None  # no data
            return all(r["is_current"] for r in rows)

        return Response(
            {
                "current_year": {
                    "id": current_year_id,
                    "name": current_year.name if current_year else None,
                },
                "alignment": {
                    "subjects": _aligned(subjects_by_year),
                    "assessments": _aligned(assessments_by_year),
                    "attendance": _aligned(attendance_by_year),
                    "results": _aligned(results_by_year_list),
                },
                "counts_by_year": {
                    "subjects": subjects_by_year,
                    "assessments": assessments_by_year,
                    "attendance": attendance_by_year,
                    "results": results_by_year_list,
                },
            }
        )


class GenerateAIReportsView(APIView):
    """
    POST /api/academic/admin/actions/generate-ai-reports/
    Triggers AI progress report generation for all students in the current year.
    """

    permission_classes = [IsAuthenticated, IsAdminOrStaff]

    def post(self, request):
        try:
            from ai_engine.tasks import generate_ai_reports_task

            result = generate_ai_reports_task()
            return Response(
                {
                    "status": "ok",
                    "detail": str(result) if result else "Reports generated.",
                }
            )
        except Exception as e:
            # Fallback: call the management command logic directly
            try:
                from io import StringIO

                from django.core.management import call_command

                out = StringIO()
                call_command("generate_ai_reports", stdout=out, stderr=out)
                return Response({"status": "ok", "detail": out.getvalue()})
            except Exception as e2:
                return Response(
                    {"detail": f"Failed: {e2}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )


class SeedDemoDataView(APIView):
    """
    POST /api/academic/admin/actions/seed-demo-data/
    Seeds supplementary demo data: timetable, events, notices, student leaves, complaints.
    Safe to call multiple times (uses get_or_create / ignore_conflicts where possible).
    Body (optional): { "clear": false }
    """

    permission_classes = [IsAuthenticated, IsAdminOrStaff]

    def post(self, request):
        from datetime import time as dt_time

        from django.db import connection

        from academic.models import AcademicClass, Subject
        from academic.models.complaint import Complaint
        from academic.models.event import SchoolEvent
        from academic.models.notice import Notice
        from academic.models.student_leave import StudentLeave
        from academic.models.timetable import Timetable
        from core.models.tenant import Tenant

        tenant_schema = connection.schema_name
        tenant = None
        try:
            tenant = Tenant.objects.get(schema_name=tenant_schema)
        except Exception:
            pass

        counts = {}
        errors = {}
        today = date.today()

        # ── Timetable ────────────────────────────────────────────────────────
        try:
            classes = list(AcademicClass.objects.all()[:8])
            subjects = list(Subject.objects.all()[:20])
            current_year = ensure_current_academic_year()
            days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
            slots = [
                (dt_time(8, 0), dt_time(8, 45)),
                (dt_time(8, 50), dt_time(9, 35)),
                (dt_time(9, 40), dt_time(10, 25)),
                (dt_time(10, 40), dt_time(11, 25)),
                (dt_time(11, 30), dt_time(12, 15)),
                (dt_time(13, 0), dt_time(13, 45)),
            ]
            tt_created = 0
            if classes and subjects:
                for ci, cls in enumerate(classes):
                    for di, day in enumerate(days):
                        for si, (st, en) in enumerate(slots):
                            subj = subjects[(ci * 7 + di * 3 + si) % len(subjects)]
                            _, created = Timetable.objects.get_or_create(
                                academic_class=cls,
                                day_of_week=day,
                                start_time=st,
                                end_time=en,
                                defaults={
                                    "subject_name": subj.name,
                                    "academic_year": current_year,
                                    "status": "approved",
                                },
                            )
                            if created:
                                tt_created += 1
            counts["timetable"] = tt_created
        except Exception as e:
            errors["timetable"] = str(e)
            counts["timetable"] = 0

        # ── Events ───────────────────────────────────────────────────────────
        try:
            ev_created = 0
            if tenant:
                events_data = [
                    (
                        "Annual Sports Day",
                        "Grand annual sports and athletics event.",
                        "sports",
                        "all",
                        7,
                    ),
                    (
                        "Science Exhibition 2025",
                        "Student science project showcase.",
                        "academic",
                        "all",
                        14,
                    ),
                    (
                        "Parent-Teacher Meeting Q1",
                        "First quarter parent-teacher interaction.",
                        "ptm",
                        "parents",
                        21,
                    ),
                    (
                        "Cultural Programme",
                        "Annual cultural show and talent competition.",
                        "cultural",
                        "all",
                        35,
                    ),
                    (
                        "Independence Day Celebration",
                        "National flag hoisting ceremony.",
                        "holiday",
                        "all",
                        -5,
                    ),
                    (
                        "Math Olympiad",
                        "Inter-school mathematics competition.",
                        "academic",
                        "students",
                        42,
                    ),
                    (
                        "Library Reading Week",
                        "Week-long reading and literacy activities.",
                        "academic",
                        "students",
                        50,
                    ),
                    (
                        "Teachers Day Celebration",
                        "Celebrating our dedicated teachers.",
                        "cultural",
                        "all",
                        60,
                    ),
                    (
                        "Prize Distribution Ceremony",
                        "Annual prize distribution for achievers.",
                        "cultural",
                        "all",
                        65,
                    ),
                    (
                        "Open House",
                        "Parents visit classrooms and meet teachers.",
                        "ptm",
                        "parents",
                        10,
                    ),
                ]
                for title, desc, etype, audience, offset_days in events_data:
                    if not SchoolEvent.objects.filter(
                        tenant=tenant, title=title
                    ).exists():
                        start = today + timedelta(days=offset_days)
                        SchoolEvent.objects.create(
                            tenant=tenant,
                            title=title,
                            description=desc,
                            event_type=etype,
                            audience=audience,
                            start_date=start,
                            end_date=start + timedelta(days=1),
                            created_by=request.user,
                        )
                        ev_created += 1
            counts["events"] = ev_created
        except Exception as e:
            errors["events"] = str(e)
            counts["events"] = 0

        # ── Notices ──────────────────────────────────────────────────────────
        try:
            notices_data = [
                (
                    "Exam Schedule Released",
                    "Final exam schedule for Term 2 is now available.",
                    "Academic",
                    "high",
                ),
                (
                    "Annual Day Registration Open",
                    "Students can register for Annual Day performances.",
                    "Event",
                    "normal",
                ),
                (
                    "Fee Payment Reminder",
                    "Last date for fee payment is the 15th.",
                    "Finance",
                    "high",
                ),
                (
                    "Library Book Return Deadline",
                    "All library books must be returned by month end.",
                    "General",
                    "normal",
                ),
                (
                    "Sports Day Practice Schedule",
                    "Practice sessions begin Monday 4pm.",
                    "Sports",
                    "normal",
                ),
                (
                    "School Holiday Announcement",
                    "School closed on upcoming national holiday.",
                    "General",
                    "high",
                ),
                (
                    "Admissions Open 2025-26",
                    "Applications for new academic year now open.",
                    "Admission",
                    "normal",
                ),
                (
                    "Educational Trip Grade 7",
                    "Grade 7 trip to Science Museum next week.",
                    "Event",
                    "normal",
                ),
                (
                    "Parent Workshop on Learning",
                    "Child development workshop Saturday 10am.",
                    "General",
                    "normal",
                ),
                (
                    "Canteen Menu Update",
                    "Updated healthy menu effective from Monday.",
                    "General",
                    "low",
                ),
            ]
            not_created = 0
            for title, content, cat, priority in notices_data:
                if not Notice.objects.filter(title=title).exists():
                    Notice.objects.create(
                        title=title,
                        content=content,
                        category=cat,
                        priority=priority,
                        target_audience="school",
                        **({"tenant": tenant} if tenant else {}),
                    )
                    not_created += 1
            counts["notices"] = not_created
        except Exception as e:
            errors["notices"] = str(e)
            counts["notices"] = 0

        # ── Student Leaves ───────────────────────────────────────────────────
        try:
            students = list(Student.objects.select_related("user").all()[:40])
            leave_types = ["sick", "personal", "family", "other"]
            leave_reasons = {
                "sick": "Medical appointment / illness",
                "personal": "Personal work",
                "family": "Family function",
                "other": "Other reason",
            }
            leave_statuses = ["pending", "approved", "approved", "rejected"]
            lv_created = 0
            for idx, student in enumerate(students):
                lt = leave_types[idx % len(leave_types)]
                lv_start = today + timedelta(days=(idx % 20) - 10)
                lv_end = lv_start + timedelta(days=1)
                _, created = StudentLeave.objects.get_or_create(
                    student=student,
                    start_date=lv_start,
                    defaults={
                        "applied_by": student.user,
                        "leave_type": lt,
                        "end_date": lv_end,
                        "reason": leave_reasons[lt],
                        "status": leave_statuses[idx % len(leave_statuses)],
                    },
                )
                if created:
                    lv_created += 1
            counts["student_leaves"] = lv_created
        except Exception as e:
            errors["student_leaves"] = str(e)
            counts["student_leaves"] = 0

        # ── Complaints ───────────────────────────────────────────────────────
        try:
            complaints_data = [
                (
                    "academic",
                    "Exam Paper Ambiguity",
                    "Question 5 in the Math exam had two valid interpretations.",
                    "open",
                ),
                (
                    "facility",
                    "Broken Desks Room 103",
                    "Several desks in Room 103 are damaged and need repair.",
                    "under_review",
                ),
                (
                    "academic",
                    "Excessive Homework Load",
                    "The volume of weekly homework is too high.",
                    "open",
                ),
                (
                    "academic",
                    "Grading Discrepancy",
                    "Science assignment appears to be incorrectly marked.",
                    "resolved",
                ),
                (
                    "facility",
                    "Water Cooler Malfunction",
                    "Water cooler on 2nd floor not working for 3 days.",
                    "under_review",
                ),
                (
                    "transport",
                    "Bus Route 3 Delay",
                    "Route 3 bus is consistently 20 minutes late.",
                    "open",
                ),
                (
                    "facility",
                    "Projector Replacement Needed",
                    "Projector in Room 201 needs replacement.",
                    "resolved",
                ),
                (
                    "academic",
                    "Substitute Teacher Coverage",
                    "Substitute has not covered the full syllabus.",
                    "open",
                ),
            ]
            comp_created = 0
            for cat, title, desc, comp_status in complaints_data:
                _, created = Complaint.objects.get_or_create(
                    title=title,
                    defaults={
                        "tenant_schema": tenant_schema,
                        "submitted_by": request.user,
                        "category": cat,
                        "description": desc,
                        "status": comp_status,
                        "anonymous": False,
                    },
                )
                if created:
                    comp_created += 1
            counts["complaints"] = comp_created
        except Exception as e:
            errors["complaints"] = str(e)
            counts["complaints"] = 0

        return Response(
            {
                "status": "ok" if not errors else "partial",
                "created": counts,
                "total": sum(counts.values()),
                **({"errors": errors} if errors else {}),
            }
        )
