# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import (
    AcademicClass,
    AdmissionEnquiry,
    Assessment,
    Attendance,
    Student,
    Subject,
    Teacher,
)
from ..services.academic_year_service import ensure_current_academic_year


class SchoolERPOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def _tenant(self, request):
        user_tenant = getattr(request.user, "tenant", None)
        if user_tenant:
            return user_tenant
        return getattr(request, "tenant", None)

    def get(self, request):
        tenant = self._tenant(request)
        today = timezone.localdate()
        current_year = ensure_current_academic_year()

        students_qs = Student.objects.select_related("user")
        teachers_qs = Teacher.objects.select_related("user")
        classes_qs = AcademicClass.objects.all()
        subjects_qs = Subject.objects.select_related("academic_year")
        assessments_qs = Assessment.objects.select_related("academic_year")
        attendance_qs = Attendance.objects.select_related("student__user")
        admissions_qs = AdmissionEnquiry.objects.all()

        if tenant is not None:
            students_qs = students_qs.filter(user__tenant=tenant)
            teachers_qs = teachers_qs.filter(user__tenant=tenant)
            attendance_qs = attendance_qs.filter(student__user__tenant=tenant)
            admissions_qs = admissions_qs.filter(tenant=tenant)

        if current_year is not None:
            subjects_qs = subjects_qs.filter(academic_year=current_year)
            assessments_qs = assessments_qs.filter(academic_year=current_year)

        attendance_today = attendance_qs.filter(date=today)
        attendance_present = attendance_today.filter(status="present").count()
        attendance_absent = attendance_today.filter(status="absent").count()
        attendance_late = attendance_today.filter(status="late").count()

        upcoming_assessments = assessments_qs.filter(
            Q(scheduled_at__date__gte=today) | Q(due_date__date__gte=today)
        ).count()
        published_results = assessments_qs.filter(results_published=True).count()

        admissions_status_counts = {
            row["status"]: row["total"]
            for row in admissions_qs.values("status").annotate(
                total=Count("enquiry_id")
            )
        }

        finance_payload = {
            "total_revenue": 0.0,
            "total_pending": 0.0,
            "total_expenses": 0.0,
            "net_balance": 0.0,
        }
        try:
            from billing.models_school import Expense, Payment, StudentFee

            if tenant is not None:
                payments_qs = Payment.objects.filter(tenant=tenant)
                expenses_qs = Expense.objects.filter(tenant=tenant)
                pending_fees_qs = StudentFee.objects.filter(
                    tenant=tenant,
                    status__in=["pending", "partial", "overdue"],
                )
            else:
                payments_qs = Payment.objects.all()
                expenses_qs = Expense.objects.all()
                pending_fees_qs = StudentFee.objects.filter(
                    status__in=["pending", "partial", "overdue"]
                )

            total_revenue = payments_qs.aggregate(total=Sum("amount")).get("total") or 0
            total_expenses = (
                expenses_qs.aggregate(total=Sum("amount")).get("total") or 0
            )
            total_due = (
                pending_fees_qs.aggregate(total=Sum("amount_due")).get("total") or 0
            )
            total_paid = (
                pending_fees_qs.aggregate(total=Sum("amount_paid")).get("total") or 0
            )
            total_pending = max(total_due - total_paid, 0)

            finance_payload = {
                "total_revenue": float(total_revenue),
                "total_pending": float(total_pending),
                "total_expenses": float(total_expenses),
                "net_balance": float(total_revenue - total_expenses),
            }
        except Exception:
            pass

        return Response(
            {
                "academic_year": current_year.name if current_year else None,
                "school": {
                    "tenant_id": str(tenant.pk) if tenant else None,
                    "tenant_name": tenant.name if tenant else None,
                },
                "summary": {
                    "total_students": students_qs.count(),
                    "total_teachers": teachers_qs.count(),
                    "total_classes": classes_qs.count(),
                    "total_subjects": subjects_qs.count(),
                    "upcoming_assessments": upcoming_assessments,
                    "published_results": published_results,
                },
                "attendance_today": {
                    "date": str(today),
                    "total_marked": attendance_today.count(),
                    "present": attendance_present,
                    "absent": attendance_absent,
                    "late": attendance_late,
                },
                "admissions": {
                    "total_enquiries": admissions_qs.count(),
                    "new": int(admissions_status_counts.get("new", 0)),
                    "contacted": int(admissions_status_counts.get("contacted", 0)),
                    "interested": int(admissions_status_counts.get("interested", 0)),
                    "application_started": int(
                        admissions_status_counts.get("application_started", 0)
                    ),
                    "converted": int(admissions_status_counts.get("converted", 0)),
                    "closed": int(admissions_status_counts.get("closed", 0)),
                },
                "finance": finance_payload,
            }
        )
