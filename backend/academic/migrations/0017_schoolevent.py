import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academic", "0016_sis_health_discipline_documents"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SchoolEvent",
            fields=[
                (
                    "event_id",
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
                    "event_type",
                    models.CharField(
                        choices=[
                            ("holiday", "Public Holiday"),
                            ("exam", "Examination"),
                            ("sports", "Sports Event"),
                            ("cultural", "Cultural Event"),
                            ("ptm", "Parent-Teacher Meeting"),
                            ("academic", "Academic Activity"),
                            ("meeting", "Staff Meeting"),
                            ("other", "Other"),
                        ],
                        default="other",
                        max_length=20,
                    ),
                ),
                (
                    "audience",
                    models.CharField(
                        choices=[
                            ("all", "Everyone"),
                            ("students", "Students"),
                            ("teachers", "Teachers"),
                            ("parents", "Parents"),
                            ("staff", "Staff Only"),
                        ],
                        default="all",
                        max_length=20,
                    ),
                ),
                ("start_date", models.DateField()),
                ("end_date", models.DateField()),
                ("start_time", models.TimeField(blank=True, null=True)),
                ("end_time", models.TimeField(blank=True, null=True)),
                ("is_all_day", models.BooleanField(default=True)),
                ("location", models.CharField(blank=True, max_length=200)),
                ("is_holiday", models.BooleanField(default=False)),
                ("color", models.CharField(blank=True, default="", max_length=7)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="school_events",
                        to="core.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["start_date", "start_time"],
                "indexes": [
                    models.Index(
                        fields=["tenant", "start_date"], name="event_tenant_start_idx"
                    ),
                    models.Index(
                        fields=["tenant", "event_type"], name="event_tenant_type_idx"
                    ),
                ],
            },
        ),
    ]
