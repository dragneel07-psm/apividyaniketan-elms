# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.db import models
from django_tenants.models import DomainMixin, TenantMixin

from core.upload_validation import image_upload_validators
from core.utils.storage_paths import tenant_scoped_upload_path

from .base import TimeStampedModel


def tenant_logo_upload_to(instance, filename):
    return tenant_scoped_upload_path(
        getattr(instance, "schema_name", None), "tenant_logos", filename
    )


class Tenant(TenantMixin, TimeStampedModel):
    name = models.CharField(max_length=255)
    subdomain = models.CharField(max_length=100, unique=True, null=True, blank=True)

    TYPE_CHOICES = (
        ("standard", "Standard"),
        ("premium", "Premium"),
        ("enterprise", "Enterprise"),
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="standard")
    status = models.CharField(max_length=20, default="active")

    # Profile & Settings
    address = models.TextField(blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    current_academic_year = models.CharField(max_length=20, default="2024-2025")
    established_year = models.IntegerField(blank=True, null=True)
    logo = models.ImageField(
        upload_to=tenant_logo_upload_to,
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

    # Feature Flags for SaaS Admin to control tenant capabilities.
    # `features` is the *effective* dict (plan baseline merged with overrides) and
    # is recomputed on every save via sync_tenant_with_plan.
    features = models.JSONField(
        default=dict,
        blank=True,
        help_text="Effective feature flags for this tenant. Computed from the plan + feature_overrides; do not edit directly.",
    )

    # Per-tenant feature overrides. Wins over plan entitlements during sync,
    # so SaaS admins can flip a feature for one school without changing its
    # plan. Empty dict means "use plan defaults".
    feature_overrides = models.JSONField(
        default=dict,
        blank=True,
        help_text="Per-tenant overrides that win over plan entitlements, e.g., {'projects': False}.",
    )

    # default true, schema will be automatically created and synced when it is saved
    auto_create_schema = True

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    pass
