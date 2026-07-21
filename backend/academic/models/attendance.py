# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import models

from .student import Student
from .subject import Subject


class Attendance(models.Model):
    STATUS_CHOICES = [
        ("present", "Present"),
        ("absent", "Absent"),
        ("late", "Late"),
        ("excused", "Excused"),
    ]

    attendance_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="attendance_records"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="attendance_records"
    )
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="present")
    remarks = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "subject", "date")
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["student", "date"], name="acad_att_student_date_idx"),
            models.Index(fields=["subject", "date"], name="acad_att_subject_date_idx"),
        ]

    def __str__(self):
        return f"{self.student} - {self.subject} - {self.date} - {self.status}"
