# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import serializers

from .models import HostelAllotment, HostelBlock, HostelRoom


class HostelRoomSerializer(serializers.ModelSerializer):
    block_name = serializers.CharField(source="block.name", read_only=True)
    occupied_beds = serializers.IntegerField(read_only=True)
    available_beds = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)

    class Meta:
        model = HostelRoom
        fields = [
            "room_id",
            "block",
            "block_name",
            "room_number",
            "room_type",
            "capacity",
            "monthly_fee",
            "floor",
            "is_active",
            "occupied_beds",
            "available_beds",
            "is_full",
        ]
        read_only_fields = ["room_id"]


class HostelBlockSerializer(serializers.ModelSerializer):
    rooms = HostelRoomSerializer(many=True, read_only=True)
    occupied_rooms = serializers.IntegerField(read_only=True)
    available_rooms = serializers.IntegerField(read_only=True)

    class Meta:
        model = HostelBlock
        fields = [
            "block_id",
            "name",
            "gender",
            "warden_name",
            "warden_phone",
            "total_rooms",
            "is_active",
            "rooms",
            "occupied_rooms",
            "available_rooms",
            "created_at",
        ]
        read_only_fields = ["block_id", "created_at"]


class HostelAllotmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    block_name = serializers.CharField(source="room.block.name", read_only=True)
    monthly_fee = serializers.DecimalField(
        source="room.monthly_fee", max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = HostelAllotment
        fields = [
            "allotment_id",
            "student",
            "student_name",
            "room",
            "room_number",
            "block_name",
            "monthly_fee",
            "check_in_date",
            "check_out_date",
            "is_active",
            "remarks",
            "created_at",
        ]
        read_only_fields = [
            "allotment_id",
            "created_at",
            "student_name",
            "room_number",
            "block_name",
            "monthly_fee",
        ]

    def get_student_name(self, obj):
        u = getattr(obj.student, "user", None)
        if u:
            return f"{u.first_name} {u.last_name}".strip()
        return str(obj.student)

    def validate(self, data):
        room = data.get("room")
        if room and room.is_full:
            raise serializers.ValidationError(
                {"room": "This room is at full capacity."}
            )
        return data
