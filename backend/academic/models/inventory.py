# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid

from django.db import models

ASSET_CATEGORY_CHOICES = [
    ("electronics", "Electronics"),
    ("furniture", "Furniture"),
    ("lab_equipment", "Lab Equipment"),
    ("sports", "Sports Equipment"),
    ("books", "Books / Library"),
    ("vehicles", "Vehicles"),
    ("other", "Other"),
]

ASSET_STATUS_CHOICES = [
    ("available", "Available"),
    ("in_use", "In Use"),
    ("maintenance", "Under Maintenance"),
    ("retired", "Retired"),
    ("lost", "Lost / Stolen"),
]

CONDITION_CHOICES = [
    ("new", "New"),
    ("good", "Good"),
    ("fair", "Fair"),
    ("poor", "Poor"),
]

MAINTENANCE_STATUS_CHOICES = [
    ("open", "Open"),
    ("in_progress", "In Progress"),
    ("resolved", "Resolved"),
    ("cancelled", "Cancelled"),
]

STOCK_UNIT_CHOICES = [
    ("pcs", "Pieces"),
    ("box", "Boxes"),
    ("ream", "Reams"),
    ("litre", "Litres"),
    ("kg", "Kilograms"),
    ("set", "Sets"),
    ("other", "Other"),
]


class Asset(models.Model):
    asset_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="assets",
        db_constraint=False,
    )
    name = models.CharField(max_length=200)
    asset_tag = models.CharField(max_length=60, blank=True)  # e.g. "COMP-0042"
    category = models.CharField(
        max_length=20, choices=ASSET_CATEGORY_CHOICES, default="other"
    )
    description = models.TextField(blank=True)
    serial_number = models.CharField(max_length=100, blank=True)
    brand = models.CharField(max_length=100, blank=True)
    model_number = models.CharField(max_length=100, blank=True)
    purchase_date = models.DateField(blank=True, null=True)
    purchase_price = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    warranty_expiry = models.DateField(blank=True, null=True)
    location = models.CharField(max_length=200, blank=True)  # room / building
    status = models.CharField(
        max_length=20, choices=ASSET_STATUS_CHOICES, default="available"
    )
    condition = models.CharField(
        max_length=10, choices=CONDITION_CHOICES, default="good"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "name"]
        indexes = [
            models.Index(fields=["tenant", "category"], name="asset_tenant_cat_idx"),
            models.Index(fields=["tenant", "status"], name="asset_tenant_status_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.asset_tag or self.asset_id})"


class AssetAssignment(models.Model):
    assignment_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    asset = models.ForeignKey(
        Asset, on_delete=models.CASCADE, related_name="assignments", db_constraint=False
    )
    assigned_to_user = models.ForeignKey(
        "users.UserAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="asset_assignments",
        db_constraint=False,
    )
    assigned_to_location = models.CharField(
        max_length=200, blank=True
    )  # room/dept if not a person
    assigned_date = models.DateField()
    expected_return_date = models.DateField(blank=True, null=True)
    actual_return_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-assigned_date"]
        indexes = [
            models.Index(
                fields=["asset", "is_active"], name="assignment_asset_active_idx"
            ),
        ]

    def __str__(self):
        target = self.assigned_to_user or self.assigned_to_location or "unassigned"
        return f"{self.asset} → {target}"


class MaintenanceRequest(models.Model):
    request_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="maintenance_requests",
        db_constraint=False,
    )
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name="maintenance_requests",
        db_constraint=False,
    )
    reported_by = models.ForeignKey(
        "users.UserAccount",
        on_delete=models.SET_NULL,
        null=True,
        related_name="reported_maintenance",
        db_constraint=False,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=MAINTENANCE_STATUS_CHOICES, default="open"
    )
    priority = models.CharField(
        max_length=10,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High"),
            ("critical", "Critical"),
        ],
        default="medium",
    )
    estimated_cost = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    actual_cost = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    resolution_notes = models.TextField(blank=True)
    reported_date = models.DateField(auto_now_add=True)
    resolved_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-reported_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status"], name="maint_tenant_status_idx"),
        ]

    def __str__(self):
        return f"{self.title} [{self.status}]"


class ConsumableStock(models.Model):
    stock_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="consumable_stocks",
        db_constraint=False,
    )
    name = models.CharField(max_length=200)
    category = models.CharField(
        max_length=20, choices=ASSET_CATEGORY_CHOICES, default="other"
    )
    unit = models.CharField(max_length=10, choices=STOCK_UNIT_CHOICES, default="pcs")
    current_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    minimum_quantity = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )  # reorder threshold
    location = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    last_restocked = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "name"]
        indexes = [
            models.Index(fields=["tenant"], name="stock_tenant_idx"),
        ]

    @property
    def is_low(self):
        return self.current_quantity <= self.minimum_quantity

    def __str__(self):
        return f"{self.name} ({self.current_quantity} {self.unit})"
