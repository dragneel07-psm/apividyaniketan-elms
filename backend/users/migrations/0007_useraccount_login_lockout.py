from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0006_useraccount_staff_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="useraccount",
            name="failed_login_attempts",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="useraccount",
            name="locked_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
