# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from django.utils.timezone import localtime
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from billing.shared_views import BillingSchemaGuardMixin
from core.mixins import TenantScopedQuerysetMixin
from core.utils.audit import record_audit_event

from .models import (
    Department,
    Employee,
    LeaveApplication,
    LeaveType,
    PayrollPeriod,
    SalarySlip,
    StaffAttendance,
)
from .permissions import IsHRManager, IsHRManagerOrReadOnly, IsOwnLeaveOrHRManager
from .serializers import (
    DepartmentSerializer,
    EmployeeListSerializer,
    EmployeeSerializer,
    LeaveApplicationSerializer,
    LeaveTypeSerializer,
    PayrollPeriodSerializer,
    SalarySlipSerializer,
    StaffAttendanceSerializer,
)


class _HRBase(
    BillingSchemaGuardMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet
):
    require_tenant_schema = True
    allow_unscoped_for_saas = False

    def _tenant(self):
        return getattr(self.request.user, "tenant", None)


class DepartmentViewSet(_HRBase):
    queryset = Department.objects.select_related("head__user").all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsHRManager]

    def perform_create(self, serializer):
        dept = serializer.save(tenant=self._tenant())
        record_audit_event(
            action="hr.department_created",
            user=self.request.user,
            request=self.request,
            details={"dept_id": str(dept.dept_id), "name": dept.name},
        )

    def perform_update(self, serializer):
        dept = serializer.save()
        record_audit_event(
            action="hr.department_updated",
            user=self.request.user,
            request=self.request,
            details={"dept_id": str(dept.dept_id), "name": dept.name},
        )

    def perform_destroy(self, instance):
        record_audit_event(
            action="hr.department_deleted",
            user=self.request.user,
            request=self.request,
            details={"dept_id": str(instance.dept_id), "name": instance.name},
        )
        instance.delete()


class EmployeeViewSet(_HRBase):
    queryset = Employee.objects.select_related("user", "department").all()
    permission_classes = [IsHRManager]

    def get_serializer_class(self):
        if self.action == "list":
            return EmployeeListSerializer
        return EmployeeSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Optional filters
        department = self.request.query_params.get("department")
        contract_type = self.request.query_params.get("contract_type")
        is_active = self.request.query_params.get("is_active")
        if department:
            qs = qs.filter(department__dept_id=department)
        if contract_type:
            qs = qs.filter(contract_type=contract_type)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        return qs

    def perform_create(self, serializer):
        emp = serializer.save(tenant=self._tenant())
        record_audit_event(
            action="hr.employee_created",
            user=self.request.user,
            request=self.request,
            details={
                "employee_id": str(emp.employee_id),
                "name": emp.full_name,
                "designation": emp.designation,
            },
        )

    def perform_update(self, serializer):
        emp = serializer.save()
        record_audit_event(
            action="hr.employee_updated",
            user=self.request.user,
            request=self.request,
            details={"employee_id": str(emp.employee_id), "name": emp.full_name},
        )

    def perform_destroy(self, instance):
        record_audit_event(
            action="hr.employee_deleted",
            user=self.request.user,
            request=self.request,
            details={
                "employee_id": str(instance.employee_id),
                "name": instance.full_name,
            },
        )
        instance.delete()

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        emp = self.get_object()
        emp.is_active = False
        emp.save(update_fields=["is_active"])
        record_audit_event(
            action="hr.employee_deactivated",
            user=request.user,
            request=request,
            details={"employee_id": str(emp.employee_id)},
        )
        return Response({"message": "Employee deactivated."})

    @action(detail=True, methods=["post"], url_path="reactivate")
    def reactivate(self, request, pk=None):
        emp = self.get_object()
        emp.is_active = True
        emp.save(update_fields=["is_active"])
        record_audit_event(
            action="hr.employee_reactivated",
            user=request.user,
            request=request,
            details={"employee_id": str(emp.employee_id)},
        )
        return Response({"message": "Employee reactivated."})


class LeaveTypeViewSet(_HRBase):
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsHRManager]

    def perform_create(self, serializer):
        lt = serializer.save(tenant=self._tenant())
        record_audit_event(
            action="hr.leave_type_created",
            user=self.request.user,
            request=self.request,
            details={
                "leave_type_id": str(lt.leave_type_id),
                "name": lt.name,
                "code": lt.code,
            },
        )

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()


class LeaveApplicationViewSet(_HRBase):
    queryset = LeaveApplication.objects.select_related(
        "employee__user", "leave_type", "reviewed_by"
    ).all()
    serializer_class = LeaveApplicationSerializer
    permission_classes = [IsOwnLeaveOrHRManager]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        from .permissions import _role

        if _role(user) not in {"admin", "staff"}:
            # Employees only see their own leaves
            employee = getattr(user, "employee_profile", None)
            if employee:
                qs = qs.filter(employee=employee)
            else:
                return qs.none()

        # Filters
        status_filter = self.request.query_params.get("status")
        employee_id = self.request.query_params.get("employee")
        if status_filter:
            qs = qs.filter(status=status_filter)
        if employee_id:
            qs = qs.filter(employee__employee_id=employee_id)
        return qs

    def perform_create(self, serializer):
        leave = serializer.save(tenant=self._tenant())
        record_audit_event(
            action="hr.leave_applied",
            user=self.request.user,
            request=self.request,
            details={
                "leave_id": str(leave.leave_id),
                "employee": leave.employee.full_name,
                "leave_type": leave.leave_type.code,
                "start_date": str(leave.start_date),
                "end_date": str(leave.end_date),
            },
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="approve",
        permission_classes=[IsHRManager],
    )
    def approve(self, request, pk=None):
        leave = self.get_object()
        if leave.status != LeaveApplication.STATUS_PENDING:
            return Response(
                {"detail": "Only pending applications can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        remarks = request.data.get("remarks", "")
        with transaction.atomic():
            leave.status = LeaveApplication.STATUS_APPROVED
            leave.reviewed_by = request.user
            leave.reviewed_at = timezone.now()
            leave.review_remarks = remarks
            leave.save(
                update_fields=["status", "reviewed_by", "reviewed_at", "review_remarks"]
            )
        record_audit_event(
            action="hr.leave_approved",
            user=request.user,
            request=request,
            details={
                "leave_id": str(leave.leave_id),
                "employee": leave.employee.full_name,
            },
        )
        return Response(LeaveApplicationSerializer(leave).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="reject",
        permission_classes=[IsHRManager],
    )
    def reject(self, request, pk=None):
        leave = self.get_object()
        if leave.status != LeaveApplication.STATUS_PENDING:
            return Response(
                {"detail": "Only pending applications can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        remarks = request.data.get("remarks", "")
        if not remarks:
            return Response(
                {"detail": "Remarks are required when rejecting a leave."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            leave.status = LeaveApplication.STATUS_REJECTED
            leave.reviewed_by = request.user
            leave.reviewed_at = timezone.now()
            leave.review_remarks = remarks
            leave.save(
                update_fields=["status", "reviewed_by", "reviewed_at", "review_remarks"]
            )
        record_audit_event(
            action="hr.leave_rejected",
            user=request.user,
            request=request,
            details={"leave_id": str(leave.leave_id), "remarks": remarks},
        )
        return Response(LeaveApplicationSerializer(leave).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        leave = self.get_object()
        if leave.status not in {
            LeaveApplication.STATUS_PENDING,
            LeaveApplication.STATUS_APPROVED,
        }:
            return Response(
                {"detail": "This application cannot be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        leave.status = LeaveApplication.STATUS_CANCELLED
        leave.save(update_fields=["status"])
        return Response(LeaveApplicationSerializer(leave).data)


class StaffAttendanceViewSet(_HRBase):
    queryset = StaffAttendance.objects.select_related(
        "employee__user", "marked_by"
    ).all()
    serializer_class = StaffAttendanceSerializer
    permission_classes = [IsHRManager]

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get("date")
        employee_id = self.request.query_params.get("employee")
        month = self.request.query_params.get("month")
        year = self.request.query_params.get("year")
        if date:
            qs = qs.filter(date=date)
        if employee_id:
            qs = qs.filter(employee__employee_id=employee_id)
        if month and year:
            qs = qs.filter(date__month=month, date__year=year)
        return qs

    def perform_create(self, serializer):
        record = serializer.save(tenant=self._tenant(), marked_by=self.request.user)
        record_audit_event(
            action="hr.attendance_marked",
            user=self.request.user,
            request=self.request,
            details={
                "employee": record.employee.full_name,
                "date": str(record.date),
                "status": record.status,
            },
        )

    @action(detail=False, methods=["post"], url_path="bulk-mark")
    def bulk_mark(self, request):
        """Mark attendance for multiple employees on a given date."""
        records_data = request.data.get("records", [])
        date = request.data.get("date")
        if not date or not records_data:
            return Response(
                {"detail": "date and records are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        tenant = self._tenant()
        created, updated = 0, 0
        with transaction.atomic():
            for item in records_data:
                emp_id = item.get("employee_id")
                att_status = item.get("status", StaffAttendance.STATUS_PRESENT)
                try:
                    emp = Employee.objects.get(employee_id=emp_id, tenant=tenant)
                except Employee.DoesNotExist:
                    continue
                obj, was_created = StaffAttendance.objects.update_or_create(
                    employee=emp,
                    date=date,
                    defaults={
                        "tenant": tenant,
                        "status": att_status,
                        "check_in_time": item.get("check_in_time"),
                        "check_out_time": item.get("check_out_time"),
                        "remarks": item.get("remarks", ""),
                        "marked_by": request.user,
                    },
                )
                if was_created:
                    created += 1
                else:
                    updated += 1

        return Response(
            {"message": f"Attendance marked: {created} created, {updated} updated."},
            status=status.HTTP_200_OK,
        )


class PayrollPeriodViewSet(_HRBase):
    queryset = PayrollPeriod.objects.select_related("finalized_by").all()
    serializer_class = PayrollPeriodSerializer
    permission_classes = [IsHRManager]

    def perform_create(self, serializer):
        period = serializer.save(tenant=self._tenant())
        record_audit_event(
            action="hr.payroll_period_created",
            user=self.request.user,
            request=self.request,
            details={"period_id": str(period.period_id), "name": period.name},
        )

    @action(detail=True, methods=["post"], url_path="finalize")
    def finalize(self, request, pk=None):
        period = self.get_object()
        if period.status == PayrollPeriod.STATUS_FINALIZED:
            return Response(
                {"detail": "Period is already finalized."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not period.salary_slips.exists():
            return Response(
                {
                    "detail": "No salary slips exist for this period. Generate slips first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            period.status = PayrollPeriod.STATUS_FINALIZED
            period.finalized_at = timezone.now()
            period.finalized_by = request.user
            period.save(update_fields=["status", "finalized_at", "finalized_by"])
            # Finalize all draft slips
            period.salary_slips.filter(status=SalarySlip.STATUS_DRAFT).update(
                status=SalarySlip.STATUS_FINALIZED
            )
        record_audit_event(
            action="hr.payroll_period_finalized",
            user=request.user,
            request=request,
            details={"period_id": str(period.period_id), "name": period.name},
        )
        return Response(PayrollPeriodSerializer(period).data)

    @action(detail=True, methods=["post"], url_path="generate-slips")
    def generate_slips(self, request, pk=None):
        """Auto-generate salary slips for all active employees in this period."""
        period = self.get_object()
        if period.status != PayrollPeriod.STATUS_DRAFT:
            return Response(
                {"detail": "Slips can only be generated for draft periods."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        tenant = self._tenant()
        employees = Employee.objects.filter(tenant=tenant, is_active=True)
        created_count = 0
        skipped_count = 0
        with transaction.atomic():
            for emp in employees:
                if SalarySlip.objects.filter(
                    employee=emp, payroll_period=period
                ).exists():
                    skipped_count += 1
                    continue
                slip = SalarySlip(
                    tenant=tenant,
                    employee=emp,
                    payroll_period=period,
                    working_days=period.working_days,
                    paid_days=period.working_days,
                    basic_salary=emp.basic_salary,
                    # Default HRA = 40% of basic
                    hra=round(emp.basic_salary * 4 / 10, 2),
                )
                slip.save()
                created_count += 1
        return Response(
            {
                "message": f"Generated {created_count} salary slips. {skipped_count} already existed.",
                "created": created_count,
                "skipped": skipped_count,
            },
            status=status.HTTP_200_OK,
        )


class SalarySlipViewSet(_HRBase):
    queryset = SalarySlip.objects.select_related(
        "employee__user", "employee__department", "payroll_period"
    ).all()
    serializer_class = SalarySlipSerializer
    permission_classes = [IsHRManager]

    def get_queryset(self):
        qs = super().get_queryset()
        period_id = self.request.query_params.get("payroll_period")
        employee_id = self.request.query_params.get("employee")
        slip_status = self.request.query_params.get("status")
        if period_id:
            qs = qs.filter(payroll_period__period_id=period_id)
        if employee_id:
            qs = qs.filter(employee__employee_id=employee_id)
        if slip_status:
            qs = qs.filter(status=slip_status)
        return qs

    def perform_create(self, serializer):
        slip = serializer.save(tenant=self._tenant())
        record_audit_event(
            action="hr.salary_slip_created",
            user=self.request.user,
            request=self.request,
            details={
                "slip_id": str(slip.slip_id),
                "employee": slip.employee.full_name,
                "net_salary": str(slip.net_salary),
            },
        )

    def perform_update(self, serializer):
        slip = serializer.save()
        record_audit_event(
            action="hr.salary_slip_updated",
            user=self.request.user,
            request=self.request,
            details={"slip_id": str(slip.slip_id), "net_salary": str(slip.net_salary)},
        )

    @action(detail=True, methods=["get"], url_path="payslip-pdf")
    def payslip_pdf(self, request, pk=None):
        """Generate and return a PDF payslip for this salary slip."""
        from core.reports import generate_pdf_response

        slip = self.get_object()
        tenant = getattr(request.user, "tenant", None)
        school_name = tenant.name if tenant else "School"

        def fmt(val):
            return f"{float(val):,.2f}"

        context = {
            "school_name": school_name,
            "slip_id": str(slip.slip_id)[:12],
            "period_name": slip.payroll_period.name if slip.payroll_period else "",
            "status": slip.status,
            "employee_name": (
                slip.employee.user.get_full_name()
                if slip.employee and slip.employee.user
                else ""
            ),
            "employee_code": slip.employee.employee_code if slip.employee else "",
            "department": (
                slip.employee.department.name
                if slip.employee and slip.employee.department
                else ""
            ),
            "designation": slip.employee.designation if slip.employee else "",
            "working_days": slip.working_days,
            "paid_days": slip.paid_days,
            "absent_days": slip.absent_days,
            "lop_days": slip.lop_days,
            "basic_salary": fmt(slip.basic_salary),
            "hra": fmt(slip.hra),
            "da": fmt(slip.da),
            "transport_allowance": fmt(slip.transport_allowance),
            "medical_allowance": fmt(slip.medical_allowance),
            "other_allowance": fmt(slip.other_allowance),
            "gross_salary": fmt(slip.gross_salary),
            "pf_employee": fmt(slip.pf_employee),
            "pf_employer": fmt(slip.pf_employer),
            "esi_employee": fmt(slip.esi_employee),
            "tds": fmt(slip.tds),
            "professional_tax": fmt(slip.professional_tax),
            "other_deduction": fmt(slip.other_deduction),
            "total_deductions": fmt(slip.total_deductions),
            "net_salary": fmt(slip.net_salary),
            "payment_date": str(slip.payment_date) if slip.payment_date else "",
            "payment_method": (
                slip.payment_method.replace("_", " ").title()
                if slip.payment_method
                else ""
            ),
            "transaction_reference": slip.transaction_reference or "",
            "currency": "$",
            "generated_on": localtime(timezone.now()).strftime("%d %b %Y, %I:%M %p"),
        }

        emp_name_safe = (
            slip.employee.user.get_full_name()
            if slip.employee and slip.employee.user
            else "employee"
        ).replace(" ", "_")
        filename = f"payslip_{emp_name_safe}_{str(slip.slip_id)[:8]}.pdf"
        response = generate_pdf_response("reports/payslip.html", context, filename)
        record_audit_event(
            action="hr.payslip_downloaded",
            user=request.user,
            request=request,
            details={
                "slip_id": str(slip.slip_id),
                "employee": context["employee_name"],
            },
        )
        if response:
            return response
        return Response(
            {"error": "Failed to generate payslip PDF"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        slip = self.get_object()
        if slip.status == SalarySlip.STATUS_PAID:
            return Response(
                {"detail": "Slip is already marked as paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payment_date = request.data.get("payment_date")
        payment_method = request.data.get("payment_method", SalarySlip.METHOD_BANK)
        transaction_reference = request.data.get("transaction_reference", "")
        if not payment_date:
            return Response(
                {"detail": "payment_date is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            slip.status = SalarySlip.STATUS_PAID
            slip.payment_date = payment_date
            slip.payment_method = payment_method
            slip.transaction_reference = transaction_reference
            slip.save(
                update_fields=[
                    "status",
                    "payment_date",
                    "payment_method",
                    "transaction_reference",
                ]
            )
        record_audit_event(
            action="hr.salary_slip_paid",
            user=request.user,
            request=request,
            details={
                "slip_id": str(slip.slip_id),
                "employee": slip.employee.full_name,
                "amount": str(slip.net_salary),
                "method": payment_method,
            },
        )
        return Response(SalarySlipSerializer(slip).data)


class HRDashboardViewSet(BillingSchemaGuardMixin, viewsets.ViewSet):
    require_tenant_schema = True
    permission_classes = [IsHRManager]

    def _tenant(self, request):
        return getattr(request.user, "tenant", None)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        tenant = self._tenant(request)
        total_employees = Employee.objects.filter(tenant=tenant, is_active=True).count()
        total_departments = Department.objects.filter(tenant=tenant).count()
        pending_leaves = LeaveApplication.objects.filter(
            tenant=tenant, status=LeaveApplication.STATUS_PENDING
        ).count()
        open_periods = PayrollPeriod.objects.filter(
            tenant=tenant, status=PayrollPeriod.STATUS_DRAFT
        ).count()

        # Contract type breakdown
        from django.db.models import Count

        contract_breakdown = list(
            Employee.objects.filter(tenant=tenant, is_active=True)
            .values("contract_type")
            .annotate(count=Count("employee_id"))
        )

        # Department headcount
        dept_headcount = list(
            Employee.objects.filter(
                tenant=tenant, is_active=True, department__isnull=False
            )
            .values("department__name")
            .annotate(count=Count("employee_id"))
            .order_by("-count")[:10]
        )

        return Response(
            {
                "total_employees": total_employees,
                "total_departments": total_departments,
                "pending_leave_requests": pending_leaves,
                "open_payroll_periods": open_periods,
                "contract_breakdown": contract_breakdown,
                "department_headcount": dept_headcount,
            }
        )
