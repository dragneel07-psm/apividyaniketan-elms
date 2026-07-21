# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging

from django.db import models
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import HostelAllotment, HostelBlock, HostelRoom
from .serializers import (
    HostelAllotmentSerializer,
    HostelBlockSerializer,
    HostelRoomSerializer,
)

logger = logging.getLogger(__name__)


class TenantFilterMixin:
    def get_queryset(self):
        tenant = getattr(self.request.user, "tenant", None)
        if tenant is None:
            return self.queryset.model.objects.none()
        return self.queryset.filter(tenant=tenant)


class HostelBlockViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    serializer_class = HostelBlockSerializer
    permission_classes = [IsAuthenticated]
    queryset = HostelBlock.objects.prefetch_related("rooms__allotments").all()

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        serializer.save(tenant=tenant)

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        blocks = self.get_queryset().filter(is_active=True)
        total_capacity = sum(sum(r.capacity for r in b.rooms.all()) for b in blocks)
        total_occupied = HostelAllotment.objects.filter(
            tenant=request.user.tenant, is_active=True
        ).count()
        return Response(
            {
                "total_blocks": blocks.count(),
                "total_capacity": total_capacity,
                "total_occupied": total_occupied,
                "available_beds": total_capacity - total_occupied,
                "occupancy_rate": (
                    round(total_occupied / total_capacity * 100, 1)
                    if total_capacity
                    else 0
                ),
            }
        )


class HostelRoomViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    serializer_class = HostelRoomSerializer
    permission_classes = [IsAuthenticated]
    queryset = (
        HostelRoom.objects.select_related("block").prefetch_related("allotments").all()
    )

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        serializer.save(tenant=tenant)

    def get_queryset(self):
        qs = super().get_queryset()
        block_id = self.request.query_params.get("block")
        if block_id:
            qs = qs.filter(block__block_id=block_id)
        available_only = self.request.query_params.get("available")
        if available_only == "true":
            from django.db.models import Count, Q

            qs = qs.annotate(
                occ=Count("allotments", filter=Q(allotments__is_active=True))
            ).filter(occ__lt=models.F("capacity"))
        return qs


class HostelAllotmentViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    serializer_class = HostelAllotmentSerializer
    permission_classes = [IsAuthenticated]
    queryset = HostelAllotment.objects.select_related(
        "student__user", "room__block"
    ).all()

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        allotment = serializer.save(tenant=tenant)
        self._create_hostel_fee(allotment, tenant)

    def _create_hostel_fee(self, allotment, tenant):
        """Auto-generate a pending StudentFee for the room's monthly_fee."""
        try:
            monthly_fee = allotment.room.monthly_fee
            if not monthly_fee or monthly_fee <= 0:
                return
            import datetime

            from billing.models_school import FeeStructure, StudentFee

            # Find or create a hostel fee structure for this tenant
            fee_structure, _ = FeeStructure.objects.get_or_create(
                tenant=tenant,
                name="Hostel Fee",
                defaults={
                    "amount": monthly_fee,
                    "fee_type": "hostel",
                    "academic_year": str(datetime.date.today().year),
                },
            )
            due_date = (
                allotment.check_in_date.replace(day=1)
                if hasattr(allotment.check_in_date, "replace")
                else datetime.date.today().replace(day=1)
            )
            StudentFee.objects.get_or_create(
                tenant=tenant,
                student=allotment.student,
                fee_structure=fee_structure,
                due_date=due_date,
                defaults={
                    "amount_due": monthly_fee,
                    "amount_paid": 0,
                    "status": "pending",
                },
            )
        except Exception as exc:
            logger.warning("Could not auto-create hostel fee: %s", exc)

    def get_queryset(self):
        qs = super().get_queryset()
        is_active = self.request.query_params.get("is_active", "true")
        qs = qs.filter(is_active=is_active.lower() == "true")
        block_id = self.request.query_params.get("block")
        if block_id:
            qs = qs.filter(room__block__block_id=block_id)
        return qs

    @action(detail=True, methods=["post"])
    def checkout(self, request, pk=None):
        allotment = self.get_object()
        from django.utils import timezone

        allotment.is_active = False
        allotment.check_out_date = timezone.now().date()
        if request.data.get("remarks"):
            allotment.remarks = request.data["remarks"]
        allotment.save()
        return Response({"status": "checked out"})
