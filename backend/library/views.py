# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from datetime import timedelta

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from academic.models import Parent, Student, Teacher

from .models import Book, BookIssue
from .serializers import BookIssueSerializer, BookSerializer


def _role(user) -> str:
    return (getattr(user, "role", "") or "").lower()


def _is_library_manager(user) -> bool:
    return _role(user) in {"admin", "staff", "saas_admin"}


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {
            "create",
            "update",
            "partial_update",
            "destroy",
        } and not _is_library_manager(request.user):
            raise PermissionDenied("Only library managers can modify books.")


class BookIssueViewSet(viewsets.ModelViewSet):
    queryset = BookIssue.objects.all()
    serializer_class = BookIssueSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {
            "create",
            "update",
            "partial_update",
            "destroy",
            "return_book",
        } and not _is_library_manager(request.user):
            raise PermissionDenied("Only library managers can manage book issues.")

    def get_queryset(self):
        queryset = super().get_queryset().select_related("student__user", "book")
        user = self.request.user
        role = _role(user)

        if role == "student":
            student = Student.objects.filter(user=user).only("pk").first()
            if student is None:
                return queryset.none()
            return queryset.filter(student=student)
        if role == "parent":
            parent = Parent.objects.filter(user=user).only("pk").first()
            if parent is None:
                return queryset.none()
            return queryset.filter(student__in=parent.students.all())
        if role == "teacher":
            teacher = Teacher.objects.filter(user=user).only("pk").first()
            if teacher is None:
                return queryset.none()
            return queryset.filter(
                student__academic_class__in=teacher.assigned_classes.all()
            )

        return queryset

    def perform_create(self, serializer):
        student = serializer.validated_data.get("student")
        actor_tenant = getattr(self.request.user, "tenant", None)
        student_tenant = getattr(getattr(student, "user", None), "tenant", None)
        if actor_tenant and student_tenant and actor_tenant != student_tenant:
            raise PermissionDenied("Cannot issue books across tenants.")

        # Set due date to 14 days from now if not provided
        if not serializer.validated_data.get("due_date"):
            due_date = timezone.now().date() + timedelta(days=14)
            serializer.save(due_date=due_date)
        else:
            serializer.save()

    @action(detail=True, methods=["post"])
    def return_book(self, request, pk=None):
        """Mark book as returned (stock update handled by model)"""
        issue = self.get_object()

        # Check if already returned
        if issue.status == "returned":
            return Response(
                {"error": "Book already returned"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Updating status to 'returned' will trigger stock increment in models.py
            issue.return_date = timezone.now().date()
            issue.status = "returned"

            # Calculate fine if overdue
            if issue.return_date > issue.due_date:
                days_overdue = (issue.return_date - issue.due_date).days
                issue.fine_amount = days_overdue * 0.50  # $0.50 per day

            issue.save()

            serializer = self.get_serializer(issue)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
