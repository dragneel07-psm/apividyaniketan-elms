# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

import uuid as uuid_lib
from decimal import Decimal

from django.conf import settings
from django.db import models

from billing.models_base import SchemaScopedBillingModel
from core.models.tenant import Tenant


class Department(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "tenant"

    dept_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="hr_departments",
        db_constraint=False,
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    head = models.ForeignKey(
        "hr_payroll.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="headed_departments",
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant"], name="hr_dept_tenant_idx"),
        ]
        unique_together = [("tenant", "name")]

    def __str__(self):
        return self.name


class Employee(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "tenant"

    CONTRACT_PERMANENT = "permanent"
    CONTRACT_PROBATIONARY = "probationary"
    CONTRACT_FIXED_TERM = "fixed_term"
    CONTRACT_PART_TIME = "part_time"
    CONTRACT_CHOICES = (
        (CONTRACT_PERMANENT, "Permanent"),
        (CONTRACT_PROBATIONARY, "Probationary"),
        (CONTRACT_FIXED_TERM, "Fixed-Term Contract"),
        (CONTRACT_PART_TIME, "Part-Time"),
    )

    employee_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="employees", db_constraint=False
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employee_profile",
        db_constraint=False,
    )
    employee_code = models.CharField(max_length=30, blank=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
        db_constraint=False,
    )
    designation = models.CharField(max_length=120)
    contract_type = models.CharField(
        max_length=20, choices=CONTRACT_CHOICES, default=CONTRACT_PERMANENT
    )
    join_date = models.DateField()
    probation_end_date = models.DateField(null=True, blank=True)
    confirmation_date = models.DateField(null=True, blank=True)

    # Salary
    basic_salary = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    salary_grade = models.CharField(max_length=20, blank=True)

    # Bank details
    bank_account_number = models.CharField(max_length=30, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_ifsc = models.CharField(max_length=20, blank=True)

    # Emergency contact
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["tenant", "is_active"], name="hr_emp_tenant_active_idx"
            ),
            models.Index(
                fields=["tenant", "department"], name="hr_emp_tenant_dept_idx"
            ),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.designation})"

    @property
    def full_name(self):
        return self.user.get_full_name()

    @property
    def email(self):
        return self.user.email


class LeaveType(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "tenant"

    leave_type_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="leave_types",
        db_constraint=False,
    )
    name = models.CharField(max_length=80)
    code = models.CharField(max_length=10)
    max_days_per_year = models.PositiveSmallIntegerField(default=12)
    is_paid = models.BooleanField(default=True)
    carry_forward = models.BooleanField(default=False)
    carry_forward_max_days = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant"], name="hr_lvtype_tenant_idx"),
        ]
        unique_together = [("tenant", "code")]

    def __str__(self):
        return f"{self.name} ({self.code})"


class LeaveApplication(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "tenant"

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    leave_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="leave_applications",
        db_constraint=False,
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="leave_applications",
        db_constraint=False,
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name="applications",
        db_constraint=False,
    )
    start_date = models.DateField()
    end_date = models.DateField()
    total_days = models.DecimalField(
        max_digits=5, decimal_places=1, default=Decimal("1.0")
    )
    reason = models.TextField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_leaves",
        db_constraint=False,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_remarks = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["tenant", "status"], name="hr_leave_tenant_status_idx"
            ),
            models.Index(
                fields=["tenant", "employee", "status"], name="hr_leave_emp_status_idx"
            ),
            models.Index(fields=["start_date", "end_date"], name="hr_leave_dates_idx"),
        ]
        ordering = ["-applied_at"]

    def __str__(self):
        return f"{self.employee} – {self.leave_type.code} ({self.start_date} to {self.end_date})"


class StaffAttendance(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "tenant"

    STATUS_PRESENT = "present"
    STATUS_ABSENT = "absent"
    STATUS_HALF_DAY = "half_day"
    STATUS_LATE = "late"
    STATUS_ON_LEAVE = "on_leave"
    STATUS_HOLIDAY = "holiday"
    STATUS_CHOICES = (
        (STATUS_PRESENT, "Present"),
        (STATUS_ABSENT, "Absent"),
        (STATUS_HALF_DAY, "Half Day"),
        (STATUS_LATE, "Late"),
        (STATUS_ON_LEAVE, "On Leave"),
        (STATUS_HOLIDAY, "Holiday"),
    )

    attendance_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="staff_attendance",
        db_constraint=False,
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="attendance_records",
        db_constraint=False,
    )
    date = models.DateField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PRESENT
    )
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    remarks = models.CharField(max_length=255, blank=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="marked_staff_attendance",
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "date"], name="hr_att_tenant_date_idx"),
            models.Index(
                fields=["tenant", "employee", "date"], name="hr_att_emp_date_idx"
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "date"], name="hr_att_unique_emp_date"
            )
        ]
        ordering = ["-date"]

    def __str__(self):
        return f"{self.employee} – {self.date} ({self.status})"


class PayrollPeriod(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "tenant"

    STATUS_DRAFT = "draft"
    STATUS_PROCESSING = "processing"
    STATUS_FINALIZED = "finalized"
    STATUS_PAID = "paid"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_FINALIZED, "Finalized"),
        (STATUS_PAID, "Paid"),
    )

    period_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="payroll_periods",
        db_constraint=False,
    )
    name = models.CharField(max_length=80)  # e.g. "March 2026"
    month = models.PositiveSmallIntegerField()  # 1–12
    year = models.PositiveSmallIntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    working_days = models.PositiveSmallIntegerField(default=26)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT
    )
    finalized_at = models.DateTimeField(null=True, blank=True)
    finalized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="finalized_payroll_periods",
        db_constraint=False,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["tenant", "year", "month"], name="hr_period_tenant_ym_idx"
            ),
            models.Index(
                fields=["tenant", "status"], name="hr_period_tenant_status_idx"
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "month", "year"],
                name="hr_period_unique_tenant_month_year",
            )
        ]
        ordering = ["-year", "-month"]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


class SalarySlip(SchemaScopedBillingModel, models.Model):
    SCHEMA_SCOPE = "tenant"

    STATUS_DRAFT = "draft"
    STATUS_FINALIZED = "finalized"
    STATUS_PAID = "paid"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_FINALIZED, "Finalized"),
        (STATUS_PAID, "Paid"),
    )

    METHOD_CASH = "cash"
    METHOD_BANK = "bank_transfer"
    METHOD_CHEQUE = "cheque"
    METHOD_ONLINE = "online"
    PAYMENT_METHOD_CHOICES = (
        (METHOD_CASH, "Cash"),
        (METHOD_BANK, "Bank Transfer"),
        (METHOD_CHEQUE, "Cheque"),
        (METHOD_ONLINE, "Online"),
    )

    slip_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="salary_slips",
        db_constraint=False,
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="salary_slips",
        db_constraint=False,
    )
    payroll_period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.CASCADE,
        related_name="salary_slips",
        db_constraint=False,
    )

    # Attendance summary
    working_days = models.PositiveSmallIntegerField(default=26)
    paid_days = models.PositiveSmallIntegerField(default=26)
    absent_days = models.PositiveSmallIntegerField(default=0)
    lop_days = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal("0"))

    # Earnings
    basic_salary = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    hra = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    da = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    transport_allowance = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0")
    )
    medical_allowance = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0")
    )
    other_allowance = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    gross_salary = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )

    # Deductions
    pf_employee = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0")
    )
    pf_employer = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0")
    )
    esi_employee = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0")
    )
    tds = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    professional_tax = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0")
    )
    other_deduction = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0")
    )
    total_deductions = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )

    net_salary = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )

    # Payment info
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT
    )
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True
    )
    transaction_reference = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["tenant", "payroll_period"], name="hr_slip_tenant_period_idx"
            ),
            models.Index(fields=["tenant", "employee"], name="hr_slip_tenant_emp_idx"),
            models.Index(fields=["tenant", "status"], name="hr_slip_tenant_status_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "payroll_period"], name="hr_slip_unique_emp_period"
            )
        ]
        ordering = ["-payroll_period__year", "-payroll_period__month"]

    def compute_totals(self):
        """Recalculate gross, total deductions, and net salary in place."""
        self.gross_salary = (
            self.basic_salary
            + self.hra
            + self.da
            + self.transport_allowance
            + self.medical_allowance
            + self.other_allowance
        )
        self.total_deductions = (
            self.pf_employee
            + self.esi_employee
            + self.tds
            + self.professional_tax
            + self.other_deduction
        )
        self.net_salary = self.gross_salary - self.total_deductions

    def save(self, *args, **kwargs):
        self.compute_totals()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Slip – {self.employee} / {self.payroll_period}"
