# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.conf import settings
from django.db import models
from django.db.models import F, Q

from .class_section import AcademicClass
from .teacher import Teacher


class Timetable(models.Model):
    DAYS_OF_WEEK = [
        ("Monday", "Monday"),
        ("Tuesday", "Tuesday"),
        ("Wednesday", "Wednesday"),
        ("Thursday", "Thursday"),
        ("Friday", "Friday"),
        ("Saturday", "Saturday"),
        ("Sunday", "Sunday"),
    ]
    ENTRY_TYPE_CHOICES = [
        ("main", "Main Timetable"),
        ("extra", "Extra Class"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending Approval"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    timetable_id = models.AutoField(primary_key=True)
    academic_year = models.ForeignKey(
        "academic.AcademicYear",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="timetable_entries",
    )
    academic_class = models.ForeignKey(
        AcademicClass, on_delete=models.CASCADE, related_name="timetable_entries"
    )
    day_of_week = models.CharField(max_length=20, choices=DAYS_OF_WEEK)
    start_time = models.TimeField()
    end_time = models.TimeField()
    subject_name = models.CharField(
        max_length=100
    )  # Simple string for now, could be linked to Course/Subject later
    teacher = models.ForeignKey(
        Teacher, on_delete=models.SET_NULL, null=True, blank=True
    )
    room_number = models.CharField(max_length=50, blank=True, null=True)
    entry_type = models.CharField(
        max_length=20, choices=ENTRY_TYPE_CHOICES, default="main"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="approved")
    approval_comment = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_timetable_entries",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_timetable_entries",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["day_of_week", "start_time"]
        indexes = [
            models.Index(
                fields=["academic_year", "academic_class", "day_of_week", "start_time"],
                name="tt_year_class_day_idx",
            ),
            models.Index(
                fields=["academic_class", "day_of_week", "start_time"],
                name="tt_class_day_idx",
            ),
            models.Index(
                fields=["academic_class", "status", "entry_type"],
                name="tt_class_status_idx",
            ),
            models.Index(
                fields=["teacher", "day_of_week", "start_time"],
                name="tt_teacher_day_idx",
            ),
            models.Index(fields=["created_by", "status"], name="tt_creator_status_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(end_time__gt=F("start_time")),
                name="tt_end_after_start_chk",
            ),
        ]

    def __str__(self):
        year_label = self.academic_year.name if self.academic_year else "No Year"
        return f"{year_label} | {self.academic_class} - {self.day_of_week} ({self.start_time} - {self.end_time}) [{self.entry_type}/{self.status}]"
