# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.db import models

from .assessment import Assessment


class Question(models.Model):
    TYPES = [
        ("mcq", "Multiple Choice"),
        ("short_answer", "Short Answer"),
        ("long_answer", "Long Answer/Essay"),
        ("code", "Code Snippet"),
    ]

    question_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name="questions",
        null=True,
        blank=True,
    )
    text = models.TextField()
    type = models.CharField(max_length=50, choices=TYPES, default="mcq")

    # Categorization
    tags = models.JSONField(
        default=list, blank=True, help_text="Tags for categorization"
    )
    difficulty = models.CharField(
        max_length=20,
        choices=[("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")],
        default="medium",
    )

    # For MCQs
    options = models.JSONField(
        default=list, blank=True, help_text="List of options for MCQ"
    )
    correct_answer = models.TextField(
        blank=True, null=True, help_text="Correct answer key or text"
    )

    points = models.IntegerField(default=1)
    order = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.assessment.title} - Q{self.order}: {self.text[:50]}"
