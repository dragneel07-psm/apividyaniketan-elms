# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.db import models

from .assessment import Assessment
from .student import Student


class Exam(models.Model):
    exam_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    assessment = models.OneToOneField(
        Assessment,
        on_delete=models.CASCADE,
        related_name="exam_details",
        limit_choices_to={"type": "exam"},
    )

    # Registration & Identification
    hall_ticket_prefix = models.CharField(max_length=20, default="EXAM")
    exam_center = models.CharField(max_length=255, null=True, blank=True)

    # Logistics
    seating_capacity = models.IntegerField(default=30)
    instructions = models.TextField(blank=True, null=True)

    # Status
    is_published = models.BooleanField(default=False)
    results_released = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Exam: {self.assessment.title}"

    def generate_hall_ticket_number(self, student):
        """Generates a unique hall ticket number for a student"""
        # Format: PREFIX-CLASS-SECTION-STUDENT_ID_SHORT
        class_name = (
            student.academic_class.name.replace(" ", "")
            if student.academic_class
            else "NA"
        )
        section_name = student.section.name if student.section else "NA"
        student_part = (
            str(student.student_id)[:6] if student.student_id else str(student.id)[:6]
        )

        return f"{self.hall_ticket_prefix}-{class_name}-{section_name}-{student_part}".upper()


class ExamSeating(models.Model):
    seating_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    exam = models.ForeignKey(
        Exam, on_delete=models.CASCADE, related_name="seating_arrangements"
    )
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="exam_seating"
    )

    hall_ticket_number = models.CharField(max_length=50, unique=True)
    room_number = models.CharField(max_length=50)
    seat_number = models.CharField(max_length=50)

    attendance_status = models.CharField(
        max_length=20,
        choices=[("present", "Present"), ("absent", "Absent"), ("late", "Late")],
        default="present",
    )

    class Meta:
        unique_together = ("exam", "student")

    def __str__(self):
        return f"{self.student} - {self.exam} - {self.seat_number}"
