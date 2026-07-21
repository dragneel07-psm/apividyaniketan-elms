# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid

from django.utils import timezone
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Student, Teacher, Timetable
from ..models.live_session import LiveSession


class LiveSessionSerializer(drf_serializers.ModelSerializer):
    jitsi_url = drf_serializers.ReadOnlyField()
    subject_name = drf_serializers.SerializerMethodField()
    class_name = drf_serializers.SerializerMethodField()
    teacher_name = drf_serializers.SerializerMethodField()

    class Meta:
        model = LiveSession
        fields = [
            "session_id",
            "timetable",
            "jitsi_room",
            "jitsi_url",
            "status",
            "started_at",
            "ended_at",
            "subject_name",
            "class_name",
            "teacher_name",
        ]
        read_only_fields = [
            "session_id",
            "jitsi_room",
            "jitsi_url",
            "status",
            "started_at",
            "ended_at",
            "subject_name",
            "class_name",
            "teacher_name",
        ]

    def get_subject_name(self, obj):
        return obj.timetable.subject_name

    def get_class_name(self, obj):
        return str(obj.timetable.academic_class)

    def get_teacher_name(self, obj):
        teacher = obj.timetable.teacher
        if teacher and teacher.user:
            return f"{teacher.user.first_name} {teacher.user.last_name}".strip()
        return None


class LiveSessionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LiveSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LiveSession.objects.select_related(
            "timetable__academic_class",
            "timetable__teacher__user",
            "started_by",
        )

    @action(detail=False, methods=["get"])
    def active(self, request):
        """
        Return all currently live sessions visible to the requesting user.
        - Students: sessions for their class
        - Teachers: sessions they started
        - Admin/staff: all live sessions
        """
        user = request.user
        role = getattr(user, "role", "student")
        qs = self.get_queryset().filter(status="live")

        if role == "student":
            student = getattr(user, "student_profile", None)
            if not student or not student.academic_class_id:
                return Response([])
            qs = qs.filter(timetable__academic_class=student.academic_class_id)
        elif role == "teacher":
            teacher = Teacher.objects.filter(user=user).first()
            if not teacher:
                return Response([])
            qs = qs.filter(timetable__teacher=teacher)
        # admin/staff see all

        return Response(LiveSessionSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"])
    def start(self, request):
        """
        Teacher starts a live session for a timetable slot.
        Body: { "timetable_id": <int> }
        """
        user = request.user
        role = getattr(user, "role", "")
        if role not in ("teacher", "admin", "staff"):
            return Response(
                {"detail": "Only teachers can start a class."},
                status=status.HTTP_403_FORBIDDEN,
            )

        timetable_id = request.data.get("timetable_id")
        if not timetable_id:
            return Response(
                {"detail": "timetable_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            timetable = Timetable.objects.get(pk=timetable_id)
        except Timetable.DoesNotExist:
            return Response(
                {"detail": "Timetable slot not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # If there's already a live session for this slot, return it
        existing = LiveSession.objects.filter(
            timetable=timetable, status="live"
        ).first()
        if existing:
            return Response(
                LiveSessionSerializer(existing).data, status=status.HTTP_200_OK
            )

        # Generate a unique, readable Jitsi room name
        room_slug = f"{timetable.subject_name.replace(' ', '-')}-{timetable.timetable_id}-{uuid.uuid4().hex[:8]}"
        session = LiveSession.objects.create(
            timetable=timetable,
            jitsi_room=room_slug,
            status="live",
            started_by=user,
        )
        return Response(
            LiveSessionSerializer(session).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def end(self, request, pk=None):
        """Teacher ends a live session."""
        user = request.user
        role = getattr(user, "role", "")
        if role not in ("teacher", "admin", "staff"):
            return Response(
                {"detail": "Only teachers can end a class."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            session = LiveSession.objects.get(pk=pk, status="live")
        except LiveSession.DoesNotExist:
            return Response(
                {"detail": "Active session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        session.status = "ended"
        session.ended_at = timezone.now()
        session.save(update_fields=["status", "ended_at"])
        return Response(LiveSessionSerializer(session).data)
