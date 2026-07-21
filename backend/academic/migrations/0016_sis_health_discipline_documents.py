import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academic", "0015_parentteachermeeting"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0001_initial"),
    ]

    operations = [
        # ── StudentHealthRecord ──────────────────────────────────────────────
        migrations.CreateModel(
            name="StudentHealthRecord",
            fields=[
                (
                    "health_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "blood_group",
                    models.CharField(
                        choices=[
                            ("A+", "A+"),
                            ("A-", "A-"),
                            ("B+", "B+"),
                            ("B-", "B-"),
                            ("AB+", "AB+"),
                            ("AB-", "AB-"),
                            ("O+", "O+"),
                            ("O-", "O-"),
                            ("unknown", "Unknown"),
                        ],
                        default="unknown",
                        max_length=10,
                    ),
                ),
                (
                    "height_cm",
                    models.DecimalField(
                        blank=True, decimal_places=1, max_digits=5, null=True
                    ),
                ),
                (
                    "weight_kg",
                    models.DecimalField(
                        blank=True, decimal_places=1, max_digits=5, null=True
                    ),
                ),
                ("allergies", models.TextField(blank=True)),
                ("chronic_conditions", models.TextField(blank=True)),
                ("current_medications", models.TextField(blank=True)),
                ("immunization_notes", models.TextField(blank=True)),
                (
                    "emergency_contact_name",
                    models.CharField(blank=True, max_length=150),
                ),
                (
                    "emergency_contact_phone",
                    models.CharField(blank=True, max_length=20),
                ),
                (
                    "emergency_contact_relation",
                    models.CharField(blank=True, max_length=50),
                ),
                ("doctor_name", models.CharField(blank=True, max_length=150)),
                ("doctor_phone", models.CharField(blank=True, max_length=20)),
                ("insurance_provider", models.CharField(blank=True, max_length=100)),
                ("insurance_number", models.CharField(blank=True, max_length=60)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "student",
                    models.OneToOneField(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="health_record",
                        to="academic.student",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="student_health_records",
                        to="core.tenant",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["tenant"], name="sis_health_tenant_idx")
                ]
            },
        ),
        # ── ImmunizationRecord ───────────────────────────────────────────────
        migrations.CreateModel(
            name="ImmunizationRecord",
            fields=[
                (
                    "immunization_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("vaccine_name", models.CharField(max_length=120)),
                ("date_administered", models.DateField(blank=True, null=True)),
                ("next_due_date", models.DateField(blank=True, null=True)),
                ("administered_by", models.CharField(blank=True, max_length=150)),
                ("remarks", models.CharField(blank=True, max_length=255)),
                (
                    "health_record",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="immunizations",
                        to="academic.studenthealthrecord",
                    ),
                ),
            ],
            options={"ordering": ["-date_administered"]},
        ),
        # ── DisciplinaryIncident ─────────────────────────────────────────────
        migrations.CreateModel(
            name="DisciplinaryIncident",
            fields=[
                (
                    "incident_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("incident_date", models.DateField()),
                (
                    "incident_type",
                    models.CharField(
                        choices=[
                            ("misconduct", "General Misconduct"),
                            ("bullying", "Bullying"),
                            ("cheating", "Cheating / Academic Dishonesty"),
                            ("property_damage", "Property Damage"),
                            ("verbal_abuse", "Verbal Abuse"),
                            ("physical_altercation", "Physical Altercation"),
                            ("attendance_violation", "Attendance Violation"),
                            ("other", "Other"),
                        ],
                        default="other",
                        max_length=30,
                    ),
                ),
                (
                    "severity",
                    models.CharField(
                        choices=[
                            ("low", "Low"),
                            ("medium", "Medium"),
                            ("high", "High"),
                        ],
                        default="low",
                        max_length=10,
                    ),
                ),
                ("description", models.TextField()),
                ("action_taken", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Open"),
                            ("resolved", "Resolved"),
                            ("escalated", "Escalated"),
                        ],
                        default="open",
                        max_length=15,
                    ),
                ),
                ("parent_notified", models.BooleanField(default=False)),
                ("parent_notified_at", models.DateTimeField(blank=True, null=True)),
                ("parent_response", models.TextField(blank=True)),
                ("follow_up_date", models.DateField(blank=True, null=True)),
                ("follow_up_notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "reported_by",
                    models.ForeignKey(
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reported_incidents",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="disciplinary_incidents",
                        to="academic.student",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="disciplinary_incidents",
                        to="core.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["-incident_date", "-created_at"],
                "indexes": [
                    models.Index(
                        fields=["tenant", "status"], name="sis_disc_tenant_status_idx"
                    ),
                    models.Index(
                        fields=["tenant", "student"], name="sis_disc_tenant_student_idx"
                    ),
                    models.Index(fields=["incident_date"], name="sis_disc_date_idx"),
                ],
            },
        ),
        # ── StudentDocument ──────────────────────────────────────────────────
        migrations.CreateModel(
            name="StudentDocument",
            fields=[
                (
                    "document_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "document_type",
                    models.CharField(
                        choices=[
                            ("transfer_certificate", "Transfer Certificate"),
                            ("character_certificate", "Character Certificate"),
                            ("bonafide_certificate", "Bonafide Certificate"),
                            ("fee_receipt_summary", "Fee Receipt Summary"),
                            ("custom", "Custom Document"),
                        ],
                        max_length=30,
                    ),
                ),
                ("document_number", models.CharField(blank=True, max_length=50)),
                ("issued_date", models.DateField()),
                ("reason", models.TextField(blank=True)),
                ("remarks", models.TextField(blank=True)),
                ("marks_as_transferred", models.BooleanField(default=False)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("is_cancelled", models.BooleanField(default=False)),
                ("cancellation_reason", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "issued_by",
                    models.ForeignKey(
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="issued_documents",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="documents",
                        to="academic.student",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="student_documents",
                        to="core.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["tenant", "document_type"],
                        name="sis_doc_tenant_type_idx",
                    ),
                    models.Index(
                        fields=["tenant", "student"], name="sis_doc_tenant_student_idx"
                    ),
                ],
            },
        ),
    ]
