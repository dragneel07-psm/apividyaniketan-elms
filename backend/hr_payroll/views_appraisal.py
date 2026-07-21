# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging

from django.utils import timezone
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from hr_payroll.models_appraisal import AppraisalCycle, AppraisalForm

logger = logging.getLogger(__name__)


class AppraisalCycleSerializer(drf_serializers.ModelSerializer):
    form_count = drf_serializers.SerializerMethodField()

    class Meta:
        model = AppraisalCycle
        fields = [
            "cycle_id",
            "name",
            "period_start",
            "period_end",
            "status",
            "form_count",
            "created_at",
        ]
        read_only_fields = ["cycle_id", "created_at", "form_count"]

    def get_form_count(self, obj):
        return obj.forms.count()


class AppraisalFormSerializer(drf_serializers.ModelSerializer):
    employee_name = drf_serializers.SerializerMethodField()
    cycle_name = drf_serializers.CharField(source="cycle.name", read_only=True)
    reviewer_name = drf_serializers.SerializerMethodField()

    class Meta:
        model = AppraisalForm
        fields = [
            "form_id",
            "cycle",
            "cycle_name",
            "employee",
            "employee_name",
            "reviewer",
            "reviewer_name",
            "punctuality",
            "subject_knowledge",
            "student_engagement",
            "communication",
            "teamwork",
            "overall_score",
            "employee_comments",
            "reviewer_comments",
            "goals_next_period",
            "status",
            "submitted_at",
            "completed_at",
        ]
        read_only_fields = ["form_id", "overall_score", "submitted_at", "completed_at"]

    def get_employee_name(self, obj):
        try:
            u = obj.employee.user
            return f"{u.first_name} {u.last_name}".strip()
        except Exception:
            return str(obj.employee)

    def get_reviewer_name(self, obj):
        if obj.reviewer:
            return f"{obj.reviewer.first_name} {obj.reviewer.last_name}".strip()
        return None


class AppraisalCycleViewSet(viewsets.ModelViewSet):
    serializer_class = AppraisalCycleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant = getattr(self.request.user, "tenant", None)
        if not tenant:
            return AppraisalCycle.objects.none()
        return AppraisalCycle.objects.filter(tenant=tenant).prefetch_related("forms")

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        serializer.save(tenant=tenant)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        cycle = self.get_object()
        cycle.status = "active"
        cycle.save()
        return Response({"status": "active"})

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        cycle = self.get_object()
        cycle.status = "closed"
        cycle.save()
        return Response({"status": "closed"})


class AppraisalFormViewSet(viewsets.ModelViewSet):
    serializer_class = AppraisalFormSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant = getattr(self.request.user, "tenant", None)
        if not tenant:
            return AppraisalForm.objects.none()
        qs = AppraisalForm.objects.filter(tenant=tenant).select_related(
            "cycle", "employee", "reviewer"
        )
        cycle_id = self.request.query_params.get("cycle")
        if cycle_id:
            qs = qs.filter(cycle__cycle_id=cycle_id)
        return qs

    def perform_create(self, serializer):
        tenant = getattr(self.request.user, "tenant", None)
        serializer.save(tenant=tenant)

    @action(detail=True, methods=["post"])
    def submit_self_review(self, request, pk=None):
        form = self.get_object()
        form.employee_comments = request.data.get(
            "employee_comments", form.employee_comments
        )
        form.status = "self_reviewed"
        form.submitted_at = timezone.now()
        form.save()
        return Response(AppraisalFormSerializer(form).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        form = self.get_object()
        for field in [
            "punctuality",
            "subject_knowledge",
            "student_engagement",
            "communication",
            "teamwork",
        ]:
            val = request.data.get(field)
            if val is not None:
                setattr(form, field, int(val))
        form.reviewer_comments = request.data.get(
            "reviewer_comments", form.reviewer_comments
        )
        form.goals_next_period = request.data.get(
            "goals_next_period", form.goals_next_period
        )
        form.reviewer = request.user
        form.overall_score = form.compute_overall()
        form.status = "completed"
        form.completed_at = timezone.now()
        form.save()
        return Response(AppraisalFormSerializer(form).data)
