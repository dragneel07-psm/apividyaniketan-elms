# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.db import models

from .class_section import Section
from .student import Student
from .subject import Subject


class Assessment(models.Model):
    TYPES = [("quiz", "Quiz"), ("exam", "Exam"), ("assignment", "Assignment")]

    BLOOMS_LEVELS = [
        ("remember", "Remember"),
        ("understand", "Understand"),
        ("apply", "Apply"),
        ("analyze", "Analyze"),
        ("evaluate", "Evaluate"),
        ("create", "Create"),
    ]

    assessment_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    academic_year = models.ForeignKey(
        "academic.AcademicYear",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="assessments",
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="assessments"
    )
    section = models.ForeignKey(
        Section,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assessments",
    )
    title = models.CharField(max_length=255, default="Assessment")
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=50, choices=TYPES, default="quiz")
    total_marks = models.IntegerField()
    passing_marks = models.IntegerField(default=40)

    # Scheduling
    scheduled_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=60)

    # Analytics
    blooms_level = models.CharField(
        max_length=20, choices=BLOOMS_LEVELS, default="remember"
    )
    is_final_assessment = models.BooleanField(default=False)
    results_published = models.BooleanField(default=False)
    results_published_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        year_label = self.academic_year.name if self.academic_year else "No Year"
        if self.section:
            return f"{self.title} ({self.section}, {year_label})"
        return f"{self.title} ({self.subject.academic_class}, {year_label})"


class Result(models.Model):
    result_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE, related_name="results"
    )
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="results"
    )
    score = models.IntegerField()

    # Performance Stats
    time_taken_minutes = models.IntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    # Advanced Feedback
    ai_feedback = models.TextField(
        blank=True, null=True, help_text="AI generated feedback on performance"
    )
    teacher_feedback = models.TextField(blank=True, null=True)
    graded_by = models.ForeignKey(
        "users.UserAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="graded_results",
    )

    # For descriptive answers analysis
    answers_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.student} - {self.assessment}: {self.score}"


class StudentPromotionDecision(models.Model):
    DECISIONS = [
        ("promote", "Promote"),
        ("hold", "Hold"),
    ]

    decision_id = models.UUIDField(default=uuid_lib.uuid4, editable=False, unique=True)
    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name="promotion_decisions",
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="promotion_decisions",
    )
    decision = models.CharField(max_length=16, choices=DECISIONS)
    decision_reason = models.TextField()
    decided_by = models.ForeignKey(
        "users.UserAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_promotion_decisions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("assessment", "student")
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.assessment_id} | {self.student_id} -> {self.decision}"


class StudentPromotionDecisionHistory(models.Model):
    ACTIONS = [
        ("promote", "Promote"),
        ("hold", "Hold"),
        ("override", "Override"),
        ("clear", "Clear"),
    ]
    DECISIONS = [
        ("promote", "Promote"),
        ("hold", "Hold"),
    ]

    history_id = models.UUIDField(default=uuid_lib.uuid4, editable=False, unique=True)
    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name="promotion_decision_history",
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="promotion_decision_history",
    )
    action = models.CharField(max_length=16, choices=ACTIONS)
    previous_decision = models.CharField(
        max_length=16, choices=DECISIONS, null=True, blank=True
    )
    new_decision = models.CharField(
        max_length=16, choices=DECISIONS, null=True, blank=True
    )
    decision_reason = models.TextField()
    decided_by = models.ForeignKey(
        "users.UserAccount",
        on_delete=models.PROTECT,
        related_name="student_promotion_decision_history",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.assessment_id} | {self.student_id} | {self.action}"


class AssessmentResultPublicationAudit(models.Model):
    ACTIONS = [
        ("publish", "Publish"),
        ("unpublish", "Unpublish"),
        ("reopen", "Reopen"),
    ]

    audit_id = models.UUIDField(default=uuid_lib.uuid4, editable=False, unique=True)
    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name="result_publication_audit",
    )
    action = models.CharField(max_length=16, choices=ACTIONS)
    was_published = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    published_at_before = models.DateTimeField(null=True, blank=True)
    published_at_after = models.DateTimeField(null=True, blank=True)
    reason = models.TextField(blank=True, default="")
    performed_by = models.ForeignKey(
        "users.UserAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assessment_result_publication_audit",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.assessment_id} | {self.action}"
