import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academic", "0014_alter_lessonmaterial_file_alter_notice_attachment"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ParentTeacherMeeting",
            fields=[
                (
                    "meeting_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("requested_date", models.DateField()),
                (
                    "preferred_slot",
                    models.CharField(
                        choices=[
                            ("morning", "Morning (8am \u2013 12pm)"),
                            ("afternoon", "Afternoon (12pm \u2013 4pm)"),
                            ("evening", "Evening (4pm \u2013 7pm)"),
                        ],
                        default="morning",
                        max_length=20,
                    ),
                ),
                ("purpose", models.TextField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("confirmed", "Confirmed"),
                            ("cancelled", "Cancelled"),
                            ("completed", "Completed"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("confirmed_datetime", models.DateTimeField(blank=True, null=True)),
                ("meeting_link", models.URLField(blank=True)),
                ("meeting_notes", models.TextField(blank=True)),
                ("cancellation_reason", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "cancelled_by",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="cancelled_meetings",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "parent",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="meeting_requests",
                        to="academic.parent",
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="parent_meetings",
                        to="academic.student",
                    ),
                ),
                (
                    "teacher",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="parent_meetings",
                        to="academic.teacher",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["parent", "status"], name="acad_ptm_parent_status_idx"
                    ),
                    models.Index(
                        fields=["teacher", "status"], name="acad_ptm_teacher_status_idx"
                    ),
                    models.Index(fields=["requested_date"], name="acad_ptm_date_idx"),
                ],
            },
        ),
    ]
