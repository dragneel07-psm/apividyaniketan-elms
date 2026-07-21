import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academic", "0017_schoolevent"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0001_initial"),
    ]

    operations = [
        # ── Asset ────────────────────────────────────────────────────────────
        migrations.CreateModel(
            name="Asset",
            fields=[
                (
                    "asset_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=200)),
                ("asset_tag", models.CharField(blank=True, max_length=60)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("electronics", "Electronics"),
                            ("furniture", "Furniture"),
                            ("lab_equipment", "Lab Equipment"),
                            ("sports", "Sports Equipment"),
                            ("books", "Books / Library"),
                            ("vehicles", "Vehicles"),
                            ("other", "Other"),
                        ],
                        default="other",
                        max_length=20,
                    ),
                ),
                ("description", models.TextField(blank=True)),
                ("serial_number", models.CharField(blank=True, max_length=100)),
                ("brand", models.CharField(blank=True, max_length=100)),
                ("model_number", models.CharField(blank=True, max_length=100)),
                ("purchase_date", models.DateField(blank=True, null=True)),
                (
                    "purchase_price",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=10, null=True
                    ),
                ),
                ("warranty_expiry", models.DateField(blank=True, null=True)),
                ("location", models.CharField(blank=True, max_length=200)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("available", "Available"),
                            ("in_use", "In Use"),
                            ("maintenance", "Under Maintenance"),
                            ("retired", "Retired"),
                            ("lost", "Lost / Stolen"),
                        ],
                        default="available",
                        max_length=20,
                    ),
                ),
                (
                    "condition",
                    models.CharField(
                        choices=[
                            ("new", "New"),
                            ("good", "Good"),
                            ("fair", "Fair"),
                            ("poor", "Poor"),
                        ],
                        default="good",
                        max_length=10,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "tenant",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="assets",
                        to="core.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["category", "name"],
                "indexes": [
                    models.Index(
                        fields=["tenant", "category"], name="asset_tenant_cat_idx"
                    ),
                    models.Index(
                        fields=["tenant", "status"], name="asset_tenant_status_idx"
                    ),
                ],
            },
        ),
        # ── AssetAssignment ──────────────────────────────────────────────────
        migrations.CreateModel(
            name="AssetAssignment",
            fields=[
                (
                    "assignment_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("assigned_to_location", models.CharField(blank=True, max_length=200)),
                ("assigned_date", models.DateField()),
                ("expected_return_date", models.DateField(blank=True, null=True)),
                ("actual_return_date", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "asset",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="assignments",
                        to="academic.asset",
                    ),
                ),
                (
                    "assigned_to_user",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="asset_assignments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-assigned_date"],
                "indexes": [
                    models.Index(
                        fields=["asset", "is_active"],
                        name="assignment_asset_active_idx",
                    ),
                ],
            },
        ),
        # ── MaintenanceRequest ───────────────────────────────────────────────
        migrations.CreateModel(
            name="MaintenanceRequest",
            fields=[
                (
                    "request_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Open"),
                            ("in_progress", "In Progress"),
                            ("resolved", "Resolved"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="open",
                        max_length=20,
                    ),
                ),
                (
                    "priority",
                    models.CharField(
                        choices=[
                            ("low", "Low"),
                            ("medium", "Medium"),
                            ("high", "High"),
                            ("critical", "Critical"),
                        ],
                        default="medium",
                        max_length=10,
                    ),
                ),
                (
                    "estimated_cost",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=10, null=True
                    ),
                ),
                (
                    "actual_cost",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=10, null=True
                    ),
                ),
                ("resolution_notes", models.TextField(blank=True)),
                ("reported_date", models.DateField(auto_now_add=True)),
                ("resolved_date", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "asset",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="maintenance_requests",
                        to="academic.asset",
                    ),
                ),
                (
                    "reported_by",
                    models.ForeignKey(
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reported_maintenance",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="maintenance_requests",
                        to="core.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["-reported_date", "-created_at"],
                "indexes": [
                    models.Index(
                        fields=["tenant", "status"], name="maint_tenant_status_idx"
                    ),
                ],
            },
        ),
        # ── ConsumableStock ──────────────────────────────────────────────────
        migrations.CreateModel(
            name="ConsumableStock",
            fields=[
                (
                    "stock_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=200)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("electronics", "Electronics"),
                            ("furniture", "Furniture"),
                            ("lab_equipment", "Lab Equipment"),
                            ("sports", "Sports Equipment"),
                            ("books", "Books / Library"),
                            ("vehicles", "Vehicles"),
                            ("other", "Other"),
                        ],
                        default="other",
                        max_length=20,
                    ),
                ),
                (
                    "unit",
                    models.CharField(
                        choices=[
                            ("pcs", "Pieces"),
                            ("box", "Boxes"),
                            ("ream", "Reams"),
                            ("litre", "Litres"),
                            ("kg", "Kilograms"),
                            ("set", "Sets"),
                            ("other", "Other"),
                        ],
                        default="pcs",
                        max_length=10,
                    ),
                ),
                (
                    "current_quantity",
                    models.DecimalField(decimal_places=2, default=0, max_digits=10),
                ),
                (
                    "minimum_quantity",
                    models.DecimalField(decimal_places=2, default=0, max_digits=10),
                ),
                ("location", models.CharField(blank=True, max_length=200)),
                ("notes", models.TextField(blank=True)),
                ("last_restocked", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "tenant",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="consumable_stocks",
                        to="core.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["category", "name"],
                "indexes": [
                    models.Index(fields=["tenant"], name="stock_tenant_idx"),
                ],
            },
        ),
    ]
