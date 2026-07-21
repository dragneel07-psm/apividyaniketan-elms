# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import serializers

from .models import Route, StudentTransportAssignment, Vehicle


class RouteSerializer(serializers.ModelSerializer):
    vehicle_count = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = [
            "route_id",
            "name",
            "description",
            "stops",
            "is_active",
            "vehicle_count",
            "created_at",
        ]
        read_only_fields = ["route_id", "created_at", "vehicle_count"]

    def get_vehicle_count(self, obj):
        return obj.vehicles.filter(is_active=True).count()


class VehicleSerializer(serializers.ModelSerializer):
    route_name = serializers.CharField(source="route.name", read_only=True)
    assigned_count = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            "vehicle_id",
            "plate_number",
            "model",
            "capacity",
            "driver_name",
            "driver_phone",
            "route",
            "route_name",
            "is_active",
            "assigned_count",
        ]
        read_only_fields = ["vehicle_id", "route_name", "assigned_count"]

    def get_assigned_count(self, obj):
        return obj.assigned_students.filter(is_active=True).count()


class StudentTransportAssignmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_class = serializers.SerializerMethodField()
    route_name = serializers.CharField(source="route.name", read_only=True)
    vehicle_plate = serializers.CharField(
        source="vehicle.plate_number", read_only=True, default=None
    )

    class Meta:
        model = StudentTransportAssignment
        fields = [
            "assignment_id",
            "student",
            "student_name",
            "student_class",
            "route",
            "route_name",
            "vehicle",
            "vehicle_plate",
            "pickup_stop",
            "monthly_fee",
            "active_from",
            "active_until",
            "is_active",
            "created_at",
        ]
        read_only_fields = [
            "assignment_id",
            "created_at",
            "student_name",
            "student_class",
            "route_name",
            "vehicle_plate",
        ]

    def get_student_name(self, obj):
        u = getattr(obj.student, "user", None)
        if u:
            return f"{u.first_name} {u.last_name}".strip()
        return str(obj.student)

    def get_student_class(self, obj):
        cls = getattr(obj.student, "academic_class", None)
        return str(cls) if cls else None
