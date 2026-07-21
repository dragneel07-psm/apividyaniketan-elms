# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import models

from core.upload_validation import document_upload_validators
from core.utils.storage_paths import (
    schema_from_current_connection,
    tenant_scoped_upload_path,
)

from .subject import Subject


def lesson_material_upload_to(instance, filename):
    return tenant_scoped_upload_path(
        schema_from_current_connection(), "lesson_materials", filename
    )


class Chapter(models.Model):
    """
    A Chapter or Unit within a Subject. Top-level organization for Lessons.
    """

    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="chapters"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]
        unique_together = ["subject", "order"]  # Enforce order? Maybe just recommended.

    def __str__(self):
        return f"{self.subject.name} - {self.title}"


class Lesson(models.Model):
    """
    A specific Lesson within a Chapter. Contains the core content.
    """

    CONTENT_TYPE_CHOICES = [
        ("text", "Text/Article"),
        ("video", "Video"),
        ("interactive", "Interactive"),
        ("quiz", "Quiz/Assessment"),
    ]

    chapter = models.ForeignKey(
        Chapter, on_delete=models.CASCADE, related_name="lessons"
    )
    title = models.CharField(max_length=200)
    content_type = models.CharField(
        max_length=20, choices=CONTENT_TYPE_CHOICES, default="text"
    )
    content = models.TextField(
        blank=True, help_text="Rich text content (HTML/Markdown)"
    )
    video_url = models.URLField(
        blank=True, null=True, help_text="Link to video lecture (YouTube/Vimeo)"
    )
    video_transcript = models.TextField(
        blank=True,
        null=True,
        help_text="Auto-generated or manually entered transcript for video lessons",
    )
    interactive_data = models.JSONField(
        blank=True, null=True, help_text="JSON payload for interactive content"
    )
    assessment = models.ForeignKey(
        "academic.Assessment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="linked_lessons",
        help_text="Linked Quiz/Assessment",
    )

    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=False)
    duration_minutes = models.PositiveIntegerField(
        default=45, help_text="Estimated duration"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.chapter.title} - {self.title}"


class LessonMaterial(models.Model):
    """
    Files or Links attached to a Lesson (e.g., PDF slides, Reference Links).
    """

    TYPE_CHOICES = [
        ("pdf", "PDF Document"),
        ("image", "Image"),
        ("video", "Video File"),
        ("link", "External Link"),
        ("other", "Other File"),
    ]

    lesson = models.ForeignKey(
        Lesson, on_delete=models.CASCADE, related_name="materials"
    )
    title = models.CharField(max_length=200)
    file = models.FileField(
        upload_to=lesson_material_upload_to,
        blank=True,
        null=True,
        validators=document_upload_validators(),
    )
    link = models.URLField(blank=True, null=True)
    material_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default="other"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class LessonProgress(models.Model):
    """
    Tracks if a Student has completed a Lesson.
    """

    student = models.ForeignKey(
        "academic.Student", on_delete=models.CASCADE, related_name="lesson_progresses"
    )
    lesson = models.ForeignKey(
        Lesson, on_delete=models.CASCADE, related_name="progresses"
    )
    completed = models.BooleanField(default=False)
    xp_awarded = models.BooleanField(default=False)
    progress_percent = models.FloatField(default=0)
    video_watched_seconds = models.FloatField(default=0)
    video_duration_seconds = models.FloatField(default=0)
    last_accessed = models.DateTimeField(auto_now=True)
    last_watched_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["student", "lesson"]
        verbose_name_plural = "Lesson Progresses"

    def __str__(self):
        status = "Completed" if self.completed else "In Progress"
        return f"{self.student.user.get_full_name()} - {self.lesson.title} ({status})"
