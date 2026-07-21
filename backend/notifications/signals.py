# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db.models.signals import post_save
from django.dispatch import receiver

from academic.models import Notice
from users.models import UserAccount

from .models import Notification


def _push_notification_ws(notification: Notification):
    """
    Push a Notification to the recipient's WebSocket group via the channel layer.
    Safe to call from any sync context (signal handlers, Celery tasks).
    No-ops silently if the channel layer is unavailable or Redis is down.
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        from notifications.consumers import notification_group_name

        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        group = notification_group_name(notification.recipient_id)
        async_to_sync(channel_layer.group_send)(
            group,
            {
                "type": "send.notification",
                "id": str(notification.pk),
                "title": notification.title,
                "message": notification.message,
                "link": notification.link or "",
                "created_at": notification.created_at.isoformat(),
            },
        )
    except Exception:
        pass  # WebSocket push is best-effort; never block DB writes


@receiver(post_save, sender=Notification)
def push_notification_on_create(sender, instance, created, **kwargs):
    """Push every newly created Notification to the recipient's WebSocket."""
    if created:
        _push_notification_ws(instance)


@receiver(post_save, sender=Notice)
def create_notice_notification(sender, instance, created, **kwargs):
    if created:
        # 1. Target: Specific Student
        if instance.target_audience == "student" and instance.target_student:
            # Find the user associated with the student
            student_user = instance.target_student.user
            Notification.objects.create(
                recipient=student_user,
                title=f"New Notice: {instance.title}",
                message=instance.content[:200]
                + ("..." if len(instance.content) > 200 else ""),
                link="/student/notices",  # For student portal
                is_read=False,
            )

        # 2. Target: Specific Class
        elif instance.target_audience == "class" and instance.target_class:
            # Find all students in this class
            # Avoiding circular import by using instance relation
            students = instance.target_class.students.all()
            notifications = []
            for student in students:
                notifications.append(
                    Notification(
                        recipient=student.user,
                        title=f"Class Notice: {instance.title}",
                        message=instance.content[:200],
                        link="/student/notices",
                        is_read=False,
                    )
                )

            # Also notify teachers assigned to this class?
            # (User request was "notification should be seen in portal" - likely for teachers too if applicable)
            # For now, focusing on the request "Teacher dashboard... new notices published notification should be seen"
            # Since teachers CREATE the notices usually, they might not need notification for their own notice.
            # But if Admin creates a class notice, the teacher might want to know.

            Notification.objects.bulk_create(notifications)

        # 3. Target: Whole School
        elif instance.target_audience == "school":
            # This can be heavy. For now, let's limit to notifying active users or just skip if too many?
            # User requirement: "When new notices published notification should be seen"
            # Let's generate for now, assuming small scale.

            # Notify all users? Or just students/teachers?
            # Let's fetch all active users except the creator (logic for creator is hard here without request user)

            users = UserAccount.objects.filter(is_active=True)
            notifications = [
                Notification(
                    recipient=user,
                    title=f"School Notice: {instance.title}",
                    message=instance.content[:200],
                    link=(
                        "/student/notices"
                        if user.role == "student"
                        else "/teacher/notices"
                    ),
                    is_read=False,
                )
                for user in users
            ]
            Notification.objects.bulk_create(notifications)
