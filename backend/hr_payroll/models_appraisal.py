# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models


class AppraisalCycle(models.Model):
    cycle_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="appraisal_cycles",
        db_constraint=False,
    )
    name = models.CharField(max_length=100)
    period_start = models.DateField()
    period_end = models.DateField()
    STATUS = [("draft", "Draft"), ("active", "Active"), ("closed", "Closed")]
    status = models.CharField(max_length=20, choices=STATUS, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-period_start"]

    def __str__(self):
        return self.name


class AppraisalForm(models.Model):
    form_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="appraisal_forms",
        db_constraint=False,
    )
    cycle = models.ForeignKey(
        AppraisalCycle,
        on_delete=models.CASCADE,
        related_name="forms",
        db_constraint=False,
    )
    employee = models.ForeignKey(
        "hr_payroll.Employee",
        on_delete=models.CASCADE,
        related_name="appraisals",
        db_constraint=False,
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appraisals_reviewed",
        db_constraint=False,
    )

    # KRA Scores (1-5)
    punctuality = models.PositiveSmallIntegerField(null=True, blank=True)
    subject_knowledge = models.PositiveSmallIntegerField(null=True, blank=True)
    student_engagement = models.PositiveSmallIntegerField(null=True, blank=True)
    communication = models.PositiveSmallIntegerField(null=True, blank=True)
    teamwork = models.PositiveSmallIntegerField(null=True, blank=True)
    overall_score = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True
    )

    employee_comments = models.TextField(blank=True)
    reviewer_comments = models.TextField(blank=True)
    goals_next_period = models.TextField(blank=True)

    STATUS = [
        ("pending", "Pending"),
        ("self_reviewed", "Self Reviewed"),
        ("completed", "Completed"),
    ]
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    submitted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]
        unique_together = [("cycle", "employee")]

    def __str__(self):
        return f"{self.employee} – {self.cycle}"

    def compute_overall(self):
        scores = [
            self.punctuality,
            self.subject_knowledge,
            self.student_engagement,
            self.communication,
            self.teamwork,
        ]
        valid = [s for s in scores if s is not None]
        return round(sum(valid) / len(valid), 2) if valid else None
