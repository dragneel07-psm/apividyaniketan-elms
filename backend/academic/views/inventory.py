# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from datetime import date

from django.db.models import Count, Q, Sum
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.mixins import TenantScopedQuerysetMixin
from core.utils.audit import record_audit_event

from ..models.inventory import (
    Asset,
    AssetAssignment,
    ConsumableStock,
    MaintenanceRequest,
)

# ── Serializers ──────────────────────────────────────────────────────────────


class AssetAssignmentSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = AssetAssignment
        fields = [
            "assignment_id",
            "assigned_to_user",
            "assigned_to_name",
            "assigned_to_location",
            "assigned_date",
            "expected_return_date",
            "actual_return_date",
            "notes",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["assignment_id", "created_at"]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to_user:
            return obj.assigned_to_user.get_full_name() or obj.assigned_to_user.username
        return None


class AssetSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    condition_display = serializers.CharField(
        source="get_condition_display", read_only=True
    )
    active_assignment = serializers.SerializerMethodField()
    open_maintenance_count = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            "asset_id",
            "name",
            "asset_tag",
            "category",
            "category_display",
            "description",
            "serial_number",
            "brand",
            "model_number",
            "purchase_date",
            "purchase_price",
            "warranty_expiry",
            "location",
            "status",
            "status_display",
            "condition",
            "condition_display",
            "notes",
            "active_assignment",
            "open_maintenance_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["asset_id", "created_at", "updated_at"]

    def get_active_assignment(self, obj):
        assignment = obj.assignments.filter(is_active=True).first()
        if assignment:
            return AssetAssignmentSerializer(assignment).data
        return None

    def get_open_maintenance_count(self, obj):
        return obj.maintenance_requests.filter(
            status__in=["open", "in_progress"]
        ).count()


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source="asset.name", read_only=True)
    asset_tag = serializers.CharField(source="asset.asset_tag", read_only=True)
    reported_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(
        source="get_priority_display", read_only=True
    )

    class Meta:
        model = MaintenanceRequest
        fields = [
            "request_id",
            "asset",
            "asset_name",
            "asset_tag",
            "reported_by_name",
            "title",
            "description",
            "status",
            "status_display",
            "priority",
            "priority_display",
            "estimated_cost",
            "actual_cost",
            "resolution_notes",
            "reported_date",
            "resolved_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["request_id", "reported_date", "created_at", "updated_at"]

    def get_reported_by_name(self, obj):
        if obj.reported_by:
            return obj.reported_by.get_full_name() or obj.reported_by.username
        return None


class ConsumableStockSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )
    unit_display = serializers.CharField(source="get_unit_display", read_only=True)
    is_low = serializers.BooleanField(read_only=True)

    class Meta:
        model = ConsumableStock
        fields = [
            "stock_id",
            "name",
            "category",
            "category_display",
            "unit",
            "unit_display",
            "current_quantity",
            "minimum_quantity",
            "location",
            "notes",
            "last_restocked",
            "is_low",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["stock_id", "created_at", "updated_at"]


# ── ViewSets ─────────────────────────────────────────────────────────────────


class AssetViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = "tenant"

    def get_queryset(self):
        qs = (
            super()
            .get_queryset()
            .prefetch_related("assignments", "maintenance_requests")
        )
        category = self.request.query_params.get("category")
        asset_status = self.request.query_params.get("status")
        search = self.request.query_params.get("search")
        if category:
            qs = qs.filter(category=category)
        if asset_status:
            qs = qs.filter(status=asset_status)
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(asset_tag__icontains=search)
                | Q(serial_number__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        asset = serializer.save(tenant=tenant)
        record_audit_event(
            action="inventory.asset_created",
            user=self.request.user,
            request=self.request,
            details={
                "asset_id": str(asset.asset_id),
                "name": asset.name,
                "category": asset.category,
            },
        )

    def perform_update(self, serializer):
        asset = serializer.save()
        record_audit_event(
            action="inventory.asset_updated",
            user=self.request.user,
            request=self.request,
            details={
                "asset_id": str(asset.asset_id),
                "name": asset.name,
                "status": asset.status,
            },
        )

    def perform_destroy(self, instance):
        record_audit_event(
            action="inventory.asset_deleted",
            user=self.request.user,
            request=self.request,
            details={"asset_id": str(instance.asset_id), "name": instance.name},
        )
        instance.delete()

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        asset = self.get_object()
        # Close any active assignments
        asset.assignments.filter(is_active=True).update(
            is_active=False, actual_return_date=date.today()
        )
        data = {**request.data, "asset": str(asset.asset_id)}
        serializer = AssetAssignmentSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save(asset=asset)
        asset.status = "in_use"
        asset.save(update_fields=["status"])
        record_audit_event(
            action="inventory.asset_assigned",
            user=request.user,
            request=request,
            details={
                "asset_id": str(asset.asset_id),
                "assignment_id": str(assignment.assignment_id),
            },
        )
        return Response(
            AssetAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"], url_path="return")
    def return_asset(self, request, pk=None):
        asset = self.get_object()
        asset.assignments.filter(is_active=True).update(
            is_active=False,
            actual_return_date=date.today(),
        )
        asset.status = "available"
        asset.save(update_fields=["status"])
        record_audit_event(
            action="inventory.asset_returned",
            user=request.user,
            request=request,
            details={"asset_id": str(asset.asset_id)},
        )
        return Response({"status": "returned"})

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        tenant = getattr(request.user, "tenant", None)
        qs = Asset.objects.filter(tenant=tenant)
        by_status = list(qs.values("status").annotate(count=Count("asset_id")))
        by_category = list(qs.values("category").annotate(count=Count("asset_id")))
        open_maintenance = MaintenanceRequest.objects.filter(
            tenant=tenant, status__in=["open", "in_progress"]
        ).count()
        low_stock = ConsumableStock.objects.filter(tenant=tenant).count()
        low_stock_items = [
            s
            for s in ConsumableStock.objects.filter(tenant=tenant)
            if s.current_quantity <= s.minimum_quantity
        ]
        return Response(
            {
                "total_assets": qs.count(),
                "by_status": by_status,
                "by_category": by_category,
                "open_maintenance": open_maintenance,
                "low_stock_count": len(low_stock_items),
                "low_stock_items": ConsumableStockSerializer(
                    low_stock_items, many=True
                ).data,
            }
        )


class MaintenanceRequestViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.all()
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = "tenant"

    def get_queryset(self):
        qs = super().get_queryset().select_related("asset", "reported_by")
        req_status = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        if req_status:
            qs = qs.filter(status=req_status)
        if priority:
            qs = qs.filter(priority=priority)
        return qs

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        req = serializer.save(tenant=tenant, reported_by=self.request.user)
        # Mark asset as under maintenance
        req.asset.status = "maintenance"
        req.asset.save(update_fields=["status"])
        record_audit_event(
            action="inventory.maintenance_created",
            user=self.request.user,
            request=self.request,
            details={
                "request_id": str(req.request_id),
                "asset_id": str(req.asset_id),
                "priority": req.priority,
            },
        )

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        req = self.get_object()
        notes = request.data.get("resolution_notes", "")
        actual_cost = request.data.get("actual_cost")
        req.status = "resolved"
        req.resolution_notes = notes
        req.resolved_date = date.today()
        if actual_cost is not None:
            req.actual_cost = actual_cost
        req.save()
        req.asset.status = "available"
        req.asset.save(update_fields=["status"])
        record_audit_event(
            action="inventory.maintenance_resolved",
            user=request.user,
            request=request,
            details={"request_id": str(req.request_id), "asset_id": str(req.asset_id)},
        )
        return Response(MaintenanceRequestSerializer(req).data)


class ConsumableStockViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = ConsumableStock.objects.all()
    serializer_class = ConsumableStockSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = "tenant"

    def get_queryset(self):
        qs = super().get_queryset()
        low = self.request.query_params.get("low_stock")
        if low == "1":
            # filter in Python since is_low is a property
            ids = [s.stock_id for s in qs if s.is_low]
            qs = qs.filter(stock_id__in=ids)
        return qs

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        serializer.save(tenant=tenant)

    @action(detail=True, methods=["post"], url_path="restock")
    def restock(self, request, pk=None):
        item = self.get_object()
        qty = request.data.get("quantity")
        if qty is None:
            return Response(
                {"error": "quantity is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        item.current_quantity += float(qty)
        item.last_restocked = date.today()
        item.save(update_fields=["current_quantity", "last_restocked"])
        record_audit_event(
            action="inventory.stock_restocked",
            user=request.user,
            request=request,
            details={
                "stock_id": str(item.stock_id),
                "name": item.name,
                "added": float(qty),
            },
        )
        return Response(ConsumableStockSerializer(item).data)

    @action(detail=True, methods=["post"], url_path="consume")
    def consume(self, request, pk=None):
        item = self.get_object()
        qty = request.data.get("quantity")
        if qty is None:
            return Response(
                {"error": "quantity is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        item.current_quantity = max(0, float(item.current_quantity) - float(qty))
        item.save(update_fields=["current_quantity"])
        return Response(ConsumableStockSerializer(item).data)
