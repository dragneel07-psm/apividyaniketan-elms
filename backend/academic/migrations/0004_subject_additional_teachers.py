from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academic", "0003_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="subject",
            name="additional_teachers",
            field=models.ManyToManyField(
                blank=True,
                related_name="additional_subjects",
                to="academic.teacher",
            ),
        ),
    ]
