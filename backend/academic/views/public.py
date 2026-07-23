# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Public (AllowAny), throttled endpoints for the school marketing site
(/school/*). Single-tenant deployment — there's exactly one school, so
these just need permission_classes and a throttle scope, no tenant
resolution.
"""
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..models import AdmissionEnquiry
from ..models.event import SchoolEvent
from ..models.notice import Notice
from ..serializers.notice import NoticeSerializer
from .events import SchoolEventSerializer


class PublicAdmissionEnquirySerializer(serializers.ModelSerializer):
    """Slim, write-only projection for the public "Apply Now" form."""

    honeypot = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = AdmissionEnquiry
        fields = [
            "first_name",
            "last_name",
            "guardian_name",
            "email",
            "phone_number",
            "desired_class",
            "desired_section_name",
            "notes",
            "honeypot",
        ]

    def validate_honeypot(self, value):
        if value:
            # Bots fill every field; real visitors never see this one
            # (hidden via CSS on the form). Reject silently as if invalid.
            raise serializers.ValidationError("Invalid submission.")
        return value

    def create(self, validated_data):
        validated_data.pop("honeypot", None)
        validated_data["source"] = "website"
        return AdmissionEnquiry.objects.create(**validated_data)


class PublicAdmissionEnquiryRateThrottle(ScopedRateThrottle):
    scope = "public_admission_enquiry"


class PublicAdmissionEnquiryView(APIView):
    """POST /api/academic/public-admissions/ — the website's Apply Now form."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicAdmissionEnquiryRateThrottle]

    def post(self, request):
        serializer = PublicAdmissionEnquirySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enquiry = serializer.save()
        return Response(
            {
                "detail": "Thank you — your application has been received. Our admissions team will contact you soon.",
                "reference": str(enquiry.enquiry_id)[:8].upper(),
            },
            status=status.HTTP_201_CREATED,
        )


class PublicNoticeRateThrottle(ScopedRateThrottle):
    scope = "public_notices"


class PublicNoticeListView(APIView):
    """GET /api/academic/public-notices/ — school-wide notices for visitors."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicNoticeRateThrottle]

    def get(self, request):
        today = timezone.localdate()
        notices = (
            Notice.objects.filter(target_audience="school")
            .filter(Q(expiry_date__isnull=True) | Q(expiry_date__gte=today))
            .order_by("-published_date")[:20]
        )
        data = NoticeSerializer(notices, many=True, context={"request": request}).data
        return Response(data)


class PublicEventRateThrottle(ScopedRateThrottle):
    scope = "public_events"


class PublicEventListView(APIView):
    """GET /api/academic/public-events/ — upcoming/recent public calendar."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicEventRateThrottle]

    def get(self, request):
        window_start = timezone.localdate() - timedelta(days=14)
        qs = SchoolEvent.objects.filter(
            audience="all", start_date__gte=window_start
        ).order_by("start_date", "start_time")
        event_id = request.query_params.get("id")
        if event_id:
            qs = qs.filter(event_id=event_id)
        data = SchoolEventSerializer(qs, many=True).data
        return Response(data)
