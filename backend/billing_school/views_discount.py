# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging

from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from billing.models_school import FeeDiscount, StudentFee

logger = logging.getLogger(__name__)


class FeeDiscountSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = FeeDiscount
        fields = [
            "discount_id",
            "name",
            "discount_type",
            "value",
            "max_cap",
            "reason",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["discount_id", "created_at"]


class FeeDiscountViewSet(viewsets.ModelViewSet):
    serializer_class = FeeDiscountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant = getattr(self.request.user, "tenant", None)
        if not tenant:
            return FeeDiscount.objects.none()
        qs = FeeDiscount.objects.filter(tenant=tenant)
        active = self.request.query_params.get("active")
        if active == "true":
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        serializer.save(tenant=tenant)

    @action(detail=True, methods=["post"], url_path="apply/(?P<student_fee_id>[^/.]+)")
    def apply(self, request, pk=None, student_fee_id=None):
        """Apply this discount to a specific StudentFee."""
        discount = self.get_object()
        try:
            fee = StudentFee.objects.get(pk=student_fee_id, tenant=request.user.tenant)
        except StudentFee.DoesNotExist:
            return Response({"error": "StudentFee not found."}, status=404)

        disc_amount = discount.compute_discount(fee.amount_due)
        fee.discount = discount
        fee.discount_amount = disc_amount
        fee.amount_due = max(0, fee.amount_due - disc_amount)
        fee.save()
        return Response(
            {
                "fee_id": str(fee.pk),
                "discount_applied": float(disc_amount),
                "new_amount_due": float(fee.amount_due),
            }
        )
