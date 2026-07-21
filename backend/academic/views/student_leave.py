# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging
from datetime import date

from django.utils import timezone
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from academic.models.student_leave import StudentLeave

logger = logging.getLogger(__name__)


class StudentLeaveSerializer(drf_serializers.ModelSerializer):
    student_name = drf_serializers.SerializerMethodField()
    class_name = drf_serializers.SerializerMethodField()
    total_days = drf_serializers.IntegerField(read_only=True)
    reviewed_by_name = drf_serializers.SerializerMethodField()

    class Meta:
        model = StudentLeave
        fields = [
            "leave_id",
            "student",
            "student_name",
            "class_name",
            "applied_by",
            "leave_type",
            "start_date",
            "end_date",
            "total_days",
            "reason",
            "supporting_document_url",
            "status",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "review_remarks",
            "created_at",
        ]
        read_only_fields = [
            "leave_id",
            "applied_by",
            "status",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "total_days",
        ]

    def get_student_name(self, obj):
        u = getattr(obj.student, "user", None)
        return f"{u.first_name} {u.last_name}".strip() if u else str(obj.student)

    def get_class_name(self, obj):
        cls = getattr(obj.student, "academic_class", None)
        return str(cls) if cls else None

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}".strip()
        return None


class StudentLeaveViewSet(viewsets.ModelViewSet):
    serializer_class = StudentLeaveSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", "student")
        qs = StudentLeave.objects.select_related(
            "student__user", "student__academic_class", "applied_by", "reviewed_by"
        )
        if role in ("admin", "staff", "principal"):
            return qs.all()
        if role == "teacher":
            # Teachers see leaves for students in their assigned classes
            from academic.models import Student
            from academic.models import Teacher as TeacherModel

            teacher = TeacherModel.objects.filter(user=user).first()
            if not teacher:
                return qs.none()
            students = Student.objects.filter(
                academic_class__in=teacher.assigned_classes.all()
            )
            return qs.filter(student__in=students)
        if role == "parent":
            # Parents see their children's leaves
            parent = getattr(user, "parent_profile", None)
            if parent:
                return qs.filter(student__in=parent.students.all())
            return qs.none()
        # Student sees own leaves
        student = getattr(user, "student_profile", None)
        if student:
            return qs.filter(student=student)
        return qs.none()

    def perform_create(self, serializer):
        serializer.save(applied_by=self.request.user)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        leave = self.get_object()
        if leave.status != "pending":
            return Response(
                {"error": "Only pending leaves can be approved."}, status=400
            )
        leave.status = "approved"
        leave.reviewed_by = request.user
        leave.reviewed_at = timezone.now()
        leave.review_remarks = request.data.get("remarks", "")
        leave.save()
        _notify_leave_decision(leave, "approved")
        return Response(StudentLeaveSerializer(leave).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        leave = self.get_object()
        if leave.status != "pending":
            return Response(
                {"error": "Only pending leaves can be rejected."}, status=400
            )
        leave.status = "rejected"
        leave.reviewed_by = request.user
        leave.reviewed_at = timezone.now()
        leave.review_remarks = request.data.get("remarks", "Rejected by reviewer.")
        leave.save()
        _notify_leave_decision(leave, "rejected")
        return Response(StudentLeaveSerializer(leave).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        leave = self.get_object()
        if leave.status not in ("pending",):
            return Response(
                {"error": "Only pending leaves can be cancelled."}, status=400
            )
        leave.status = "cancelled"
        leave.save()
        return Response({"status": "cancelled"})

    @action(detail=False, methods=["get"])
    def pending(self, request):
        qs = self.get_queryset().filter(status="pending").order_by("start_date")
        return Response(StudentLeaveSerializer(qs, many=True).data)


def _notify_leave_decision(leave, decision: str):
    """Send in-app notification to the student and their parents about leave decision."""
    try:
        from notifications.services import NotificationService

        tenant = getattr(leave.student, "tenant", None)
        student_user = getattr(leave.student, "user", None)
        emoji = "✅" if decision == "approved" else "❌"
        title = f"{emoji} Leave {decision.capitalize()}"
        message = (
            f"Your leave request ({leave.start_date} – {leave.end_date}) "
            f"has been {decision}."
        )
        if leave.review_remarks:
            message += f" Remarks: {leave.review_remarks}"

        recipients = []
        if student_user:
            recipients.append(student_user)
        for parent in leave.student.parents.all():
            if parent.user:
                recipients.append(parent.user)

        for recipient in recipients:
            NotificationService.create_notification(
                recipient=recipient,
                title=title,
                message=message,
                tenant=tenant,
                link="/student/leaves",
            )
    except Exception as exc:
        logger.warning("Leave notification failed: %s", exc)
