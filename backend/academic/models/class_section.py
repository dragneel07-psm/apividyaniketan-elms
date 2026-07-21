# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import models


class AcademicClass(models.Model):
    name = models.CharField(
        max_length=50, unique=True, help_text="e.g. Grade 1, Class 10"
    )
    order = models.IntegerField(default=0, help_text="For sorting purposes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "Academic Classes"

    def __str__(self):
        return self.name


class Section(models.Model):
    name = models.CharField(max_length=20, help_text="e.g. A, B, Red, Blue")
    academic_class = models.ForeignKey(
        AcademicClass, on_delete=models.CASCADE, related_name="sections"
    )
    capacity = models.IntegerField(default=40)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("name", "academic_class")
        ordering = ["name"]

    def __str__(self):
        return f"{self.academic_class.name} - {self.name}"
