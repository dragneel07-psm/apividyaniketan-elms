# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models


class HostelBlock(models.Model):
    block_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="hostel_blocks",
        db_constraint=False,
    )
    name = models.CharField(max_length=100)
    GENDER = [("male", "Male"), ("female", "Female"), ("mixed", "Mixed")]
    gender = models.CharField(max_length=10, choices=GENDER, default="mixed")
    warden_name = models.CharField(max_length=100, blank=True)
    warden_phone = models.CharField(max_length=20, blank=True)
    total_rooms = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def occupied_rooms(self):
        return self.rooms.filter(allotments__is_active=True).distinct().count()

    @property
    def available_rooms(self):
        return self.rooms.count() - self.occupied_rooms


class HostelRoom(models.Model):
    room_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="hostel_rooms",
        db_constraint=False,
    )
    block = models.ForeignKey(
        HostelBlock, on_delete=models.CASCADE, related_name="rooms", db_constraint=False
    )
    room_number = models.CharField(max_length=20)
    ROOM_TYPES = [
        ("single", "Single"),
        ("double", "Double"),
        ("dormitory", "Dormitory"),
    ]
    room_type = models.CharField(max_length=20, choices=ROOM_TYPES, default="double")
    capacity = models.PositiveSmallIntegerField(default=2)
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    floor = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["block", "floor", "room_number"]
        unique_together = [("block", "room_number")]

    def __str__(self):
        return f"{self.block.name} - Room {self.room_number}"

    @property
    def occupied_beds(self):
        return self.allotments.filter(is_active=True).count()

    @property
    def available_beds(self):
        return self.capacity - self.occupied_beds

    @property
    def is_full(self):
        return self.available_beds <= 0


class HostelAllotment(models.Model):
    allotment_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="hostel_allotments",
        db_constraint=False,
    )
    student = models.ForeignKey(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="hostel_allotments",
        db_constraint=False,
    )
    room = models.ForeignKey(
        HostelRoom,
        on_delete=models.CASCADE,
        related_name="allotments",
        db_constraint=False,
    )
    check_in_date = models.DateField()
    check_out_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-check_in_date"]
        indexes = [
            models.Index(
                fields=["tenant", "is_active"], name="hostel_allot_tenant_active_idx"
            ),
        ]

    def __str__(self):
        return f"{self.student} in {self.room}"
