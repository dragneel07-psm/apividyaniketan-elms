# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging

from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Route, StudentTransportAssignment, Vehicle
from .serializers import (
    RouteSerializer,
    StudentTransportAssignmentSerializer,
    VehicleSerializer,
)

logger = logging.getLogger(__name__)


class TenantFilterMixin:
    """Filters queryset by tenant from request.user."""

    def get_queryset(self):
        tenant = getattr(self.request.user, "tenant", None)
        if tenant is None:
            return self.queryset.model.objects.none()
        return self.queryset.filter(tenant=tenant)


class RouteViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    serializer_class = RouteSerializer
    permission_classes = [IsAuthenticated]
    queryset = Route.objects.all()

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        serializer.save(tenant=tenant)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = self.get_queryset()
        return Response(
            {
                "total_routes": qs.count(),
                "active_routes": qs.filter(is_active=True).count(),
            }
        )


class VehicleViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    queryset = Vehicle.objects.select_related("route").all()

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        serializer.save(tenant=tenant)


class StudentTransportAssignmentViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    serializer_class = StudentTransportAssignmentSerializer
    permission_classes = [IsAuthenticated]
    queryset = StudentTransportAssignment.objects.select_related(
        "student__user", "student__academic_class", "route", "vehicle"
    ).all()

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        assignment = serializer.save(tenant=tenant)
        self._create_transport_fee(assignment, tenant)

    def _create_transport_fee(self, assignment, tenant):
        """Auto-generate a pending StudentFee for the monthly transport fee."""
        try:
            monthly_fee = assignment.monthly_fee
            if not monthly_fee or monthly_fee <= 0:
                return
            import datetime

            from billing.models_school import FeeStructure, StudentFee

            fee_structure, _ = FeeStructure.objects.get_or_create(
                tenant=tenant,
                name="Transport Fee",
                defaults={
                    "amount": monthly_fee,
                    "fee_type": "transport",
                    "academic_year": str(datetime.date.today().year),
                },
            )
            due_date = (
                assignment.active_from.replace(day=1)
                if hasattr(assignment.active_from, "replace")
                else datetime.date.today().replace(day=1)
            )
            StudentFee.objects.get_or_create(
                tenant=tenant,
                student=assignment.student,
                fee_structure=fee_structure,
                due_date=due_date,
                defaults={
                    "amount_due": monthly_fee,
                    "amount_paid": 0,
                    "status": "pending",
                },
            )
        except Exception as exc:
            logger.warning("Could not auto-create transport fee: %s", exc)

    def get_queryset(self):
        qs = super().get_queryset()
        route_id = self.request.query_params.get("route")
        if route_id:
            qs = qs.filter(route__route_id=route_id)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        return qs

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        qs = self.get_queryset().filter(is_active=True)
        routes = Route.objects.filter(
            tenant=request.user.tenant, is_active=True
        ).annotate(
            student_count=Count(
                "student_assignments", filter=Q(student_assignments__is_active=True)
            )
        )
        return Response(
            {
                "total_assigned": qs.count(),
                "routes": [
                    {
                        "route_id": str(r.route_id),
                        "name": r.name,
                        "student_count": r.student_count,
                    }
                    for r in routes
                ],
            }
        )
