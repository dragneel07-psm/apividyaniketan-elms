# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import models

from core.upload_validation import image_upload_validators
from core.utils.storage_paths import scoped_upload_path

from .base import TimeStampedModel


def school_logo_upload_to(instance, filename):
    return scoped_upload_path("school_logo", filename)


class SchoolProfile(TimeStampedModel):
    """
    Singleton — this app now serves exactly one school. Use
    SchoolProfile.get_solo() rather than querying/filtering.
    """

    name = models.CharField(max_length=255)
    address = models.TextField(blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    current_academic_year = models.CharField(max_length=20, default="2024-2025")
    established_year = models.IntegerField(blank=True, null=True)
    logo = models.ImageField(
        upload_to=school_logo_upload_to,
        blank=True,
        null=True,
        validators=image_upload_validators(),
    )

    # Tax & billing identity (Nepali school context — IRD-aligned receipts)
    pan_number = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="School PAN number printed on every tax invoice / receipt.",
    )
    vat_number = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="VAT registration number (only if school is VAT-registered).",
    )
    fiscal_year_bs = models.CharField(
        max_length=10,
        blank=True,
        default="",
        help_text='Current Bikram Sambat fiscal year, e.g. "2082/83". Used in bill numbering.',
    )
    currency_code = models.CharField(
        max_length=10,
        default="NPR",
        help_text="ISO currency code shown on receipts. Default NPR for Nepali schools.",
    )
    currency_symbol = models.CharField(
        max_length=8,
        default="Rs.",
        help_text='Short currency symbol on bills (e.g. "Rs.", "$").',
    )

    # Receipt signatories
    principal_name = models.CharField(max_length=120, blank=True, default="")
    accountant_name = models.CharField(max_length=120, blank=True, default="")

    # Bill book
    bill_prefix = models.CharField(
        max_length=10,
        default="BL",
        help_text='Prefix for sequential bill numbers, e.g. "BL" → BL-2082/83-00001.',
    )

    # Feature flags for optional modules (projects, parent fees, AI tutor, etc.).
    features = models.JSONField(
        default=dict,
        blank=True,
        help_text="Feature flags for optional modules, e.g. {'projects': True}.",
    )

    class Meta:
        verbose_name = "School Profile"
        verbose_name_plural = "School Profile"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def get_solo(cls) -> "SchoolProfile":
        obj, _ = cls.objects.get_or_create(pk=1, defaults={"name": "My School"})
        return obj

    def __str__(self):
        return self.name
