# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""Student Information System (SIS) views — health, discipline, documents."""

from __future__ import annotations

import csv
import io
from datetime import date

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from billing.shared_views import BillingSchemaGuardMixin
from core.mixins import TenantScopedQuerysetMixin
from core.utils.audit import record_audit_event
from users.permissions import IsAdminOrSaaSAdmin, IsSISStaff

from ..models.discipline import DisciplinaryIncident
from ..models.documents import StudentDocument
from ..models.health import ImmunizationRecord, StudentHealthRecord

# ─── Serializers ─────────────────────────────────────────────────────────────


class ImmunizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImmunizationRecord
        fields = "__all__"
        read_only_fields = ["health_record"]


class StudentHealthRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="student.user.get_full_name", read_only=True
    )
    immunizations = ImmunizationSerializer(many=True, read_only=True)

    class Meta:
        model = StudentHealthRecord
        fields = "__all__"
        read_only_fields = ["tenant", "created_at", "updated_at"]


class DisciplinaryIncidentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="student.user.get_full_name", read_only=True
    )
    reported_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DisciplinaryIncident
        fields = "__all__"
        read_only_fields = ["tenant", "created_at", "updated_at"]

    def get_reported_by_name(self, obj):
        if obj.reported_by:
            return obj.reported_by.get_full_name()
        return None


class StudentDocumentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="student.user.get_full_name", read_only=True
    )
    issued_by_name = serializers.SerializerMethodField()
    document_type_display = serializers.CharField(
        source="get_document_type_display", read_only=True
    )

    class Meta:
        model = StudentDocument
        fields = "__all__"
        read_only_fields = ["tenant", "document_number", "created_at"]

    def get_issued_by_name(self, obj):
        if obj.issued_by:
            return obj.issued_by.get_full_name()
        return None


# ─── Base mixin ──────────────────────────────────────────────────────────────


class _SISBase(
    BillingSchemaGuardMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet
):
    require_tenant_schema = True
    allow_unscoped_for_saas = False
    permission_classes = [IsSISStaff]

    def _tenant(self):
        return getattr(self.request.user, "tenant", None)


# ─── Health Records ───────────────────────────────────────────────────────────


class StudentHealthRecordViewSet(_SISBase):
    queryset = (
        StudentHealthRecord.objects.select_related("student__user")
        .prefetch_related("immunizations")
        .all()
    )
    serializer_class = StudentHealthRecordSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        student_id = self.request.query_params.get("student")
        if student_id:
            qs = qs.filter(student__student_id=student_id)
        return qs

    def perform_create(self, serializer):
        record = serializer.save(tenant=self._tenant())
        record_audit_event(
            action="sis.health_record_created",
            user=self.request.user,
            request=self.request,
            details={
                "health_id": str(record.health_id),
                "student": record.student_name,
            },
        )

    def perform_update(self, serializer):
        record = serializer.save()
        record_audit_event(
            action="sis.health_record_updated",
            user=self.request.user,
            request=self.request,
            details={"health_id": str(record.health_id)},
        )

    @action(detail=True, methods=["post"], url_path="immunizations")
    def add_immunization(self, request, pk=None):
        health_record = self.get_object()
        s = ImmunizationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        s.save(health_record=health_record)
        return Response(s.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True, methods=["delete"], url_path=r"immunizations/(?P<imm_id>[^/.]+)"
    )
    def delete_immunization(self, request, pk=None, imm_id=None):
        health_record = self.get_object()
        try:
            imm = ImmunizationRecord.objects.get(
                immunization_id=imm_id, health_record=health_record
            )
        except ImmunizationRecord.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        imm.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Disciplinary Incidents ───────────────────────────────────────────────────


class DisciplinaryIncidentViewSet(_SISBase):
    queryset = DisciplinaryIncident.objects.select_related(
        "student__user", "reported_by"
    ).all()
    serializer_class = DisciplinaryIncidentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        student_id = self.request.query_params.get("student")
        inc_status = self.request.query_params.get("status")
        severity = self.request.query_params.get("severity")
        if student_id:
            qs = qs.filter(student__student_id=student_id)
        if inc_status:
            qs = qs.filter(status=inc_status)
        if severity:
            qs = qs.filter(severity=severity)
        return qs

    def perform_create(self, serializer):
        incident = serializer.save(tenant=self._tenant(), reported_by=self.request.user)
        record_audit_event(
            action="sis.incident_reported",
            user=self.request.user,
            request=self.request,
            details={
                "incident_id": str(incident.incident_id),
                "student": incident.student.user.get_full_name(),
                "type": incident.incident_type,
                "severity": incident.severity,
            },
        )

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        incident = self.get_object()
        action_taken = request.data.get("action_taken", "")
        follow_up_notes = request.data.get("follow_up_notes", "")
        incident.status = DisciplinaryIncident.STATUS_RESOLVED
        incident.action_taken = action_taken or incident.action_taken
        incident.follow_up_notes = follow_up_notes or incident.follow_up_notes
        incident.save(
            update_fields=["status", "action_taken", "follow_up_notes", "updated_at"]
        )
        record_audit_event(
            action="sis.incident_resolved",
            user=request.user,
            request=request,
            details={"incident_id": str(incident.incident_id)},
        )
        return Response(DisciplinaryIncidentSerializer(incident).data)

    @action(detail=True, methods=["post"], url_path="notify-parent")
    def notify_parent(self, request, pk=None):
        incident = self.get_object()
        incident.parent_notified = True
        incident.parent_notified_at = timezone.now()
        incident.save(update_fields=["parent_notified", "parent_notified_at"])
        record_audit_event(
            action="sis.incident_parent_notified",
            user=request.user,
            request=request,
            details={"incident_id": str(incident.incident_id)},
        )
        return Response({"message": "Parent notification recorded."})


# ─── Student Documents ────────────────────────────────────────────────────────


class StudentDocumentViewSet(_SISBase):
    queryset = StudentDocument.objects.select_related(
        "student__user", "issued_by"
    ).all()
    serializer_class = StudentDocumentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        student_id = self.request.query_params.get("student")
        doc_type = self.request.query_params.get("document_type")
        if student_id:
            qs = qs.filter(student__student_id=student_id)
        if doc_type:
            qs = qs.filter(document_type=doc_type)
        return qs.filter(is_cancelled=False)

    def perform_create(self, serializer):
        doc = serializer.save(tenant=self._tenant(), issued_by=self.request.user)
        record_audit_event(
            action="sis.document_issued",
            user=self.request.user,
            request=self.request,
            details={
                "document_id": str(doc.document_id),
                "document_number": doc.document_number,
                "type": doc.document_type,
                "student": doc.student.user.get_full_name(),
            },
        )

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        doc = self.get_object()
        if doc.is_cancelled:
            return Response(
                {"detail": "Document already cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = request.data.get("reason", "")
        doc.is_cancelled = True
        doc.cancellation_reason = reason
        doc.save(update_fields=["is_cancelled", "cancellation_reason"])
        record_audit_event(
            action="sis.document_cancelled",
            user=request.user,
            request=request,
            details={"document_number": doc.document_number, "reason": reason},
        )
        return Response(StudentDocumentSerializer(doc).data)

    @action(detail=True, methods=["get"], url_path="preview")
    def preview(self, request, pk=None):
        """Return structured data for rendering the certificate on the frontend."""
        doc = self.get_object()
        student = doc.student
        user = student.user
        tenant = self._tenant()

        payload = {
            "document_number": doc.document_number,
            "document_type": doc.document_type,
            "document_type_display": doc.get_document_type_display(),
            "issued_date": str(doc.issued_date),
            "remarks": doc.remarks,
            "reason": doc.reason,
            "student": {
                "name": user.get_full_name(),
                "email": user.email,
                "date_of_birth": (
                    str(user.date_of_birth)
                    if getattr(user, "date_of_birth", None)
                    else None
                ),
                "class": student.academic_class.name if student.academic_class else "",
                "section": student.section.name if student.section else "",
            },
            "school": {
                "name": tenant.name if tenant else "",
                "address": getattr(tenant, "address", "") or "",
                "contact_email": getattr(tenant, "contact_email", "") or "",
                "contact_phone": getattr(tenant, "contact_phone", "") or "",
            },
            "issued_by": doc.issued_by.get_full_name() if doc.issued_by else "",
            "metadata": doc.metadata,
        }
        return Response(payload)


# ─── SIS Dashboard ────────────────────────────────────────────────────────────


class SISDashboardViewSet(BillingSchemaGuardMixin, viewsets.ViewSet):
    require_tenant_schema = True
    permission_classes = [IsSISStaff]

    def _tenant(self, request):
        return getattr(request.user, "tenant", None)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        tenant = self._tenant(request)
        health_count = StudentHealthRecord.objects.filter(tenant=tenant).count()
        open_incidents = DisciplinaryIncident.objects.filter(
            tenant=tenant, status=DisciplinaryIncident.STATUS_OPEN
        ).count()
        total_incidents = DisciplinaryIncident.objects.filter(tenant=tenant).count()
        docs_issued = StudentDocument.objects.filter(
            tenant=tenant, is_cancelled=False
        ).count()
        tc_issued = StudentDocument.objects.filter(
            tenant=tenant, document_type=StudentDocument.TYPE_TC, is_cancelled=False
        ).count()

        from django.db.models import Count

        incident_by_type = list(
            DisciplinaryIncident.objects.filter(tenant=tenant)
            .values("incident_type")
            .annotate(count=Count("incident_id"))
            .order_by("-count")[:6]
        )
        incident_by_severity = list(
            DisciplinaryIncident.objects.filter(tenant=tenant)
            .values("severity")
            .annotate(count=Count("incident_id"))
        )

        return Response(
            {
                "health_records": health_count,
                "open_incidents": open_incidents,
                "total_incidents": total_incidents,
                "documents_issued": docs_issued,
                "transfer_certificates": tc_issued,
                "incident_by_type": incident_by_type,
                "incident_by_severity": incident_by_severity,
            }
        )
