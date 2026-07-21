import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("core", "0001_initial"),
        ("academic", "__first__"),
    ]

    operations = [
        migrations.CreateModel(
            name="Route",
            fields=[
                (
                    "route_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="transport_routes",
                        to="core.tenant",
                    ),
                ),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
                (
                    "stops",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text='[{"name":"Lagankhel","order":1,"pickup_time":"07:20"}]',
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Vehicle",
            fields=[
                (
                    "vehicle_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="transport_vehicles",
                        to="core.tenant",
                    ),
                ),
                ("plate_number", models.CharField(max_length=20)),
                ("model", models.CharField(blank=True, max_length=80)),
                ("capacity", models.PositiveSmallIntegerField(default=30)),
                ("driver_name", models.CharField(blank=True, max_length=100)),
                ("driver_phone", models.CharField(blank=True, max_length=20)),
                (
                    "route",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="vehicles",
                        to="transport.route",
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["plate_number"],
            },
        ),
        migrations.CreateModel(
            name="StudentTransportAssignment",
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
                (
                    "tenant",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="transport_assignments",
                        to="core.tenant",
                    ),
                ),
                (
                    "student",
                    models.OneToOneField(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="transport_assignment",
                        to="academic.student",
                    ),
                ),
                (
                    "route",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="student_assignments",
                        to="transport.route",
                    ),
                ),
                (
                    "vehicle",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="assigned_students",
                        to="transport.vehicle",
                    ),
                ),
                ("pickup_stop", models.CharField(blank=True, max_length=100)),
                (
                    "monthly_fee",
                    models.DecimalField(decimal_places=2, default=0, max_digits=10),
                ),
                ("active_from", models.DateField()),
                ("active_until", models.DateField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="studenttransportassignment",
            index=models.Index(
                fields=["tenant", "is_active"],
                name="transport_assign_tenant_active_idx",
            ),
        ),
    ]
