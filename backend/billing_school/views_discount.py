# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging

from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from billing.models_school import FeeDiscount, StudentFee
from billing.permissions import IsSchoolFinanceManager

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
            "scholarship_category",
            "scholarship_source",
            "created_at",
        ]
        read_only_fields = ["discount_id", "created_at"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        discount_type = attrs.get(
            "discount_type", getattr(self.instance, "discount_type", "percentage")
        )
        value = attrs.get("value", getattr(self.instance, "value", None))
        max_cap = attrs.get("max_cap", getattr(self.instance, "max_cap", None))
        if value is not None and value <= 0:
            raise drf_serializers.ValidationError(
                {"value": "Discount value must be greater than zero."}
            )
        if discount_type == "percentage" and value is not None and value > 100:
            raise drf_serializers.ValidationError(
                {"value": "Percentage discount cannot exceed 100%."}
            )
        if max_cap is not None and max_cap <= 0:
            raise drf_serializers.ValidationError(
                {"max_cap": "Maximum cap must be greater than zero."}
            )
        return attrs


class FeeDiscountViewSet(viewsets.ModelViewSet):
    serializer_class = FeeDiscountSerializer
    permission_classes = [IsSchoolFinanceManager]

    def get_queryset(self):
        qs = FeeDiscount.objects.all()
        active = self.request.query_params.get("active")
        if active == "true":
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"], url_path="apply/(?P<student_fee_id>[^/.]+)")
    def apply(self, request, pk=None, student_fee_id=None):
        """Apply this discount to a specific StudentFee."""
        discount = self.get_object()
        if not discount.is_active:
            return Response({"error": "This discount is inactive."}, status=400)
        try:
            fee = StudentFee.objects.get(pk=student_fee_id)
        except StudentFee.DoesNotExist:
            return Response({"error": "StudentFee not found."}, status=404)

        # Restore any prior discount before calculating the replacement. This
        # makes applying the same template idempotent and avoids compounding
        # discounts every time the button is clicked.
        base_amount = fee.amount_due + fee.discount_amount
        disc_amount = discount.compute_discount(base_amount)
        fee.discount = discount
        fee.discount_amount = disc_amount
        fee.amount_due = max(0, base_amount - disc_amount)
        if fee.amount_paid >= fee.amount_due:
            fee.status = "paid"
        elif fee.amount_paid > 0:
            fee.status = "partial"
        fee.save()
        return Response(
            {
                "fee_id": str(fee.pk),
                "discount_applied": float(disc_amount),
                "new_amount_due": float(fee.amount_due),
            }
        )
