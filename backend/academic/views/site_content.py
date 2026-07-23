# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""Admin-only CRUD for the public marketing site's manageable content."""
from rest_framework import permissions, viewsets

from core.mixins import TenantScopedQuerysetMixin
from core.permissions import IsAdminOrStaff

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


class SiteContentViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    """Shared admin-only CRUD behavior for every site-content type below."""

    permission_classes = [permissions.IsAuthenticated, IsAdminOrStaff]


class NewsArticleViewSet(SiteContentViewSet):
    queryset = NewsArticle.objects.all()
    serializer_class = NewsArticleSerializer


class GalleryItemViewSet(SiteContentViewSet):
    queryset = GalleryItem.objects.all()
    serializer_class = GalleryItemSerializer


class TestimonialViewSet(SiteContentViewSet):
    queryset = Testimonial.objects.all()
    serializer_class = TestimonialSerializer


class ProgramViewSet(SiteContentViewSet):
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer


class CoreValueViewSet(SiteContentViewSet):
    queryset = CoreValue.objects.all()
    serializer_class = CoreValueSerializer


class HistoryMilestoneViewSet(SiteContentViewSet):
    queryset = HistoryMilestone.objects.all()
    serializer_class = HistoryMilestoneSerializer


class StudentLifeActivityViewSet(SiteContentViewSet):
    queryset = StudentLifeActivity.objects.all()
    serializer_class = StudentLifeActivitySerializer


class FieldTripViewSet(SiteContentViewSet):
    queryset = FieldTrip.objects.all()
    serializer_class = FieldTripSerializer


class WellbeingSupportViewSet(SiteContentViewSet):
    queryset = WellbeingSupport.objects.all()
    serializer_class = WellbeingSupportSerializer


class AdmissionFaqViewSet(SiteContentViewSet):
    queryset = AdmissionFaq.objects.all()
    serializer_class = AdmissionFaqSerializer
