# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import models

from .class_section import AcademicClass


class Subject(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True, null=True)
    academic_class = models.ForeignKey(
        AcademicClass, on_delete=models.CASCADE, related_name="subjects"
    )
    academic_year = models.ForeignKey(
        "academic.AcademicYear",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="subjects",
    )
    description = models.TextField(blank=True, null=True)
    credits = models.DecimalField(max_digits=4, decimal_places=1, default=1.0)

    # Optional: If subjects are purely elective or core
    is_elective = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)
    teacher = models.ForeignKey(
        "academic.Teacher",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subjects",
    )
    additional_teachers = models.ManyToManyField(
        "academic.Teacher",
        blank=True,
        related_name="additional_subjects",
    )

    class Meta:
        unique_together = ("name", "academic_class", "academic_year")
        ordering = ["name"]

    def __str__(self):
        year_label = self.academic_year.name if self.academic_year else "No Year"
        return f"{self.name} ({self.academic_class.name}, {year_label})"
