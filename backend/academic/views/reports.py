# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from academic.models.assessment import Result
from academic.models.class_section import Section
from academic.models.exam import Exam, ExamSeating
from academic.models.parent import Parent
from academic.models.student import Student
from academic.models.teacher import Teacher
from core.reports import generate_excel_response, generate_pdf_response
from core.utils.audit import record_audit_event
from core.utils.cache_keys import tenant_cache_key


def _student_last_name_for_filename(student: Student) -> str:
    user = getattr(student, "user", None)
    last_name = (getattr(user, "last_name", "") or "").strip()
    if last_name:
        return last_name.replace(" ", "_")
    username = (getattr(user, "username", "") or "").strip()
    if username:
        return username.replace(" ", "_")
    return "student"


def _role(user) -> str:
    return (getattr(user, "role", "") or "").lower()


def _is_admin_manager(user) -> bool:
    return _role(user) in {"admin", "staff", "saas_admin", "management", "school_admin"}


def _teacher_profile(user):
    return (
        Teacher.objects.prefetch_related("assigned_classes").filter(user=user).first()
    )


def _teacher_can_access_student(user, student: Student) -> bool:
    teacher = _teacher_profile(user)
    if not teacher:
        return False

    if (
        student.academic_class_id
        and teacher.assigned_classes.filter(id=student.academic_class_id).exists()
    ):
        return True

    return (
        Result.objects.filter(student=student)
        .filter(
            Q(assessment__subject__teacher=teacher)
            | Q(assessment__subject__additional_teachers=teacher)
        )
        .exists()
    )


def _teacher_can_access_section(user, section: Section) -> bool:
    teacher = _teacher_profile(user)
    if not teacher:
        return False
    return bool(
        section.academic_class_id
        and teacher.assigned_classes.filter(id=section.academic_class_id).exists()
    )


def _teacher_can_access_exam(user, exam: Exam) -> bool:
    teacher = _teacher_profile(user)
    if not teacher:
        return False
    subject = getattr(getattr(exam, "assessment", None), "subject", None)
    if not subject:
        return False
    if teacher.teacher_id == getattr(subject, "teacher_id", None):
        return True
    if subject.additional_teachers.filter(teacher_id=teacher.teacher_id).exists():
        return True
    class_id = getattr(subject, "academic_class_id", None)
    return bool(class_id and teacher.assigned_classes.filter(id=class_id).exists())


class ReportViewSet(viewsets.ViewSet):
    """
    ViewSet for generating various reports.
    """

    permission_classes = [IsAuthenticated]

    def _school_name(self, request):
        tenant = getattr(request, "tenant", None) or getattr(
            getattr(request, "user", None), "tenant", None
        )
        return getattr(tenant, "name", None) or "Our School"

    def _ensure_student_access(self, request, student: Student) -> None:
        user = request.user
        role = _role(user)

        if _is_admin_manager(user):
            return
        if role == "teacher" and _teacher_can_access_student(user, student):
            return
        if role == "student" and getattr(student, "user_id", None) == getattr(
            user, "user_id", None
        ):
            return
        if role == "parent":
            parent = (
                Parent.objects.prefetch_related("students").filter(user=user).first()
            )
            if (
                parent
                and parent.students.filter(student_id=student.student_id).exists()
            ):
                return
        raise PermissionDenied(
            "You do not have permission to access this student's report."
        )

    def _ensure_section_summary_access(self, request, section: Section) -> None:
        user = request.user
        if _is_admin_manager(user):
            return
        if _role(user) == "teacher" and _teacher_can_access_section(user, section):
            return
        raise PermissionDenied(
            "You do not have permission to access this section summary."
        )

    def _ensure_seating_access(self, request, seating: ExamSeating) -> None:
        user = request.user
        role = _role(user)

        if _is_admin_manager(user):
            return
        if role == "teacher" and _teacher_can_access_exam(user, seating.exam):
            return
        if role == "student" and getattr(seating.student, "user_id", None) == getattr(
            user, "user_id", None
        ):
            return
        if role == "parent":
            parent = (
                Parent.objects.prefetch_related("students").filter(user=user).first()
            )
            if (
                parent
                and parent.students.filter(student_id=seating.student_id).exists()
            ):
                return
        raise PermissionDenied("You do not have permission to access this hall ticket.")

    def _ensure_exam_bulk_access(self, request, exam: Exam) -> None:
        user = request.user
        if _is_admin_manager(user):
            return
        if _role(user) == "teacher" and _teacher_can_access_exam(user, exam):
            return
        raise PermissionDenied(
            "You do not have permission to export hall tickets for this exam."
        )

    def _log_export(
        self, request, *, report_type: str, fmt: str, details: dict | None = None
    ):
        record_audit_event(
            action="academic.report_exported",
            user=getattr(request, "user", None),
            request=request,
            details={
                "report_type": report_type,
                "format": fmt,
                **(details or {}),
            },
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="student-performance/(?P<student_id>[^/.]+)",
    )
    def student_performance_pdf(self, request, student_id=None):
        import logging
        import traceback

        log = logging.getLogger(__name__)
        try:
            return self._student_performance_pdf_inner(request, student_id)
        except PermissionDenied:
            raise
        except Exception as exc:
            log.exception(
                "student_performance_pdf failed for student_id=%s", student_id
            )
            return Response(
                {
                    "error": "Failed to generate report",
                    "detail": str(exc),
                    "trace": traceback.format_exc().splitlines()[-6:],
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _student_performance_pdf_inner(self, request, student_id=None):
        using_db = getattr(request, "db_alias", "default")
        student = get_object_or_404(
            Student.objects.using(using_db).select_related("user"), pk=student_id
        )
        self._ensure_student_access(request, student)

        # Re-fetch raw results for the per-row table.
        results_data = []
        results = (
            Result.objects.using(using_db)
            .filter(student=student)
            .select_related("assessment", "assessment__subject")
            .order_by("-submitted_at")
        )
        for r in results:
            assessment = getattr(r, "assessment", None)
            if assessment is None:
                continue
            subject = getattr(assessment, "subject", None)
            subject_name = getattr(subject, "name", "—") if subject else "—"

            try:
                score = float(r.score or 0)
            except (TypeError, ValueError):
                score = 0.0
            try:
                total_marks = float(assessment.total_marks or 0)
            except (TypeError, ValueError):
                total_marks = 0.0
            percentage = (
                round((score / total_marks) * 100, 1) if total_marks > 0 else 0.0
            )

            try:
                type_display = assessment.get_type_display()
            except Exception:
                type_display = getattr(assessment, "type", "") or "—"

            results_data.append(
                {
                    "subject": subject_name,
                    "assessment": getattr(assessment, "title", "") or "—",
                    "type": type_display,
                    "score": score,
                    "total_marks": total_marks,
                    "percentage": percentage,
                    "submitted_at": r.submitted_at,
                }
            )

        avg_percentage = (
            round(
                sum(item["percentage"] for item in results_data) / len(results_data), 1
            )
            if results_data
            else 0
        )
        report_data = {
            "results_data": results_data,
            "metrics": {
                "total_assessments": len(results_data),
                "average_percentage": avg_percentage,
            },
            "ai_report": {
                "summary": "Performance insights are generated from recent assessment attempts.",
                "strengths": [],
                "weaknesses": [],
                "recommendations": [],
            },
        }

        context = {
            "student": student,
            "report": report_data,
            "results_data": results_data,  # Added this explicitly for the table loop
            "metrics": report_data.get("metrics", {}),
            "ai_report": report_data.get("ai_report", {}),
            "school_name": self._school_name(request),
            "date": timezone.now().strftime("%B %d, %Y"),
        }

        filename = f"performance_report_{_student_last_name_for_filename(student)}_{student_id[:8]}.pdf"
        response = generate_pdf_response(
            "reports/student_performance.html", context, filename
        )

        if response:
            self._log_export(
                request,
                report_type="student_performance",
                fmt="pdf",
                details={
                    "student_id": str(student.student_id),
                    "rows": len(results_data),
                },
            )
            return response
        return Response(
            {"error": "Failed to generate report"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="student-performance-excel/(?P<student_id>[^/.]+)",
    )
    def student_performance_excel(self, request, student_id=None):
        using_db = getattr(request, "db_alias", "default")
        student = get_object_or_404(
            Student.objects.using(using_db).select_related("user"), pk=student_id
        )
        self._ensure_student_access(request, student)
        results = (
            Result.objects.using(using_db)
            .filter(student=student)
            .select_related("assessment", "assessment__subject")
        )

        data = []
        for r in results:
            assessment = getattr(r, "assessment", None)
            if assessment is None:
                continue
            subject = getattr(assessment, "subject", None)
            try:
                score = float(r.score or 0)
            except (TypeError, ValueError):
                score = 0.0
            try:
                total_marks = float(assessment.total_marks or 0)
            except (TypeError, ValueError):
                total_marks = 0.0
            percentage = (
                round((score / total_marks) * 100, 2) if total_marks > 0 else 0.0
            )
            try:
                type_display = assessment.get_type_display()
            except Exception:
                type_display = getattr(assessment, "type", "") or "—"
            data.append(
                {
                    "Subject": getattr(subject, "name", "—") if subject else "—",
                    "Assessment": getattr(assessment, "title", "") or "—",
                    "Type": type_display,
                    "Score": score,
                    "Total Marks": total_marks,
                    "Percentage": percentage,
                    "Date": (
                        r.submitted_at.strftime("%Y-%m-%d") if r.submitted_at else ""
                    ),
                }
            )

        columns = [
            "Subject",
            "Assessment",
            "Type",
            "Score",
            "Total Marks",
            "Percentage",
            "Date",
        ]
        filename = f"performance_report_{_student_last_name_for_filename(student)}_{student_id[:8]}.xlsx"
        self._log_export(
            request,
            report_type="student_performance",
            fmt="xlsx",
            details={"student_id": str(student.student_id), "rows": len(data)},
        )
        return generate_excel_response(data, columns, filename)

    @action(
        detail=False,
        methods=["get"],
        url_path="attendance-summary/(?P<section_id>[^/.]+)",
    )
    def attendance_summary_pdf(self, request, section_id=None):
        using_db = getattr(request, "db_alias", "default")
        section = get_object_or_404(
            Section.objects.using(using_db).select_related("academic_class"),
            id=section_id,
        )
        self._ensure_section_summary_access(request, section)

        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date") or timezone.now().strftime(
            "%Y-%m-%d"
        )

        from django.core.cache import cache

        cache_key = tenant_cache_key(
            "attendance_summary_data",
            section_id,
            start_date,
            end_date,
            using_db,
            request=request,
        )
        data = cache.get(cache_key)

        if not data:
            # Optimize: Single query with filtered aggregations for all students in the section
            attendance_stats = (
                Student.objects.using(using_db)
                .filter(section=section)
                .select_related("user")
                .annotate(
                    present_count=Count(
                        "attendance_records",
                        filter=Q(
                            attendance_records__status="present",
                            **(
                                {"attendance_records__date__gte": start_date}
                                if start_date
                                else {}
                            ),
                            **(
                                {"attendance_records__date__lte": end_date}
                                if end_date
                                else {}
                            ),
                        ),
                    ),
                    absent_count=Count(
                        "attendance_records",
                        filter=Q(
                            attendance_records__status="absent",
                            **(
                                {"attendance_records__date__gte": start_date}
                                if start_date
                                else {}
                            ),
                            **(
                                {"attendance_records__date__lte": end_date}
                                if end_date
                                else {}
                            ),
                        ),
                    ),
                    late_count=Count(
                        "attendance_records",
                        filter=Q(
                            attendance_records__status="late",
                            **(
                                {"attendance_records__date__gte": start_date}
                                if start_date
                                else {}
                            ),
                            **(
                                {"attendance_records__date__lte": end_date}
                                if end_date
                                else {}
                            ),
                        ),
                    ),
                    excused_count=Count(
                        "attendance_records",
                        filter=Q(
                            attendance_records__status="excused",
                            **(
                                {"attendance_records__date__gte": start_date}
                                if start_date
                                else {}
                            ),
                            **(
                                {"attendance_records__date__lte": end_date}
                                if end_date
                                else {}
                            ),
                        ),
                    ),
                    total_records=Count(
                        "attendance_records",
                        filter=Q(
                            **(
                                {"attendance_records__date__gte": start_date}
                                if start_date
                                else {}
                            ),
                            **(
                                {"attendance_records__date__lte": end_date}
                                if end_date
                                else {}
                            ),
                        ),
                    ),
                )
            )

            data = []
            for student_stat in attendance_stats:
                total = student_stat.total_records or 1
                percentage = round((student_stat.present_count / total) * 100, 1)

                data.append(
                    {
                        "name": f"{student_stat.user.first_name} {student_stat.user.last_name}",
                        "present": student_stat.present_count,
                        "absent": student_stat.absent_count,
                        "late": student_stat.late_count,
                        "excused": student_stat.excused_count,
                        "percentage": percentage,
                    }
                )
            cache.set(cache_key, data, 600)  # Cache for 10 minutes

        context = {
            "class_name": f"{section.academic_class.name} - {section.name}",
            "attendance_data": data,
            "school_name": self._school_name(request),
            "date": timezone.now().strftime("%B %d, %Y"),
            "start_date": start_date or "Initial Session",
            "end_date": end_date,
        }

        filename = f"attendance_summary_{section.name}.pdf"
        response = generate_pdf_response(
            "reports/attendance_summary.html", context, filename
        )

        if response:
            self._log_export(
                request,
                report_type="attendance_summary",
                fmt="pdf",
                details={"section_id": str(section.id), "rows": len(data)},
            )
            return response
        return Response(
            {"error": "Failed to generate report"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="attendance-summary-excel/(?P<section_id>[^/.]+)",
    )
    def attendance_summary_excel(self, request, section_id=None):
        using_db = getattr(request, "db_alias", "default")
        section = get_object_or_404(
            Section.objects.using(using_db).select_related("academic_class"),
            id=section_id,
        )
        self._ensure_section_summary_access(request, section)

        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date") or timezone.now().strftime(
            "%Y-%m-%d"
        )

        from django.core.cache import cache

        cache_key = tenant_cache_key(
            "attendance_summary_data",
            section_id,
            start_date,
            end_date,
            using_db,
            request=request,
        )
        rows = cache.get(cache_key)

        if not rows:
            # Optimize: Reuse the same efficient aggregation logic or shared cache
            attendance_stats = (
                Student.objects.using(using_db)
                .filter(section=section)
                .select_related("user")
                .annotate(
                    present_count=Count(
                        "attendance_records",
                        filter=Q(
                            attendance_records__status="present",
                            **(
                                {"attendance_records__date__gte": start_date}
                                if start_date
                                else {}
                            ),
                            **(
                                {"attendance_records__date__lte": end_date}
                                if end_date
                                else {}
                            ),
                        ),
                    ),
                    absent_count=Count(
                        "attendance_records",
                        filter=Q(
                            attendance_records__status="absent",
                            **(
                                {"attendance_records__date__gte": start_date}
                                if start_date
                                else {}
                            ),
                            **(
                                {"attendance_records__date__lte": end_date}
                                if end_date
                                else {}
                            ),
                        ),
                    ),
                    late_count=Count(
                        "attendance_records",
                        filter=Q(
                            attendance_records__status="late",
                            **(
                                {"attendance_records__date__gte": start_date}
                                if start_date
                                else {}
                            ),
                            **(
                                {"attendance_records__date__lte": end_date}
                                if end_date
                                else {}
                            ),
                        ),
                    ),
                    excused_count=Count(
                        "attendance_records",
                        filter=Q(
                            attendance_records__status="excused",
                            **(
                                {"attendance_records__date__gte": start_date}
                                if start_date
                                else {}
                            ),
                            **(
                                {"attendance_records__date__lte": end_date}
                                if end_date
                                else {}
                            ),
                        ),
                    ),
                    total_records=Count(
                        "attendance_records",
                        filter=Q(
                            **(
                                {"attendance_records__date__gte": start_date}
                                if start_date
                                else {}
                            ),
                            **(
                                {"attendance_records__date__lte": end_date}
                                if end_date
                                else {}
                            ),
                        ),
                    ),
                )
            )

            rows = []
            for student_stat in attendance_stats:
                total = student_stat.total_records or 1
                rows.append(
                    {
                        "Student Name": f"{student_stat.user.first_name} {student_stat.user.last_name}",
                        "Present": student_stat.present_count,
                        "Absent": student_stat.absent_count,
                        "Late": student_stat.late_count,
                        "Excused": student_stat.excused_count,
                        "Attendance %": round(
                            (student_stat.present_count / total) * 100, 2
                        ),
                    }
                )
            cache.set(
                cache_key, rows, 600
            )  # Reuse data from PDF or cache if not exists

        columns = [
            "Student Name",
            "Present",
            "Absent",
            "Late",
            "Excused",
            "Attendance %",
        ]
        filename = f"attendance_summary_{section.name}.xlsx"
        self._log_export(
            request,
            report_type="attendance_summary",
            fmt="xlsx",
            details={"section_id": str(section.id), "rows": len(rows)},
        )
        return generate_excel_response(rows, columns, filename)

    @action(
        detail=False,
        methods=["get"],
        url_path="result-card/(?P<student_id>[^/.]+)/(?P<result_id>[^/.]+)",
    )
    def result_card_pdf(self, request, student_id=None, result_id=None):
        using_db = getattr(request, "db_alias", "default")
        student = get_object_or_404(
            Student.objects.using(using_db).select_related(
                "section", "section__academic_class", "user"
            ),
            pk=student_id,
        )
        self._ensure_student_access(request, student)
        result = get_object_or_404(
            Result.objects.using(using_db).select_related(
                "assessment", "assessment__subject"
            ),
            pk=result_id,
            student=student,
        )

        try:
            score_val = float(result.score or 0)
            total_marks_val = float(getattr(result.assessment, "total_marks", 0) or 0)
        except (TypeError, ValueError):
            score_val, total_marks_val = 0.0, 0.0
        percentage = (
            round((score_val / total_marks_val) * 100, 1)
            if total_marks_val > 0
            else 0.0
        )

        context = {
            "student": student,
            "result": result,
            "assessment": result.assessment,
            "subject": getattr(result.assessment, "subject", None),
            "percentage": percentage,
            "school_name": self._school_name(request),
            "date": timezone.now().strftime("%B %d, %Y"),
        }

        filename = f"result_card_{_student_last_name_for_filename(student)}_{result.assessment.title.replace(' ', '_')}.pdf"
        response = generate_pdf_response("reports/result_card.html", context, filename)

        if response:
            self._log_export(
                request,
                report_type="result_card",
                fmt="pdf",
                details={
                    "student_id": str(student.student_id),
                    "result_id": str(result.result_id),
                    "assessment_id": str(result.assessment_id),
                },
            )
            return response
        return Response(
            {"error": "Failed to generate result card"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(
        detail=False, methods=["get"], url_path="hall-ticket/(?P<seating_id>[^/.]+)"
    )
    def hall_ticket_pdf(self, request, seating_id=None):
        """Generate individual hall ticket PDF for a student"""
        using_db = getattr(request, "db_alias", "default")
        # Avoid cross-DB joins - fetch without select_related on user
        seating = get_object_or_404(
            ExamSeating.objects.using(using_db), seating_id=seating_id
        )
        self._ensure_seating_access(request, seating)

        # Access related objects individually (they'll use the router)
        context = {
            "hall_ticket_number": seating.hall_ticket_number,
            "student_name": f"{seating.student.user.first_name} {seating.student.user.last_name}",
            "student_id": str(seating.student.student_id)[:8],
            "class_section": f"{seating.student.section.academic_class.name} - {seating.student.section.name}",
            "seat_number": seating.seat_number,
            "exam_title": seating.exam.assessment.title,
            "subject_name": seating.exam.assessment.subject.name,
            "exam_date": (
                seating.exam.created_at.strftime("%B %d, %Y")
                if seating.exam.created_at
                else "To Be Announced"
            ),
            "exam_center": seating.exam.exam_center or "Main Examination Hall",
            "room_number": seating.room_number,
            "school_name": self._school_name(request),
            "generation_date": timezone.now().strftime("%B %d, %Y at %I:%M %p"),
        }

        filename = f"hall_ticket_{seating.hall_ticket_number}.pdf"
        response = generate_pdf_response("reports/hall_ticket.html", context, filename)

        if response:
            self._log_export(
                request,
                report_type="hall_ticket",
                fmt="pdf",
                details={
                    "seating_id": str(seating.seating_id),
                    "exam_id": str(seating.exam_id),
                },
            )
            return response
        return Response(
            {"error": "Failed to generate hall ticket"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(
        detail=False, methods=["get"], url_path="bulk-hall-tickets/(?P<exam_id>[^/.]+)"
    )
    def bulk_hall_tickets_pdf(self, request, exam_id=None):
        """Generate hall tickets for all students in an exam (ZIP file)"""
        import io
        import zipfile

        from academic.models.exam import Exam, ExamSeating

        using_db = getattr(request, "db_alias", "default")
        exam = get_object_or_404(Exam.objects.using(using_db), exam_id=exam_id)
        self._ensure_exam_bulk_access(request, exam)
        # Avoid cross-DB joins
        seatings = ExamSeating.objects.using(using_db).filter(exam=exam)

        if not seatings.exists():
            return Response(
                {"error": "No seating allocations found for this exam"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create ZIP file in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for seating in seatings:
                # Access related objects individually
                context = {
                    "hall_ticket_number": seating.hall_ticket_number,
                    "student_name": f"{seating.student.user.first_name} {seating.student.user.last_name}",
                    "student_id": str(seating.student.student_id)[:8],
                    "class_section": f"{seating.student.section.academic_class.name} - {seating.student.section.name}",
                    "seat_number": seating.seat_number,
                    "exam_title": exam.assessment.title,
                    "subject_name": exam.assessment.subject.name,
                    "exam_date": (
                        exam.created_at.strftime("%B %d, %Y")
                        if exam.created_at
                        else "To Be Announced"
                    ),
                    "exam_center": exam.exam_center or "Main Examination Hall",
                    "room_number": seating.room_number,
                    "school_name": self._school_name(request),
                    "generation_date": timezone.now().strftime("%B %d, %Y at %I:%M %p"),
                }

                # Generate PDF for this student
                from django.template.loader import render_to_string
                from xhtml2pdf import pisa

                html = render_to_string("reports/hall_ticket.html", context)
                pdf_buffer = io.BytesIO()
                pisa.pisaDocument(io.BytesIO(html.encode("UTF-8")), pdf_buffer)

                # Add to ZIP
                pdf_filename = (
                    f"{seating.hall_ticket_number}_{seating.student.user.last_name}.pdf"
                )
                zip_file.writestr(pdf_filename, pdf_buffer.getvalue())

        # Return ZIP file
        response = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        response["Content-Disposition"] = (
            f'attachment; filename="hall_tickets_{exam.assessment.title.replace(" ", "_")}.zip"'
        )
        self._log_export(
            request,
            report_type="bulk_hall_tickets",
            fmt="zip",
            details={"exam_id": str(exam.exam_id), "rows": seatings.count()},
        )
        return response
