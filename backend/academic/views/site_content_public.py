# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Public (AllowAny), throttled read endpoints for the admin-managed
marketing site content in models/site_content.py.
"""
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..models.site_content import (
    AdmissionFaq,
    CoreValue,
    FieldTrip,
    GalleryItem,
    HistoryMilestone,
    NewsArticle,
    Program,
    StudentLifeActivity,
    Testimonial,
    WellbeingSupport,
)
from ..serializers.site_content import (
    AdmissionFaqSerializer,
    CoreValueSerializer,
    FieldTripSerializer,
    GalleryItemSerializer,
    HistoryMilestoneSerializer,
    NewsArticleSerializer,
    ProgramSerializer,
    StudentLifeActivitySerializer,
    TestimonialSerializer,
    WellbeingSupportSerializer,
)


class PublicSiteContentRateThrottle(ScopedRateThrottle):
    scope = "public_site_content"


class PublicSiteContentListView(APIView):
    """GET /api/academic/public-<x>/ — active, admin-ordered."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicSiteContentRateThrottle]
    model = None
    serializer_class = None

    def get_queryset(self, request):
        return self.model.objects.filter(is_active=True)

    def get(self, request):
        qs = self.get_queryset(request)
        data = self.serializer_class(qs, many=True, context={"request": request}).data
        return Response(data)


class PublicNewsArticleListView(PublicSiteContentListView):
    model = NewsArticle
    serializer_class = NewsArticleSerializer

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        slug = request.query_params.get("slug")
        if slug:
            qs = qs.filter(slug=slug)
        return qs


class PublicGalleryItemListView(PublicSiteContentListView):
    model = GalleryItem
    serializer_class = GalleryItemSerializer


class PublicTestimonialListView(PublicSiteContentListView):
    model = Testimonial
    serializer_class = TestimonialSerializer


class PublicProgramListView(PublicSiteContentListView):
    model = Program
    serializer_class = ProgramSerializer


class PublicCoreValueListView(PublicSiteContentListView):
    model = CoreValue
    serializer_class = CoreValueSerializer


class PublicHistoryMilestoneListView(PublicSiteContentListView):
    model = HistoryMilestone
    serializer_class = HistoryMilestoneSerializer


class PublicStudentLifeActivityListView(PublicSiteContentListView):
    model = StudentLifeActivity
    serializer_class = StudentLifeActivitySerializer


class PublicFieldTripListView(PublicSiteContentListView):
    model = FieldTrip
    serializer_class = FieldTripSerializer


class PublicWellbeingSupportListView(PublicSiteContentListView):
    model = WellbeingSupport
    serializer_class = WellbeingSupportSerializer


class PublicAdmissionFaqListView(PublicSiteContentListView):
    model = AdmissionFaq
    serializer_class = AdmissionFaqSerializer
