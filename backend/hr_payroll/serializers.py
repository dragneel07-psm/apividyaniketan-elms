# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from rest_framework import serializers

from .models import (
    Department,
    Employee,
    LeaveApplication,
    LeaveType,
    PayrollPeriod,
    SalarySlip,
    StaffAttendance,
)


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.CharField(
        source="head.full_name", read_only=True, default=None
    )
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = "__all__"
        read_only_fields = ["tenant", "created_at"]

    def get_employee_count(self, obj):
        return obj.employees.filter(is_active=True).count()


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    department_name = serializers.CharField(
        source="department.name", read_only=True, default=None
    )
    role = serializers.CharField(source="user.role", read_only=True)

    class Meta:
        model = Employee
        fields = "__all__"
        read_only_fields = ["tenant", "created_at", "updated_at"]

    def validate(self, attrs):
        user = attrs.get("user") or getattr(self.instance, "user", None)
        tenant = attrs.get("tenant") or getattr(self.instance, "tenant", None)
        if user and tenant:
            user_tenant = getattr(user, "tenant", None)
            if user_tenant and user_tenant != tenant:
                raise serializers.ValidationError(
                    {"user": "User does not belong to this tenant."}
                )
        return attrs


class EmployeeListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    department_name = serializers.CharField(
        source="department.name", read_only=True, default=None
    )

    class Meta:
        model = Employee
        fields = [
            "employee_id",
            "employee_code",
            "full_name",
            "email",
            "designation",
            "department_name",
            "contract_type",
            "join_date",
            "basic_salary",
            "is_active",
        ]


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = "__all__"
        read_only_fields = ["tenant", "created_at"]


class LeaveApplicationSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    leave_type_code = serializers.CharField(source="leave_type.code", read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveApplication
        fields = "__all__"
        read_only_fields = [
            "tenant",
            "status",
            "applied_at",
            "reviewed_by",
            "reviewed_at",
            "review_remarks",
        ]

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name()
        return None

    def validate(self, attrs):
        start = attrs.get("start_date") or getattr(self.instance, "start_date", None)
        end = attrs.get("end_date") or getattr(self.instance, "end_date", None)
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "End date must be on or after start date."}
            )
        return attrs


class StaffAttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    marked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffAttendance
        fields = "__all__"
        read_only_fields = ["tenant", "marked_by", "created_at"]

    def get_marked_by_name(self, obj):
        if obj.marked_by:
            return obj.marked_by.get_full_name()
        return None


class PayrollPeriodSerializer(serializers.ModelSerializer):
    finalized_by_name = serializers.SerializerMethodField()
    slip_count = serializers.SerializerMethodField()

    class Meta:
        model = PayrollPeriod
        fields = "__all__"
        read_only_fields = ["tenant", "finalized_at", "finalized_by", "created_at"]

    def get_finalized_by_name(self, obj):
        if obj.finalized_by:
            return obj.finalized_by.get_full_name()
        return None

    def get_slip_count(self, obj):
        return obj.salary_slips.count()

    def validate(self, attrs):
        start = attrs.get("start_date") or getattr(self.instance, "start_date", None)
        end = attrs.get("end_date") or getattr(self.instance, "end_date", None)
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "End date must be after start date."}
            )
        return attrs


class SalarySlipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_code = serializers.CharField(
        source="employee.employee_code", read_only=True
    )
    department_name = serializers.CharField(
        source="employee.department.name", read_only=True, default=None
    )
    period_name = serializers.CharField(source="payroll_period.name", read_only=True)

    class Meta:
        model = SalarySlip
        fields = "__all__"
        read_only_fields = [
            "tenant",
            "gross_salary",
            "total_deductions",
            "net_salary",
            "created_at",
            "updated_at",
        ]
