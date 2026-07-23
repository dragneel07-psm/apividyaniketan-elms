# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db.models import Exists, OuterRef, Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from notifications.services import NotificationService

from ..models.notice import Notice, NoticeRead
from ..models.parent import Parent
from ..serializers.notice import NoticeSerializer


class NoticeViewSet(viewsets.ModelViewSet):
    queryset = Notice.objects.all()
    serializer_class = NoticeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _audience_filter(self, user):
        """Return a Q matching what this user can see, or None for unrestricted."""
        if user.role == "student":
            student_profile = getattr(user, "student_profile", None)
            if student_profile is None:
                return Q(pk__in=[])
            return (
                Q(target_audience="school")
                | Q(
                    target_audience="class", target_class=student_profile.academic_class
                )
                | Q(target_audience="student", target_student=student_profile)
            )
        if user.role == "parent":
            parent = (
                Parent.objects.prefetch_related("students").filter(user=user).first()
            )
            if parent is None:
                return Q(pk__in=[])
            child_class_ids = list(
                parent.students.values_list("academic_class_id", flat=True)
            )
            child_ids = list(parent.students.values_list("pk", flat=True))
            return (
                Q(target_audience="school")
                | Q(target_audience="class", target_class_id__in=child_class_ids)
                | Q(target_audience="student", target_student_id__in=child_ids)
            )
        if user.role in ("teacher", "admin", "saas_admin"):
            return None
        return Q(pk__in=[])

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        audience = self._audience_filter(user)
        if audience is not None:
            queryset = queryset.filter(audience)

        # Annotate is_read so the serializer can expose it without N+1 queries.
        read_subquery = NoticeRead.objects.filter(notice=OuterRef("pk"), user=user)
        return queryset.annotate(_is_read=Exists(read_subquery))

    def perform_create(self, serializer):
        notice = serializer.save()

        try:
            if notice.target_audience == "school":
                NotificationService.notify_role(
                    "student", f"New Notice: {notice.title}", notice.content
                )
                NotificationService.notify_role(
                    "teacher", f"New Notice: {notice.title}", notice.content
                )
            elif notice.target_audience == "class" and notice.target_class:
                NotificationService.notify_class(
                    notice.target_class,
                    f"Class Notice: {notice.title}",
                    notice.content,
                )
            elif notice.target_audience == "student" and notice.target_student:
                NotificationService.create_notification(
                    notice.target_student.user,
                    f"Personal Notice: {notice.title}",
                    notice.content,
                )
        except Exception as e:
            # Don't let notification failures block notice creation.
            print(f"Error sending notifications: {e}")

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        """Idempotently mark this notice as read by the current user."""
        notice = self.get_object()
        NoticeRead.objects.get_or_create(
            notice=notice,
            user=request.user,
        )
        return Response({"status": "ok", "is_read": True})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """Return how many notices the current user hasn't opened yet."""
        queryset = self.get_queryset()
        count = queryset.filter(_is_read=False).count()
        return Response({"count": count})
