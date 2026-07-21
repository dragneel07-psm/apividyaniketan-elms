# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models


class Route(models.Model):
    route_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="transport_routes",
        db_constraint=False,
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    stops = models.JSONField(
        default=list,
        blank=True,
        help_text='[{"name":"Lagankhel","order":1,"pickup_time":"07:20"}]',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Vehicle(models.Model):
    vehicle_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="transport_vehicles",
        db_constraint=False,
    )
    plate_number = models.CharField(max_length=20)
    model = models.CharField(max_length=80, blank=True)
    capacity = models.PositiveSmallIntegerField(default=30)
    driver_name = models.CharField(max_length=100, blank=True)
    driver_phone = models.CharField(max_length=20, blank=True)
    route = models.ForeignKey(
        Route,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicles",
        db_constraint=False,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["plate_number"]

    def __str__(self):
        return self.plate_number


class StudentTransportAssignment(models.Model):
    assignment_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="transport_assignments",
        db_constraint=False,
    )
    student = models.OneToOneField(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="transport_assignment",
        db_constraint=False,
    )
    route = models.ForeignKey(
        Route,
        on_delete=models.CASCADE,
        related_name="student_assignments",
        db_constraint=False,
    )
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_students",
        db_constraint=False,
    )
    pickup_stop = models.CharField(max_length=100, blank=True)
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    active_from = models.DateField()
    active_until = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["tenant", "is_active"], name="transport_assign_active_idx"
            ),
        ]

    def __str__(self):
        return f"{self.student} \u2192 {self.route}"
