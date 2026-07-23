# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from .models import Expense, FeeStructure, Payment, StudentFee
from .models_school import FeeHead


class FeeHeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeHead
        fields = [
            "head_id",
            "fee_structure",
            "name",
            "amount",
            "sort_order",
            "coa_account",
            "created_at",
        ]
        read_only_fields = ["head_id", "created_at"]

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Fee head amount cannot be negative.")
        return value


class FeeStructureSerializer(serializers.ModelSerializer):
    class_name = serializers.SerializerMethodField()
    heads = FeeHeadSerializer(many=True, read_only=True)
    heads_total = serializers.SerializerMethodField()

    def get_class_name(self, obj):
        cls = getattr(obj, "academic_class", None)
        return str(cls) if cls else ""

    def get_heads_total(self, obj):
        try:
            return float(sum(Decimal(str(h.amount or 0)) for h in obj.heads.all()))
        except Exception:
            return 0.0

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Fee amount must be greater than zero.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        late_fee_type = attrs.get(
            "late_fee_type", getattr(self.instance, "late_fee_type", "none")
        )
        late_fee_amount = attrs.get(
            "late_fee_amount", getattr(self.instance, "late_fee_amount", Decimal("0"))
        )
        if late_fee_amount < 0:
            raise serializers.ValidationError(
                {"late_fee_amount": "Late fee cannot be negative."}
            )
        if late_fee_type == "percent" and late_fee_amount > 100:
            raise serializers.ValidationError(
                {"late_fee_amount": "Percentage late fee cannot exceed 100%."}
            )
        return attrs

    class Meta:
        model = FeeStructure
        fields = "__all__"


class StudentFeeSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    def get_student_name(self, obj):
        try:
            u = obj.student.user
            return f"{u.first_name} {u.last_name}".strip() or u.username
        except Exception:
            return ""

    fee_name = serializers.CharField(source="fee_structure.name", read_only=True)
    balance = serializers.SerializerMethodField()

    class Meta:
        model = StudentFee
        fields = "__all__"

    def get_balance(self, obj):
        try:
            amount_due = Decimal(str(obj.amount_due or "0"))
            amount_paid = Decimal(str(obj.amount_paid or "0"))
            return float(amount_due - amount_paid)
        except (InvalidOperation, TypeError, ValueError):
            return 0.0


class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="student.user.get_full_name", read_only=True
    )
    recorded_by_name = serializers.CharField(
        source="recorded_by.get_full_name", read_only=True
    )

    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ["recorded_by", "payment_date"]

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        student_fee = attrs.get("student_fee", getattr(instance, "student_fee", None))
        student = attrs.get("student", getattr(instance, "student", None))

        if (
            student_fee
            and student
            and getattr(student_fee, "student", None)
            and student_fee.student != student
        ):
            raise serializers.ValidationError(
                {
                    "student_fee": "Student fee record does not belong to the selected student."
                }
            )

        amount = attrs.get("amount", getattr(instance, "amount", None))
        if amount is not None and amount <= 0:
            raise serializers.ValidationError(
                {"amount": "Payment amount must be greater than zero."}
            )

        # A payment linked to a fee may not exceed its current outstanding
        # balance. This protects every caller, including imports and API clients,
        # rather than relying only on the admin form's max attribute.
        if student_fee and amount is not None and instance is None:
            outstanding = Decimal(str(student_fee.amount_due or 0)) - Decimal(
                str(student_fee.amount_paid or 0)
            )
            if amount > outstanding:
                raise serializers.ValidationError(
                    {
                        "amount": (
                            "Payment exceeds the outstanding balance "
                            f"of {outstanding:.2f}."
                        )
                    }
                )

        return attrs


class ExpenseSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(
        source="recorded_by.get_full_name", read_only=True
    )

    class Meta:
        model = Expense
        fields = "__all__"
        read_only_fields = ["recorded_by"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Expense amount must be greater than zero.")
        return value
