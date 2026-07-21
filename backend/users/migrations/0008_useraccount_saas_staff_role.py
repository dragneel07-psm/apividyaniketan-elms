# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import django.db.models.deletion
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_useraccount_login_lockout"),
    ]

    operations = [
        migrations.AlterField(
            model_name="useraccount",
            name="role",
            field=__import__("django.db.models", fromlist=["CharField"]).CharField(
                choices=[
                    ("student", "Student"),
                    ("teacher", "Teacher"),
                    ("parent", "Parent"),
                    ("admin", "Admin"),
                    ("staff", "Staff"),
                    ("saas_admin", "SaaS Admin"),
                    ("saas_staff", "SaaS Staff"),
                ],
                default="student",
                max_length=20,
            ),
        ),
    ]
