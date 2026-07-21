# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging

from django.utils import timezone
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from academic.models.complaint import Complaint

logger = logging.getLogger(__name__)


class ComplaintSerializer(drf_serializers.ModelSerializer):
    submitted_by_name = drf_serializers.SerializerMethodField()
    assigned_to_name = drf_serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = [
            "complaint_id",
            "category",
            "title",
            "description",
            "anonymous",
            "status",
            "priority",
            "submitted_by",
            "submitted_by_name",
            "assigned_to",
            "assigned_to_name",
            "resolution_note",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "complaint_id",
            "submitted_by",
            "status",
            "resolved_at",
            "created_at",
            "updated_at",
        ]

    def get_submitted_by_name(self, obj):
        if obj.anonymous or not obj.submitted_by:
            return "Anonymous"
        return f"{obj.submitted_by.first_name} {obj.submitted_by.last_name}".strip()

    def get_assigned_to_name(self, obj):
        if not obj.assigned_to:
            return None
        return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()


class ComplaintViewSet(viewsets.ModelViewSet):
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", "student")
        schema = getattr(getattr(user, "tenant", None), "schema_name", "")
        qs = Complaint.objects.filter(tenant_schema=schema)

        if role in ("admin", "staff", "principal"):
            status_filter = self.request.query_params.get("status")
            category_filter = self.request.query_params.get("category")
            if status_filter:
                qs = qs.filter(status=status_filter)
            if category_filter:
                qs = qs.filter(category=category_filter)
            return qs

        # Parents and students only see their own complaints
        return qs.filter(submitted_by=user)

    def perform_create(self, serializer):
        user = self.request.user
        schema = getattr(getattr(user, "tenant", None), "schema_name", "")
        serializer.save(submitted_by=user, tenant_schema=schema)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        complaint = self.get_object()
        note = request.data.get("resolution_note", "")
        if not note:
            return Response({"error": "resolution_note is required."}, status=400)
        complaint.status = "resolved"
        complaint.resolution_note = note
        complaint.resolved_at = timezone.now()
        complaint.save()
        _notify_complaint(complaint, "resolved", note)
        return Response(ComplaintSerializer(complaint).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        complaint = self.get_object()
        assigned_to_id = request.data.get("assigned_to")
        complaint.assigned_to_id = assigned_to_id
        complaint.status = "in_progress"
        complaint.save()
        _notify_complaint(complaint, "assigned")
        return Response(ComplaintSerializer(complaint).data)


def _notify_complaint(complaint, event: str, note: str = ""):
    """Notify the complaint submitter when their complaint is assigned or resolved."""
    try:
        if not complaint.submitted_by or complaint.anonymous:
            return
        from notifications.services import NotificationService

        user = complaint.submitted_by
        tenant = getattr(user, "tenant", None)
        if event == "resolved":
            title = "✅ Complaint Resolved"
            message = (
                f"Your complaint '{complaint.title}' has been resolved. Note: {note}"
            )
        else:
            title = "🔄 Complaint In Progress"
            message = f"Your complaint '{complaint.title}' has been assigned and is now in progress."
        NotificationService.create_notification(
            recipient=user,
            title=title,
            message=message,
            tenant=tenant,
            link="/student/complaints",
        )
    except Exception as exc:
        logger.warning("Complaint notification failed: %s", exc)
