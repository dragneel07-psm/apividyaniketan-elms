# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0009_add_expo_push_token"),
    ]

    operations = [
        migrations.AddField(
            model_name="useraccount",
            name="saas_staff_role",
            field=models.CharField(
                max_length=30,
                choices=[
                    ("", "General"),
                    ("support", "Customer Support"),
                    ("billing", "Billing"),
                    ("schools_manager", "Schools Manager"),
                    ("reports", "Reports & Analytics"),
                ],
                blank=True,
                default="",
            ),
        ),
    ]
