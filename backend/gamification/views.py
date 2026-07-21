# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db.models import Count, F, Sum, Window
from django.db.models.functions import Rank
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from academic.models import Student
from core.mixins import TenantScopedQuerysetMixin

from .models import Badge, PointTransaction, StudentBadge
from .serializers import (
    BadgeSerializer,
    LeaderboardEntrySerializer,
    PointTransactionSerializer,
    StudentBadgeSerializer,
)


class StudentBadgeViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = StudentBadge.objects.all()
    serializer_class = StudentBadgeSerializer
    permission_classes = [permissions.IsAuthenticated]
    tenant_field = "tenant"

    def get_queryset(self):
        qs = super().get_queryset()
        # If student, show only their badges
        try:
            student = Student.objects.get(user=self.request.user)
            return qs.filter(student=student)
        except Student.DoesNotExist:
            return qs


class LeaderboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """
        GET /api/gamification/leaderboard/
        Params:
          ?scope=class (default) | school
          ?limit=20 (default 20, max 50)

        Returns top-N ranked students + the requesting student's own rank
        (even if outside the top N).
        Respects GamificationProfile.is_public — private profiles are hidden.
        """
        try:
            current_student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response(
                {"error": "Leaderboard only available for students"}, status=403
            )

        scope = request.query_params.get("scope", "class")
        limit = min(int(request.query_params.get("limit", 20) or 20), 50)
        tenant = getattr(request, "tenant", None) or getattr(
            request.user, "tenant", None
        )

        # 1. Fetch relevant students in scope
        if scope == "school":
            student_qs = (
                Student.objects.filter(user__tenant=tenant)
                if tenant
                else Student.objects.none()
            )
        else:
            if not current_student.academic_class:
                return Response(
                    {"error": "Student not assigned to a class"}, status=400
                )
            student_qs = Student.objects.filter(
                academic_class=current_student.academic_class
            )

        student_ids = list(student_qs.values_list("student_id", flat=True))
        student_names = {
            str(
                s["student_id"]
            ): f"{s['user__first_name']} {s['user__last_name']}".strip()
            for s in student_qs.values(
                "student_id", "user__first_name", "user__last_name"
            )
        }

        # 2. Fetch profiles, tenant-scoped, is_public=True, ordered by XP
        profile_qs = GamificationProfile.objects.filter(
            student_id__in=student_ids,
            is_public=True,
        )
        if tenant:
            profile_qs = profile_qs.filter(tenant=tenant)
        profiles = list(profile_qs.order_by("-total_xp"))

        # 3. Badge counts in one query
        badge_counts = (
            {
                str(row["student_id"]): row["count"]
                for row in StudentBadge.objects.filter(
                    student_id__in=student_ids,
                    tenant=tenant,
                )
                .values("student_id")
                .annotate(count=Count("id"))
            }
            if tenant
            else {}
        )

        # 4. Build ranked list
        results = []
        my_entry = None
        my_rank = None
        for rank, profile in enumerate(profiles, start=1):
            sid = str(profile.student_id)
            name = student_names.get(sid, "")
            entry = {
                "rank": rank,
                "student_id": sid,
                "student_name": name,
                "total_xp": profile.total_xp,
                "current_level": profile.current_level,
                "current_streak": profile.current_streak,
                "badges_count": badge_counts.get(sid, 0),
                "is_me": sid == str(current_student.student_id),
            }
            if entry["is_me"]:
                my_rank = rank
                my_entry = entry
            if rank <= limit:
                results.append(entry)

        # 5. If current student is outside top-N, append their entry
        if my_entry and my_rank and my_rank > limit:
            results.append({**my_entry, "rank": my_rank})

        return Response(
            {
                "scope": scope,
                "total_participants": len(profiles),
                "my_rank": my_rank,
                "entries": results,
            }
        )


def _is_admin(user) -> bool:
    return (getattr(user, "role", "") or "").lower() in {
        "admin",
        "staff",
        "saas_admin",
    } or user.is_superuser


class BadgeViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer
    permission_classes = [permissions.IsAuthenticated]
    tenant_field = "tenant"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {
            "create",
            "update",
            "partial_update",
            "destroy",
        } and not _is_admin(request.user):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Only admins can manage badges.")

    def perform_create(self, serializer):
        tenant = getattr(self.request, "tenant", None) or getattr(
            self.request.user, "tenant", None
        )
        serializer.save(tenant=tenant)


from .models import GamificationProfile
from .serializers import GamificationProfileSerializer
from .services.gamification_service import GamificationService


class GamificationProfileViewSet(viewsets.ModelViewSet):
    serializer_class = GamificationProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return GamificationProfile.objects.filter(student__user=self.request.user)

    @action(detail=False, methods=["get"])
    def my_stats(self, request):
        try:
            student = Student.objects.get(user=request.user)
            profile = GamificationService.get_or_create_profile(student)
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response({"error": "Not a student"}, status=403)
