from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academic", "0006_timetable_tt_class_day_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="lessonprogress",
            name="last_watched_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="lessonprogress",
            name="progress_percent",
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name="lessonprogress",
            name="video_duration_seconds",
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name="lessonprogress",
            name="video_watched_seconds",
            field=models.FloatField(default=0),
        ),
    ]
