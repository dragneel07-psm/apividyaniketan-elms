# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Proprietary and confidential.
import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class NepalGradingProfile(models.Model):
    """Versioned grading rules; published results retain their original profile."""

    profile_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("core.Tenant", on_delete=models.CASCADE, db_constraint=False)
    name = models.CharField(max_length=180)
    directive_name = models.CharField(max_length=255, default="Letter Grading Directive 2078")
    amendment = models.CharField(max_length=100, default="Fourth Amendment 2081")
    effective_from_bs = models.CharField(max_length=20, default="2081")
    level = models.CharField(
        max_length=20,
        choices=[("basic", "Basic"), ("secondary", "Secondary"), ("plus_two", "Grade 11-12")],
        default="secondary",
    )
    # Ordered highest to lowest. Stored with the profile so amendments do not
    # retroactively alter historical results.
    bands = models.JSONField(default=list)
    theory_pass_percent = models.DecimalField(max_digits=5, decimal_places=2, default=35)
    internal_pass_percent = models.DecimalField(max_digits=5, decimal_places=2, default=40)
    practical_pass_percent = models.DecimalField(max_digits=5, decimal_places=2, default=40)
    rounding_places = models.PositiveSmallIntegerField(default=2)
    is_active = models.BooleanField(default=True)
    is_system_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("tenant", "name", "effective_from_bs")
        ordering = ["-effective_from_bs", "name"]


class ExamTerm(models.Model):
    STATUSES = [
        ("draft", "Draft"), ("active", "Active"), ("marking", "Marking"),
        ("verification", "Verification"), ("locked", "Locked"),
        ("published", "Published"),
    ]
    TYPES = [
        ("unit_test", "Unit Test"), ("first_terminal", "First Terminal"),
        ("second_terminal", "Second Terminal"), ("final", "Final"),
        ("pre_board", "Pre-board"), ("other", "Other"),
    ]

    term_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("core.Tenant", on_delete=models.CASCADE, db_constraint=False)
    academic_year = models.ForeignKey("academic.AcademicYear", on_delete=models.PROTECT)
    grading_profile = models.ForeignKey(NepalGradingProfile, on_delete=models.PROTECT)
    name = models.CharField(max_length=180)
    exam_type = models.CharField(max_length=30, choices=TYPES)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUSES, default="draft")
    include_rank = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="published_exam_terms", db_constraint=False,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL,
        related_name="created_exam_terms", db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("tenant", "academic_year", "name")
        ordering = ["-start_date", "name"]


class ExamSubject(models.Model):
    MARKING_STATUSES = [
        ("draft", "Draft"), ("submitted", "Submitted"), ("verified", "Verified")
    ]
    exam_subject_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    term = models.ForeignKey(ExamTerm, on_delete=models.CASCADE, related_name="exam_subjects")
    subject = models.ForeignKey("academic.Subject", on_delete=models.PROTECT)
    section = models.ForeignKey("academic.Section", on_delete=models.PROTECT)
    assessment = models.OneToOneField(
        "academic.Assessment", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="exam_subject_configuration",
    )
    examiner = models.ForeignKey(
        "academic.Teacher", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="exam_subject_assignments",
    )
    theory_full_marks = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    internal_full_marks = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    practical_full_marks = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    credit_hours = models.DecimalField(max_digits=5, decimal_places=2, default=1)
    marking_status = models.CharField(max_length=20, choices=MARKING_STATUSES, default="draft")
    submitted_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="verified_exam_subjects", db_constraint=False,
    )

    class Meta:
        unique_together = ("term", "subject", "section")
        ordering = ["section__academic_class__order", "subject__name"]

    @property
    def full_marks(self):
        return self.theory_full_marks + self.internal_full_marks + self.practical_full_marks


class AnswerPaperCode(models.Model):
    paper_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam_subject = models.ForeignKey(ExamSubject, on_delete=models.CASCADE, related_name="papers")
    student = models.ForeignKey("academic.Student", on_delete=models.PROTECT, related_name="exam_papers")
    code_hash = models.CharField(max_length=64, unique=True)
    code_hint = models.CharField(max_length=12)
    generated_at = models.DateTimeField(auto_now_add=True)
    is_void = models.BooleanField(default=False)

    class Meta:
        unique_together = ("exam_subject", "student")


class MarkEntry(models.Model):
    STATUSES = [
        ("draft", "Draft"), ("submitted", "Submitted"),
        ("verified", "Verified"), ("locked", "Locked"),
    ]
    entry_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    paper = models.OneToOneField(AnswerPaperCode, on_delete=models.PROTECT, related_name="mark_entry")
    theory_marks = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    internal_marks = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    practical_marks = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    attendance_status = models.CharField(
        max_length=12,
        choices=[("present", "Present"), ("absent", "Absent"), ("withheld", "Withheld"), ("exempt", "Exempt")],
        default="present",
    )
    examiner_remarks = models.TextField(blank=True, default="")
    status = models.CharField(max_length=16, choices=STATUSES, default="draft")
    version = models.PositiveIntegerField(default=1)
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL,
        related_name="entered_exam_marks", db_constraint=False,
    )
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_obtained(self):
        return sum(value or 0 for value in (self.theory_marks, self.internal_marks, self.practical_marks))


class MarkEntryRevision(models.Model):
    revision_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entry = models.ForeignKey(MarkEntry, on_delete=models.CASCADE, related_name="revisions")
    version = models.PositiveIntegerField()
    before = models.JSONField(default=dict)
    after = models.JSONField(default=dict)
    reason = models.TextField(blank=True, default="")
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, db_constraint=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("entry", "version")


class StudentTermResult(models.Model):
    term_result_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    term = models.ForeignKey(ExamTerm, on_delete=models.PROTECT, related_name="student_results")
    student = models.ForeignKey("academic.Student", on_delete=models.PROTECT, related_name="term_results")
    marksheet_number = models.CharField(max_length=50, unique=True)
    total_obtained = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_full_marks = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    result_status = models.CharField(max_length=12, default="GRD")
    rank = models.PositiveIntegerField(null=True, blank=True)
    snapshot = models.JSONField(default=dict)
    published_at = models.DateTimeField()

    class Meta:
        unique_together = ("term", "student")
        ordering = ["student__user__first_name", "student__student_id"]
