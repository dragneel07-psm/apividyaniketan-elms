# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class UserAccount(AbstractUser):
    ROLE_CHOICES = (
        ("student", "Student"),
        ("teacher", "Teacher"),
        ("parent", "Parent"),
        ("admin", "Admin"),
        ("staff", "Staff"),
        ("saas_admin", "SaaS Admin"),
        ("saas_staff", "SaaS Staff"),
    )

    # Distinguishes different staff functions within the school
    STAFF_ROLE_CHOICES = (
        ("", "None"),
        ("accountant", "Accountant"),
        ("librarian", "Librarian"),
        ("receptionist", "Receptionist"),
        ("hr_manager", "HR Manager"),
        ("hostel_warden", "Hostel Warden"),
        ("transport_manager", "Transport Manager"),
    )

    # Sub-roles for SaaS staff (separate from school staff_role)
    SAAS_STAFF_ROLE_CHOICES = (
        ("", "General"),
        ("support", "Customer Support"),
        ("billing", "Billing"),
        ("schools_manager", "Schools Manager"),
        ("reports", "Reports & Analytics"),
    )

    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Circular import risk if we import Tenant directly?
    # Use string reference 'core.Tenant'.
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_constraint=False,
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")
    staff_role = models.CharField(
        max_length=30, choices=STAFF_ROLE_CHOICES, blank=True, default=""
    )
    saas_staff_role = models.CharField(
        max_length=30, choices=SAAS_STAFF_ROLE_CHOICES, blank=True, default=""
    )

    # Extended Profile Fields
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)

    # Two-Factor Authentication
    is_2fa_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=255, blank=True, null=True)

    # Login lockout tracking
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    # Expo push notifications
    expo_push_token = models.CharField(max_length=200, blank=True, null=True)

    # Use email as the login field
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, db_index=True)
    last_name = models.CharField(max_length=150, db_index=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta(AbstractUser.Meta):
        indexes = [
            models.Index(fields=["tenant", "role"], name="users_tenant_role_idx"),
            models.Index(
                fields=["tenant", "is_active"], name="users_tenant_active_idx"
            ),
        ]
