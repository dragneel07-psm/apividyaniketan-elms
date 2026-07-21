# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging
from datetime import date

from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from billing_school.models_ledger import LedgerAccount, LedgerEntry

logger = logging.getLogger(__name__)


class LedgerAccountSerializer(drf_serializers.ModelSerializer):
    current_balance = drf_serializers.SerializerMethodField()

    class Meta:
        model = LedgerAccount
        fields = [
            "account_id",
            "name",
            "account_type",
            "bank_name",
            "account_number",
            "opening_balance",
            "current_balance",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["account_id", "created_at", "current_balance"]

    def get_current_balance(self, obj):
        return float(obj.current_balance())


class LedgerEntrySerializer(drf_serializers.ModelSerializer):
    recorded_by_name = drf_serializers.SerializerMethodField()

    class Meta:
        model = LedgerEntry
        fields = [
            "entry_id",
            "account",
            "date",
            "entry_type",
            "amount",
            "description",
            "reference",
            "recorded_by",
            "recorded_by_name",
            "created_at",
        ]
        read_only_fields = ["entry_id", "recorded_by", "created_at", "recorded_by_name"]

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return f"{obj.recorded_by.first_name} {obj.recorded_by.last_name}".strip()
        return None


class LedgerAccountViewSet(viewsets.ModelViewSet):
    serializer_class = LedgerAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant = getattr(self.request.user, "tenant", None)
        if not tenant:
            return LedgerAccount.objects.none()
        return LedgerAccount.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        serializer.save(tenant=tenant)

    @action(detail=True, methods=["get"])
    def statement(self, request, pk=None):
        account = self.get_object()
        entries = account.entries.all()
        date_from = request.query_params.get("from")
        date_to = request.query_params.get("to")
        if date_from:
            entries = entries.filter(date__gte=date_from)
        if date_to:
            entries = entries.filter(date__lte=date_to)
        entries = entries.order_by("date", "created_at")

        running = float(account.opening_balance)
        rows = []
        for e in entries:
            amt = float(e.amount)
            if e.entry_type == "credit":
                running += amt
            else:
                running -= amt
            rows.append(
                {
                    "entry_id": str(e.entry_id),
                    "date": str(e.date),
                    "description": e.description,
                    "reference": e.reference,
                    "debit": amt if e.entry_type == "debit" else None,
                    "credit": amt if e.entry_type == "credit" else None,
                    "balance": round(running, 2),
                }
            )
        return Response(
            {
                "account": LedgerAccountSerializer(account).data,
                "entries": rows,
                "closing_balance": round(running, 2),
            }
        )


class LedgerEntryViewSet(viewsets.ModelViewSet):
    serializer_class = LedgerEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant = getattr(self.request.user, "tenant", None)
        if not tenant:
            return LedgerEntry.objects.none()
        qs = LedgerEntry.objects.filter(tenant=tenant).select_related(
            "account", "recorded_by"
        )
        account_id = self.request.query_params.get("account")
        if account_id:
            qs = qs.filter(account__account_id=account_id)
        date_from = self.request.query_params.get("from")
        date_to = self.request.query_params.get("to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        serializer.save(tenant=tenant, recorded_by=self.request.user)
