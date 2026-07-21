# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Backfill tenant.features['projects'] = True for every existing tenant.

Project tracking is treated as baseline LMS functionality (matches the
`student_gamification` pattern in build_plan_entitled_features), so
every tenant gets it. New tenants pick this up automatically through
build_plan_entitled_features; this migration only patches existing rows.
"""

from django.db import migrations


def _enable_projects_for_all(apps, schema_editor):
    Tenant = apps.get_model("core", "Tenant")
    for tenant in Tenant.objects.all():
        features = dict(tenant.features or {})
        if features.get("projects") is True:
            continue
        features["projects"] = True
        tenant.features = features
        tenant.save(update_fields=["features"])


def _disable_projects_for_all(apps, schema_editor):
    # Reversal removes the key but leaves the rest of the features dict alone.
    Tenant = apps.get_model("core", "Tenant")
    for tenant in Tenant.objects.all():
        features = dict(tenant.features or {})
        if "projects" not in features:
            continue
        features.pop("projects", None)
        tenant.features = features
        tenant.save(update_fields=["features"])


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0008_job"),
    ]

    operations = [
        migrations.RunPython(_enable_projects_for_all, _disable_projects_for_all),
    ]
