# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Admin-editable content for the public marketing site (/school/*) — news
articles, gallery photos, testimonials, programs, core values, history,
student life activities, field trips, wellbeing support, and admissions FAQs.

All models share the same shape: manually orderable and soft-hideable via
is_active rather than deleted, so public.py's read views never need
per-model special-casing beyond the model/serializer pair.
"""
from django.db import models

from core.models.base import TimeStampedModel
from core.upload_validation import image_upload_validators
from core.utils.storage_paths import scoped_upload_path


class SiteContentBase(TimeStampedModel):
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True
        ordering = ["order", "id"]


def news_article_image_upload_to(instance, filename):
    return scoped_upload_path("news", filename)


def gallery_item_image_upload_to(instance, filename):
    return scoped_upload_path("gallery", filename)


def testimonial_image_upload_to(instance, filename):
    return scoped_upload_path("testimonials", filename)


def program_image_upload_to(instance, filename):
    return scoped_upload_path("programs", filename)


def core_value_image_upload_to(instance, filename):
    return scoped_upload_path("core-values", filename)


def history_milestone_image_upload_to(instance, filename):
    return scoped_upload_path("history", filename)


def student_life_activity_image_upload_to(instance, filename):
    return scoped_upload_path("student-life", filename)


def field_trip_image_upload_to(instance, filename):
    return scoped_upload_path("field-trips", filename)


def wellbeing_support_image_upload_to(instance, filename):
    return scoped_upload_path("wellbeing", filename)


def admission_faq_image_upload_to(instance, filename):
    return scoped_upload_path("admission-faqs", filename)


class NewsArticle(SiteContentBase):
    CATEGORY_CHOICES = [
        ("academics", "Academics"),
        ("events", "Events"),
        ("achievements", "Achievements"),
        ("community", "Community"),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    excerpt = models.CharField(max_length=500)
    body = models.TextField()
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default="academics"
    )
    published_date = models.DateField()
    image = models.ImageField(
        upload_to=news_article_image_upload_to,
        null=True,
        blank=True,
        validators=image_upload_validators(),
    )

    class Meta(SiteContentBase.Meta):
        unique_together = ("slug",)

    def __str__(self):
        return self.title


class GalleryItem(SiteContentBase):
    CATEGORY_CHOICES = [
        ("campus", "Campus"),
        ("academics", "Academics"),
        ("sports", "Sports"),
        ("culture", "Culture"),
        ("events", "Events"),
    ]

    caption = models.CharField(max_length=255)
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default="campus"
    )
    image = models.ImageField(
        upload_to=gallery_item_image_upload_to,
        validators=image_upload_validators(),
    )

    def __str__(self):
        return self.caption


class Testimonial(SiteContentBase):
    quote = models.TextField()
    name = models.CharField(max_length=150)
    role = models.CharField(max_length=150)
    image = models.ImageField(
        upload_to=testimonial_image_upload_to,
        null=True,
        blank=True,
        validators=image_upload_validators(),
    )

    def __str__(self):
        return f"{self.name} ({self.role})"


class Program(SiteContentBase):
    ICON_CHOICES = [
        ("book", "Book"),
        ("flask", "Flask"),
        ("palette", "Palette"),
        ("trophy", "Trophy"),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    icon = models.CharField(max_length=20, choices=ICON_CHOICES, default="book")
    image = models.ImageField(
        upload_to=program_image_upload_to,
        null=True,
        blank=True,
        validators=image_upload_validators(),
    )

    def __str__(self):
        return self.title


class CoreValue(SiteContentBase):
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(
        upload_to=core_value_image_upload_to,
        null=True,
        blank=True,
        validators=image_upload_validators(),
    )

    def __str__(self):
        return self.title


class HistoryMilestone(SiteContentBase):
    # e.g. "2058 B.S." — not numeric, so a plain label field, not a year int.
    year = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(
        upload_to=history_milestone_image_upload_to,
        null=True,
        blank=True,
        validators=image_upload_validators(),
    )

    def __str__(self):
        return f"{self.year} — {self.title}"


class StudentLifeActivity(SiteContentBase):
    CATEGORY_CHOICES = [
        ("clubs", "Clubs"),
        ("sports", "Sports"),
        ("arts", "Arts"),
        ("leadership", "Leadership"),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default="clubs"
    )
    image = models.ImageField(
        upload_to=student_life_activity_image_upload_to,
        null=True,
        blank=True,
        validators=image_upload_validators(),
    )

    def __str__(self):
        return self.name


class FieldTrip(SiteContentBase):
    title = models.CharField(max_length=200)
    description = models.TextField()
    grade_band = models.CharField(max_length=100)
    image = models.ImageField(
        upload_to=field_trip_image_upload_to,
        null=True,
        blank=True,
        validators=image_upload_validators(),
    )

    def __str__(self):
        return self.title


class WellbeingSupport(SiteContentBase):
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(
        upload_to=wellbeing_support_image_upload_to,
        null=True,
        blank=True,
        validators=image_upload_validators(),
    )

    def __str__(self):
        return self.title


class AdmissionFaq(SiteContentBase):
    question = models.CharField(max_length=300)
    answer = models.TextField()
    image = models.ImageField(
        upload_to=admission_faq_image_upload_to,
        null=True,
        blank=True,
        validators=image_upload_validators(),
    )

    def __str__(self):
        return self.question
