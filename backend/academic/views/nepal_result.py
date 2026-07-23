# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from academic.models import Parent, Student, Teacher
from academic.models.nepal_result import (
    AnswerPaperCode, ExamSubject, ExamTerm, MarkEntry, MarkEntryRevision,
    NepalGradingProfile, StudentTermResult,
)
from academic.serializers.nepal_result import (
    ExamSubjectSerializer, ExamTermSerializer, MarkEntrySerializer,
    NepalGradingProfileSerializer, PaperCodeSerializer, StudentTermResultSerializer,
)
from academic.services.nepal_result_service import (
    calculate_subject_result, ensure_nepal_2081_profile, generate_paper_code,
    paper_code_hash, publish_exam_term, validate_mark_values,
)
from core.utils.audit import record_audit_event
from core.reports import generate_pdf_response


ADMIN_ROLES = {"admin", "staff", "saas_admin", "management", "school_admin"}


def _is_admin(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.role in ADMIN_ROLES))


def _teacher(user):
    return Teacher.objects.filter(user=user).first() if getattr(user, "role", None) == "teacher" else None


class GradingProfileViewSet(viewsets.ModelViewSet):
    serializer_class = NepalGradingProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return NepalGradingProfile.objects.all()

    def perform_create(self, serializer):
        if not _is_admin(self.request.user):
            raise PermissionDenied("Only School Admin can manage grading profiles.")
        serializer.save()

    def perform_update(self, serializer):
        if not _is_admin(self.request.user):
            raise PermissionDenied("Only School Admin can manage grading profiles.")
        if serializer.instance.is_system_default:
            raise ValidationError({"detail": "System profiles are immutable; create a new version instead."})
        serializer.save()

    def perform_destroy(self, instance):
        if not _is_admin(self.request.user) or instance.is_system_default:
            raise PermissionDenied("This grading profile cannot be deleted.")
        instance.delete()

    @action(detail=False, methods=["post"], url_path="ensure-nepal-2081")
    def ensure_default(self, request):
        if not _is_admin(request.user):
            raise PermissionDenied("Only School Admin can initialize grading rules.")
        return Response(self.get_serializer(ensure_nepal_2081_profile()).data)


class ExamTermViewSet(viewsets.ModelViewSet):
    serializer_class = ExamTermSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ExamTerm.objects.select_related("academic_year", "grading_profile").all()
        if getattr(self.request.user, "role", None) in {"student", "parent"}:
            qs = qs.filter(status="published")
        return qs

    def perform_create(self, serializer):
        if not _is_admin(self.request.user):
            raise PermissionDenied("Only School Admin can create exam terms.")
        profile = serializer.validated_data.get("grading_profile") or ensure_nepal_2081_profile()
        serializer.save(created_by=self.request.user, grading_profile=profile)

    def perform_update(self, serializer):
        if not _is_admin(self.request.user):
            raise PermissionDenied("Only School Admin can update exam terms.")
        if serializer.instance.status in {"locked", "published"}:
            raise ValidationError({"detail": "Locked or published exam terms cannot be edited."})
        serializer.save()

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        if not _is_admin(request.user):
            raise PermissionDenied("Only School Admin can publish results.")
        results = publish_exam_term(self.get_object(), request.user)
        record_audit_event(action="academic.exam_term_published", user=request.user, request=request, details={"term_id": str(pk), "student_count": len(results)})
        return Response({"detail": "Results published.", "student_count": len(results)})

    @action(detail=True, methods=["get"])
    def readiness(self, request, pk=None):
        term = self.get_object()
        configs = list(term.exam_subjects.select_related("subject").all())
        return Response({
            "ready": bool(configs) and all(row.marking_status == "verified" for row in configs),
            "subjects": [{"id": str(row.pk), "name": row.subject.name, "status": row.marking_status, "papers": row.papers.filter(is_void=False).count(), "marks": MarkEntry.objects.filter(paper__exam_subject=row, paper__is_void=False).count()} for row in configs],
        })


class ExamSubjectViewSet(viewsets.ModelViewSet):
    serializer_class = ExamSubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ExamSubject.objects.select_related("term", "subject", "section", "section__academic_class", "examiner__user").all()
        term = self.request.query_params.get("term")
        if term:
            qs = qs.filter(term_id=term)
        teacher = _teacher(self.request.user)
        if teacher:
            return qs.filter(examiner=teacher)
        return qs if _is_admin(self.request.user) else qs.none()

    def perform_create(self, serializer):
        if not _is_admin(self.request.user):
            raise PermissionDenied("Only School Admin can configure exam subjects.")
        serializer.save()

    def perform_update(self, serializer):
        if not _is_admin(self.request.user):
            raise PermissionDenied("Only School Admin can update exam subjects.")
        if serializer.instance.term.status in {"locked", "published"}:
            raise ValidationError({"detail": "Published exam configuration is immutable."})
        serializer.save()

    @action(detail=True, methods=["post"], url_path="generate-codes")
    def generate_codes(self, request, pk=None):
        if not _is_admin(request.user):
            raise PermissionDenied("Only School Admin/Exam Controller can generate codes.")
        config = self.get_object()
        students = Student.objects.filter(academic_class=config.section.academic_class, section=config.section).select_related("user")
        generated = []
        with transaction.atomic():
            for student in students:
                if AnswerPaperCode.objects.filter(exam_subject=config, student=student).exists():
                    continue
                for _ in range(10):
                    raw = generate_paper_code(config.term, config)
                    digest = paper_code_hash(raw)
                    if not AnswerPaperCode.objects.filter(code_hash=digest).exists():
                        break
                paper = AnswerPaperCode.objects.create(exam_subject=config, student=student, code_hash=digest, code_hint=raw[-8:])
                generated.append({"paper_id": str(paper.pk), "student_id": str(student.pk), "student_name": student.user.get_full_name(), "code": raw})
        record_audit_event(action="academic.answer_codes_generated", user=request.user, request=request, details={"exam_subject_id": str(config.pk), "count": len(generated)})
        return Response({"generated": generated, "warning": "Full codes are shown once. Print or export them securely."})

    @action(detail=True, methods=["post"], url_path="submit-marks")
    def submit_marks(self, request, pk=None):
        config = self.get_object()
        teacher = _teacher(request.user)
        if not _is_admin(request.user) and config.examiner_id != getattr(teacher, "pk", None):
            raise PermissionDenied("Only the assigned examiner can submit this batch.")
        paper_count = config.papers.filter(is_void=False).count()
        mark_count = MarkEntry.objects.filter(paper__exam_subject=config, paper__is_void=False).count()
        if paper_count == 0 or mark_count != paper_count:
            raise ValidationError({"detail": f"Marks are incomplete ({mark_count}/{paper_count})."})
        config.marking_status = "submitted"
        config.submitted_at = timezone.now()
        config.save(update_fields=["marking_status", "submitted_at"])
        MarkEntry.objects.filter(paper__exam_subject=config).update(status="submitted")
        return Response(self.get_serializer(config).data)

    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        if not _is_admin(request.user):
            raise PermissionDenied("Only Exam Controller/Admin can verify marks.")
        config = self.get_object()
        if config.marking_status != "submitted":
            raise ValidationError({"detail": "Examiner must submit the batch first."})
        config.marking_status = "verified"
        config.verified_at = timezone.now()
        config.verified_by = request.user
        config.save(update_fields=["marking_status", "verified_at", "verified_by"])
        MarkEntry.objects.filter(paper__exam_subject=config).update(status="verified")
        return Response(self.get_serializer(config).data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        if not _is_admin(request.user):
            raise PermissionDenied("Only Exam Controller/Admin can reopen a marks batch.")
        config = self.get_object()
        reason = str(request.data.get("reason", "")).strip()
        if len(reason) < 8:
            raise ValidationError({"reason": "A correction reason of at least 8 characters is required."})
        if config.term.status == "published":
            raise ValidationError({"detail": "Published results are immutable. Use a formally approved amendment workflow."})
        previous_status = config.marking_status
        config.marking_status = "draft"
        config.submitted_at = None
        config.verified_at = None
        config.verified_by = None
        config.save(update_fields=["marking_status", "submitted_at", "verified_at", "verified_by"])
        MarkEntry.objects.filter(paper__exam_subject=config).update(status="draft")
        record_audit_event(
            action="academic.exam_marks_batch_reopened", user=request.user, request=request,
            details={"exam_subject_id": str(config.pk), "previous_status": previous_status, "reason": reason},
        )
        return Response(self.get_serializer(config).data)


class PaperCodeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaperCodeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = AnswerPaperCode.objects.select_related("exam_subject__subject", "exam_subject__section__academic_class").all()
        teacher = _teacher(self.request.user)
        if teacher:
            qs = qs.filter(exam_subject__examiner=teacher)
        elif not _is_admin(self.request.user):
            return qs.none()
        return qs

    @action(detail=False, methods=["post"], url_path="enter-marks")
    def enter_marks(self, request):
        raw_code = str(request.data.get("code", "")).strip()
        if not raw_code:
            raise ValidationError({"code": "Answer-paper code is required."})
        paper = self.get_queryset().select_related("exam_subject__term__grading_profile").filter(code_hash=paper_code_hash(raw_code), is_void=False).first()
        if not paper:
            raise ValidationError({"code": "Invalid or unauthorized answer-paper code."})
        config = paper.exam_subject
        if config.marking_status != "draft" or config.term.status in {"locked", "published"}:
            raise ValidationError({"detail": "This marks batch is no longer editable."})
        validate_mark_values(config, request.data)
        attendance = request.data.get("attendance_status", "present")
        if attendance == "present":
            required = [field for field, maximum in (("theory_marks", config.theory_full_marks), ("internal_marks", config.internal_full_marks), ("practical_marks", config.practical_full_marks)) if Decimal(str(maximum or 0)) > 0 and request.data.get(field) in (None, "")]
            if required:
                raise ValidationError({field: "Marks are required for a present student." for field in required})
        expected_version = request.data.get("version")
        with transaction.atomic():
            existing = MarkEntry.objects.select_for_update().filter(paper=paper).first()
            if existing and expected_version is not None and int(expected_version) != existing.version:
                raise ValidationError({"version": "Marks changed in another session. Reload before saving."})
            before = {} if not existing else MarkEntrySerializer(existing).data
            entry = existing or MarkEntry(paper=paper, entered_by=request.user)
            for field in ("theory_marks", "internal_marks", "practical_marks", "attendance_status", "examiner_remarks"):
                if field in request.data:
                    setattr(entry, field, request.data.get(field))
            if existing:
                entry.version += 1
            entry.entered_by = request.user
            entry.full_clean()
            entry.save()
            after = MarkEntrySerializer(entry).data
            MarkEntryRevision.objects.create(entry=entry, version=entry.version, before=before, after=after, reason=str(request.data.get("reason", "")), changed_by=request.user)
        record_audit_event(
            action="academic.coded_marks_entered", user=request.user, request=request,
            details={"exam_subject_id": str(config.pk), "paper_hint": paper.code_hint, "entry_id": str(entry.pk), "version": entry.version},
        )
        calculated = calculate_subject_result(entry, config.term.grading_profile)
        return Response({"entry": MarkEntrySerializer(entry).data, "calculated": calculated}, status=status.HTTP_200_OK)


class StudentTermResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StudentTermResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StudentTermResult.objects.filter(term__status="published").select_related("term__academic_year", "student__user")
        role = getattr(self.request.user, "role", None)
        if _is_admin(self.request.user):
            return qs
        if role == "student":
            return qs.filter(student__user=self.request.user)
        if role == "parent":
            parent = Parent.objects.filter(user=self.request.user).first()
            return qs.filter(student__in=parent.students.all()) if parent else qs.none()
        teacher = _teacher(self.request.user)
        if teacher:
            return qs.filter(Q(student__academic_class__in=teacher.assigned_classes.all()) | Q(term__exam_subjects__examiner=teacher)).distinct()
        return qs.none()

    @action(detail=True, methods=["get"])
    def marksheet(self, request, pk=None):
        from core.models import SchoolProfile

        result = self.get_object()
        snapshot = result.snapshot or {}
        school_profile = SchoolProfile.get_solo()
        response = generate_pdf_response(
            "reports/nepal_marksheet.html",
            {
                "result": result,
                "term": result.term,
                "student": result.student,
                "school": school_profile,
                "snapshot": snapshot,
                "subjects": snapshot.get("subjects", []),
                "regulation": snapshot.get("regulation", {}),
                "generated_at": timezone.now(),
            },
            f"marksheet-{result.marksheet_number}.pdf",
        )
        if response is None:
            return Response({"detail": "Marksheet generation failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return response
