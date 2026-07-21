from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0005_useraccount_users_tenant_role_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="useraccount",
            name="staff_role",
            field=models.CharField(
                blank=True,
                choices=[
                    ("", "None"),
                    ("accountant", "Accountant"),
                    ("librarian", "Librarian"),
                    ("receptionist", "Receptionist"),
                    ("hr_manager", "HR Manager"),
                    ("hostel_warden", "Hostel Warden"),
                    ("transport_manager", "Transport Manager"),
                ],
                default="",
                max_length=30,
            ),
        ),
    ]
