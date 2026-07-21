# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.async_jobs import enqueue_job
from core.permissions import IsAdminOrStaff
from notifications.tasks import send_notification_task

from .models import Notification
from .serializers import NotificationSerializer

User = get_user_model()


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", "")
        tenant = getattr(self.request, "tenant", None)
        # Admins and staff can see all tenant notifications
        if role in ("admin", "staff", "saas_admin") and tenant:
            return Notification.objects.filter(tenant=tenant)
        return Notification.objects.filter(recipient=user)

    def perform_create(self, serializer):
        tenant = getattr(self.request, "tenant", None)
        serializer.save(tenant=tenant)

    @action(detail=False, methods=["GET"])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"count": count})

    @action(detail=True, methods=["POST"])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({"status": "marked as read"})

    @action(detail=False, methods=["POST"])
    def mark_all_as_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"status": "all marked as read"})

    @action(detail=False, methods=["POST"], url_path="dispatch")
    def enqueue_notification(self, request):
        recipient_id = str(request.data.get("recipient_id") or "").strip()
        title = str(request.data.get("title") or "").strip()
        message = str(request.data.get("message") or "").strip()
        link = request.data.get("link")
        channels = request.data.get("channels") or []

        if not recipient_id or not title or not message:
            return Response(
                {"detail": "recipient_id, title, and message are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(channels, list):
            return Response(
                {"detail": "channels must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant_schema = str(
            getattr(getattr(request, "tenant", None), "schema_name", "public")
        )
        job = enqueue_job(
            send_notification_task,
            tenant_schema=tenant_schema,
            recipient_id=recipient_id,
            title=title,
            message=message,
            link=link,
            channels=channels,
            job_name="notifications.send_notification",
            job_tenant_schema=tenant_schema,
        )
        return Response(job, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=["POST"], url_path="broadcast")
    def broadcast(self, request):
        """
        Bulk notify users by role or class.
        Body: { title, message, target: 'all'|'role'|'class', role?, class_id?, link? }
        Returns: { sent_count }
        """
        title = str(request.data.get("title") or "").strip()
        message = str(request.data.get("message") or "").strip()
        target = request.data.get("target", "all")
        role = request.data.get("role", "")
        class_id = request.data.get("class_id", "")
        link = request.data.get("link", "")

        if not title or not message:
            return Response(
                {"detail": "title and message are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant = getattr(request, "tenant", None)
        qs = User.objects.filter(is_active=True)
        if tenant:
            qs = qs.filter(tenant=tenant)

        if target == "role" and role:
            qs = qs.filter(role=role)
        elif target == "class" and class_id:
            # Notify students in the class and their parents + the class teacher
            qs = qs.filter(student_profile__academic_class_id=class_id) | qs.filter(
                parent_profile__children__academic_class_id=class_id
            )

        bulk = [
            Notification(
                recipient=user,
                tenant=tenant,
                title=title,
                message=message,
                link=link or None,
            )
            for user in qs.distinct()
        ]
        Notification.objects.bulk_create(bulk, ignore_conflicts=True)
        return Response({"sent_count": len(bulk)}, status=status.HTTP_200_OK)


from .models import NotificationTemplate
from .serializers import NotificationTemplateSerializer


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrStaff()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # Filter by tenant
        if hasattr(self.request, "tenant"):
            return NotificationTemplate.objects.filter(tenant=self.request.tenant)
        return NotificationTemplate.objects.none()

    def perform_create(self, serializer):
        tenant = getattr(self.request, "tenant", None)
        serializer.save(tenant=tenant)
