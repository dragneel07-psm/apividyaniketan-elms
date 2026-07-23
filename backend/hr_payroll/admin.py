# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib import admin

from .models import (
    Department,
    Employee,
    LeaveApplication,
    LeaveType,
    PayrollPeriod,
    SalarySlip,
    StaffAttendance,
)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "created_at")
    list_filter = ()
    search_fields = ("name", "code")


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "designation",
        "department",
        "contract_type",
        "join_date",
        "is_active",
    )
    list_filter = ("contract_type", "is_active", "department")
    search_fields = (
        "user__first_name",
        "user__last_name",
        "user__email",
        "employee_code",
        "designation",
    )
    raw_id_fields = ("user", "department")


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "max_days_per_year",
        "is_paid",
        "carry_forward",
        )
    list_filter = ("is_paid", "carry_forward")


@admin.register(LeaveApplication)
class LeaveApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "employee",
        "leave_type",
        "start_date",
        "end_date",
        "total_days",
        "status",
        "applied_at",
    )
    list_filter = ("status", "leave_type")
    search_fields = ("employee__user__first_name", "employee__user__last_name")
    raw_id_fields = ("employee", "leave_type", "reviewed_by")


@admin.register(StaffAttendance)
class StaffAttendanceAdmin(admin.ModelAdmin):
    list_display = ("employee", "date", "status", "check_in_time", "check_out_time")
    list_filter = ("status", "date")
    search_fields = ("employee__user__first_name", "employee__user__last_name")
    raw_id_fields = ("employee",)


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ("name", "month", "year", "status", "working_days", "created_at")
    list_filter = ("status", "year")
    raw_id_fields = ("finalized_by",)


@admin.register(SalarySlip)
class SalarySlipAdmin(admin.ModelAdmin):
    list_display = (
        "employee",
        "payroll_period",
        "basic_salary",
        "gross_salary",
        "total_deductions",
        "net_salary",
        "status",
    )
    list_filter = ("status", "payroll_period__year", "payment_method")
    search_fields = ("employee__user__first_name", "employee__user__last_name")
    raw_id_fields = ("employee", "payroll_period")
    readonly_fields = (
        "gross_salary",
        "total_deductions",
        "net_salary",
        "created_at",
        "updated_at",
    )
