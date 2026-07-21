# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from datetime import date

from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.mixins import TenantScopedQuerysetMixin
from core.utils.audit import record_audit_event

from ..models.event import SchoolEvent


class SchoolEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    event_type_display = serializers.CharField(
        source="get_event_type_display", read_only=True
    )
    audience_display = serializers.CharField(
        source="get_audience_display", read_only=True
    )

    class Meta:
        model = SchoolEvent
        fields = [
            "event_id",
            "title",
            "description",
            "event_type",
            "event_type_display",
            "audience",
            "audience_display",
            "start_date",
            "end_date",
            "start_time",
            "end_time",
            "is_all_day",
            "location",
            "is_holiday",
            "color",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["event_id", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class SchoolEventViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = SchoolEvent.objects.all()
    serializer_class = SchoolEventSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = "tenant"

    def get_queryset(self):
        qs = super().get_queryset().select_related("created_by")

        # Optional filters
        event_type = self.request.query_params.get("event_type")
        audience = self.request.query_params.get("audience")
        month = self.request.query_params.get("month")  # YYYY-MM
        year = self.request.query_params.get("year")  # YYYY
        upcoming = self.request.query_params.get("upcoming")

        if event_type:
            qs = qs.filter(event_type=event_type)
        if audience:
            qs = qs.filter(audience__in=[audience, "all"])
        if month:
            try:
                yr, mo = map(int, month.split("-"))
                qs = qs.filter(start_date__year=yr, start_date__month=mo)
            except (ValueError, AttributeError):
                pass
        if year:
            qs = qs.filter(start_date__year=year)
        if upcoming == "1":
            qs = qs.filter(start_date__gte=date.today()).order_by("start_date")[:20]

        return qs

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        event = serializer.save(tenant=tenant, created_by=self.request.user)
        record_audit_event(
            action="academic.event_created",
            user=self.request.user,
            request=self.request,
            details={
                "event_id": str(event.event_id),
                "title": event.title,
                "start_date": str(event.start_date),
            },
        )

    def perform_update(self, serializer):
        event = serializer.save()
        record_audit_event(
            action="academic.event_updated",
            user=self.request.user,
            request=self.request,
            details={"event_id": str(event.event_id), "title": event.title},
        )

    def perform_destroy(self, instance):
        record_audit_event(
            action="academic.event_deleted",
            user=self.request.user,
            request=self.request,
            details={"event_id": str(instance.event_id), "title": instance.title},
        )
        instance.delete()

    @action(detail=False, methods=["get"], url_path="upcoming")
    def upcoming(self, request):
        """Return next 10 upcoming events from today."""
        qs = (
            self.get_queryset()
            .filter(start_date__gte=date.today())
            .order_by("start_date")[:10]
        )
        return Response(SchoolEventSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="holidays")
    def holidays(self, request):
        """Return all holiday events for the current year."""
        qs = self.get_queryset().filter(
            is_holiday=True, start_date__year=date.today().year
        )
        return Response(SchoolEventSerializer(qs, many=True).data)
