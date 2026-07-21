# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
School-wide analytics aggregation view.
Provides attendance trends, grade distributions, subject/class performance,
and assessment activity for the admin analytics dashboard.
"""

from datetime import date, timedelta

from django.db.models import Avg, Case, Count, F, FloatField, IntegerField, Q, Sum, When
from django.db.models.functions import TruncMonth
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import (
    AcademicClass,
    Assessment,
    Attendance,
    Result,
    Student,
    Subject,
    Teacher,
)


class SchoolAnalyticsDashboardView(APIView):
    """
    GET /api/academic/analytics/dashboard/
    Optional query params:
      days=30|60|90   - attendance window (default 30)
      class_id=<uuid> - filter by class
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = getattr(request.user, "tenant", None)
        days = int(request.query_params.get("days", 30))
        class_id = request.query_params.get("class_id")

        since = date.today() - timedelta(days=days)

        # ── Attendance trends ─────────────────────────────────────────────────
        att_qs = Attendance.objects.filter(date__gte=since)
        if tenant:
            att_qs = att_qs.filter(student__user__tenant=tenant)
        if class_id:
            att_qs = att_qs.filter(student__academic_class_id=class_id)

        daily_att = (
            att_qs.values("date")
            .annotate(
                present=Count("id", filter=Q(status="present")),
                absent=Count("id", filter=Q(status="absent")),
                late=Count("id", filter=Q(status="late")),
                total=Count("id"),
            )
            .order_by("date")
        )
        attendance_trend = [
            {
                "date": str(row["date"]),
                "present": row["present"],
                "absent": row["absent"],
                "late": row["late"],
                "total": row["total"],
                "rate": (
                    round(row["present"] / row["total"] * 100, 1) if row["total"] else 0
                ),
            }
            for row in daily_att
        ]

        # ── Overall attendance rate ───────────────────────────────────────────
        totals = att_qs.aggregate(
            present=Count("id", filter=Q(status="present")),
            total=Count("id"),
        )
        overall_attendance_rate = (
            round(totals["present"] / totals["total"] * 100, 1)
            if totals["total"]
            else 0
        )

        # ── Grade / score distribution (DB-level bucketing) ──────────────────
        result_qs = Result.objects.filter(is_published=True)
        if tenant:
            result_qs = result_qs.filter(student__user__tenant=tenant)
        if class_id:
            result_qs = result_qs.filter(student__academic_class_id=class_id)

        # Compute percentage in DB and bucket with Case/When — avoids Python loop.
        grade_counts = result_qs.filter(assessment__total_marks__gt=0).aggregate(
            grade_a=Count(
                Case(
                    When(score__gte=F("assessment__total_marks") * 0.90, then=1),
                    output_field=IntegerField(),
                )
            ),
            grade_b=Count(
                Case(
                    When(
                        score__gte=F("assessment__total_marks") * 0.75,
                        score__lt=F("assessment__total_marks") * 0.90,
                        then=1,
                    ),
                    output_field=IntegerField(),
                )
            ),
            grade_c=Count(
                Case(
                    When(
                        score__gte=F("assessment__total_marks") * 0.60,
                        score__lt=F("assessment__total_marks") * 0.75,
                        then=1,
                    ),
                    output_field=IntegerField(),
                )
            ),
            grade_d=Count(
                Case(
                    When(
                        score__gte=F("assessment__total_marks") * 0.40,
                        score__lt=F("assessment__total_marks") * 0.60,
                        then=1,
                    ),
                    output_field=IntegerField(),
                )
            ),
            grade_f=Count(
                Case(
                    When(score__lt=F("assessment__total_marks") * 0.40, then=1),
                    output_field=IntegerField(),
                )
            ),
        )
        grade_distribution = [
            {"grade": "A (90-100)", "count": grade_counts["grade_a"]},
            {"grade": "B (75-89)", "count": grade_counts["grade_b"]},
            {"grade": "C (60-74)", "count": grade_counts["grade_c"]},
            {"grade": "D (40-59)", "count": grade_counts["grade_d"]},
            {"grade": "F (<40)", "count": grade_counts["grade_f"]},
        ]

        # ── Pass / fail rate (single DB query) ───────────────────────────────
        pf = result_qs.filter(assessment__total_marks__gt=0).aggregate(
            total=Count("result_id"),
            passed=Count(
                Case(
                    When(score__gte=F("assessment__total_marks") * 0.40, then=1),
                    output_field=IntegerField(),
                )
            ),
        )
        total_results = pf["total"]
        pass_rate = round(pf["passed"] / total_results * 100, 1) if total_results else 0

        # ── Subject performance (avg score %) ────────────────────────────────
        subject_perf_qs = (
            result_qs.filter(assessment__subject__isnull=False)
            .values(subject_name=F("assessment__subject__name"))
            .annotate(
                avg_score=Avg("score"),
                avg_total=Avg("assessment__total_marks"),
                result_count=Count("result_id"),
            )
            .order_by("-avg_score")[:10]
        )
        subject_performance = [
            {
                "subject": row["subject_name"],
                "avg_pct": (
                    round((row["avg_score"] / row["avg_total"]) * 100, 1)
                    if row["avg_total"]
                    else 0
                ),
                "count": row["result_count"],
            }
            for row in subject_perf_qs
        ]

        # ── Class performance (avg score %) ──────────────────────────────────
        class_perf_qs = (
            result_qs.filter(student__academic_class__isnull=False)
            .values(class_name=F("student__academic_class__name"))
            .annotate(
                avg_score=Avg("score"),
                avg_total=Avg("assessment__total_marks"),
                student_count=Count("student_id", distinct=True),
            )
            .order_by("-avg_score")[:10]
        )
        class_performance = [
            {
                "class": row["class_name"],
                "avg_pct": (
                    round((row["avg_score"] / row["avg_total"]) * 100, 1)
                    if row["avg_total"]
                    else 0
                ),
                "students": row["student_count"],
            }
            for row in class_perf_qs
        ]

        # ── Assessment activity (assessments published per month) ─────────────
        assess_qs = Assessment.objects.filter(is_published=True)
        if tenant:
            # Filter by tenant through the subject → class chain
            assess_qs = assess_qs.filter(
                Q(subject__academic_class__students__user__tenant=tenant)
                | Q(section__students__user__tenant=tenant)
            ).distinct()
        monthly_assess = (
            assess_qs.annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("assessment_id"))
            .order_by("month")
        )
        assessment_activity = [
            {
                "month": row["month"].strftime("%Y-%m"),
                "label": row["month"].strftime("%b %Y"),
                "count": row["count"],
            }
            for row in monthly_assess
        ]

        # ── Top performing students ───────────────────────────────────────────
        top_students_qs = (
            result_qs.values(
                student_id=F("student__student_id"),
                student_name=F("student__user__first_name"),
            )
            .annotate(
                avg_score=Avg("score"),
                avg_total=Avg("assessment__total_marks"),
                result_count=Count("result_id"),
            )
            .filter(result_count__gte=2)
            .order_by("-avg_score")[:5]
        )
        top_students = [
            {
                "student_id": str(row["student_id"]),
                "name": row["student_name"] or "Student",
                "avg_pct": (
                    round((row["avg_score"] / row["avg_total"]) * 100, 1)
                    if row["avg_total"]
                    else 0
                ),
                "assessments": row["result_count"],
            }
            for row in top_students_qs
        ]

        # ── School totals snapshot (tenant-scoped) ────────────────────────────
        student_qs = Student.objects.all()
        teacher_qs = Teacher.objects.all()
        class_qs = AcademicClass.objects.all()
        subject_qs = Subject.objects.all()
        if tenant:
            student_qs = student_qs.filter(user__tenant=tenant)
            teacher_qs = teacher_qs.filter(user__tenant=tenant)
            class_qs = class_qs.filter(students__user__tenant=tenant).distinct()
            subject_qs = subject_qs.filter(
                academic_class__students__user__tenant=tenant
            ).distinct()

        return Response(
            {
                "snapshot": {
                    "students": student_qs.count(),
                    "teachers": teacher_qs.count(),
                    "classes": class_qs.count(),
                    "subjects": subject_qs.count(),
                    "overall_attendance_rate": overall_attendance_rate,
                    "pass_rate": pass_rate,
                    "total_results": total_results,
                },
                "attendance_trend": attendance_trend,
                "grade_distribution": grade_distribution,
                "subject_performance": subject_performance,
                "class_performance": class_performance,
                "assessment_activity": assessment_activity,
                "top_students": top_students,
            }
        )
