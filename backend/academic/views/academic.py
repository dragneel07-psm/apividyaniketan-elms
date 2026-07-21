# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db.models import Q
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdminOrStaff

from ..models import AcademicClass, AcademicYear, Section, Subject, Teacher
from ..serializers import (
    AcademicClassSerializer,
    AcademicYearSerializer,
    SectionSerializer,
    SubjectSerializer,
)
from ..services.academic_year_service import (
    PromotionRules,
    YearRolloverOptions,
    build_rollover_preview,
    create_next_academic_year,
    ensure_current_academic_year,
    plan_next_academic_year,
    rollover_academic_year,
)


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        ensure_current_academic_year()
        return AcademicYear.objects.all().order_by("-start_date")

    def _is_year_manager(self, user):
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None)
            in ["admin", "staff", "management", "saas_admin"]
        )

    def _to_bool(self, value, default=False):
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "on"}
        return bool(value)

    @action(detail=False, methods=["get"])
    def current(self, request):
        current_year = ensure_current_academic_year()
        if not current_year:
            return Response(
                {"detail": "No academic year configured."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(self.get_serializer(current_year).data)

    @action(detail=False, methods=["post"])
    def rollover(self, request):
        if not self._is_year_manager(request.user):
            return Response(
                {"detail": "Only admin/management can run academic year rollover."},
                status=status.HTTP_403_FORBIDDEN,
            )

        dry_run = self._to_bool(request.data.get("dry_run"), False)
        confirm = self._to_bool(request.data.get("confirm"), False)

        source_year_id = request.data.get("source_year")
        target_year_id = request.data.get("target_year")

        source_year = None
        if source_year_id:
            source_year = AcademicYear.objects.filter(pk=source_year_id).first()
        if not source_year:
            source_year = ensure_current_academic_year()
        if not source_year:
            return Response(
                {"detail": "Source academic year not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_year = None
        target_exists = False
        target_from_create_payload = False
        target_plan = None
        if target_year_id:
            target_year = AcademicYear.objects.filter(pk=target_year_id).first()
            if not target_year:
                return Response(
                    {"detail": "Target academic year not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            target_exists = True
        else:
            target_payload = (
                request.data.get("target")
                if isinstance(request.data.get("target"), dict)
                else {}
            )
            target_name = request.data.get("name") or target_payload.get("name")
            target_start_date = request.data.get("start_date") or target_payload.get(
                "start_date"
            )
            target_end_date = request.data.get("end_date") or target_payload.get(
                "end_date"
            )
            parsed_start = parse_date(target_start_date) if target_start_date else None
            parsed_end = parse_date(target_end_date) if target_end_date else None

            if target_start_date and parsed_start is None:
                return Response(
                    {"detail": "start_date must be in YYYY-MM-DD format."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if target_end_date and parsed_end is None:
                return Response(
                    {"detail": "end_date must be in YYYY-MM-DD format."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            target_plan = plan_next_academic_year(
                source_year,
                name=target_name,
                start_date=parsed_start,
                end_date=parsed_end,
            )
            planned_existing = target_plan.get("existing_year")
            if planned_existing:
                target_year = planned_existing
                target_exists = True
            else:
                target_year = AcademicYear(
                    name=target_plan["name"],
                    start_date=target_plan["start_date"],
                    end_date=target_plan["end_date"],
                    is_current=False,
                )
            target_from_create_payload = True

        if target_year is None:
            return Response(
                {"detail": "Target academic year not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        options_payload = (
            request.data.get("options")
            if isinstance(request.data.get("options"), dict)
            else {}
        )
        options = YearRolloverOptions(
            migrate_subjects=self._to_bool(
                options_payload.get(
                    "migrate_subjects", options_payload.get("migrate_courses", True)
                ),
                True,
            ),
            migrate_lessons=self._to_bool(
                options_payload.get(
                    "migrate_lessons", options_payload.get("migrate_chapters", True)
                ),
                True,
            ),
            migrate_assessments=self._to_bool(
                options_payload.get(
                    "migrate_assessments",
                    options_payload.get(
                        "migrate_quizzes",
                        options_payload.get("migrate_exercises", True),
                    ),
                ),
                True,
            ),
            migrate_timetable=self._to_bool(
                options_payload.get("migrate_timetable", True), True
            ),
            auto_upgrade_students=self._to_bool(
                options_payload.get("auto_upgrade_students", False), False
            ),
            promotion_rules=PromotionRules.from_payload(options_payload),
        )

        preview = build_rollover_preview(
            source_year=source_year,
            target_year=target_year,
            options=options,
        )
        blockers = []
        warnings = list(preview.get("warnings", []))

        if source_year.pk == getattr(target_year, "pk", None):
            blockers.append("Source year and target year must be different.")

        if target_from_create_payload and target_exists:
            blockers.append(
                "Target academic year already exists with this name. Choose existing target year mode or change target year name."
            )

        if options.auto_upgrade_students:
            promotion_preview = preview.get("promotion_preview") or {}
            if AcademicClass.objects.count() < 2:
                blockers.append(
                    "No next class configured for auto-upgrade. Add higher classes before promotion."
                )
            if int(promotion_preview.get("unknown_class_students", 0)) > 0:
                blockers.append(
                    "Some students have missing/invalid class mapping and cannot be promoted."
                )
            if int(promotion_preview.get("missing_next_section", 0)) > 0:
                blockers.append(
                    "Section mapping missing for some students in next class. Create matching section names before promotion."
                )

            if int(promotion_preview.get("final_class_students", 0)) > 0:
                warnings.append(
                    "Students in the highest class will remain in place (no next class)."
                )
            if int(promotion_preview.get("insufficient_data", 0)) > 0:
                warnings.append(
                    "Some students lack enough score/attendance data for rule-based promotion."
                )

        preview_payload = {
            "dry_run": True,
            "can_execute": len(blockers) == 0,
            "source_year": source_year.name,
            "target_year": target_year.name,
            "target_exists": target_exists,
            "blockers": blockers,
            "warnings": warnings,
            "summary": preview.get("summary", {}),
            "promotion_preview": preview.get("promotion_preview") or {},
        }

        if dry_run:
            return Response(preview_payload, status=status.HTTP_200_OK)

        if blockers:
            return Response(
                {
                    "detail": "Rollover blocked by precheck. Run dry_run and resolve blockers.",
                    **preview_payload,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not confirm:
            return Response(
                {
                    "detail": "Rollover confirmation required. Re-submit with confirm=true after dry_run preview.",
                    **preview_payload,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if getattr(target_year, "pk", None) is None:
            target_year = create_next_academic_year(
                source_year,
                name=target_plan.get("name") if target_plan else target_year.name,
                start_date=(
                    target_plan.get("start_date")
                    if target_plan
                    else target_year.start_date
                ),
                end_date=(
                    target_plan.get("end_date") if target_plan else target_year.end_date
                ),
            )

        summary = rollover_academic_year(
            source_year=source_year,
            target_year=target_year,
            options=options,
        )

        return Response(
            {
                "dry_run": False,
                "executed": True,
                "source_year": source_year.name,
                "target_year": target_year.name,
                "warnings": warnings,
                "summary": summary,
            }
        )


class AcademicClassViewSet(viewsets.ModelViewSet):
    # Prefetch related sections and subjects for performance
    queryset = AcademicClass.objects.prefetch_related("sections", "subjects").all()
    serializer_class = AcademicClassSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrStaff()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = AcademicClass.objects.prefetch_related("sections", "subjects").all()
        user = getattr(self.request, "user", None)
        role = getattr(user, "role", None)
        if role == "teacher":
            teacher_profile = (
                Teacher.objects.prefetch_related("assigned_classes")
                .filter(user=user)
                .first()
            )
            if not teacher_profile:
                return queryset.none()
            return queryset.filter(
                id__in=teacher_profile.assigned_classes.values_list("id", flat=True)
            ).distinct()
        return queryset


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.select_related(
        "academic_class", "teacher", "teacher__user"
    ).prefetch_related(
        "additional_teachers",
        "additional_teachers__user",
    )
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Subject.objects.select_related(
            "academic_class", "teacher", "teacher__user", "academic_year"
        ).prefetch_related(
            "additional_teachers",
            "additional_teachers__user",
        )
        user = getattr(self.request, "user", None)
        role = getattr(user, "role", None)
        if role == "teacher":
            teacher_profile = (
                Teacher.objects.prefetch_related("assigned_classes")
                .filter(user=user)
                .first()
            )
            if not teacher_profile:
                return queryset.none()
            assigned_class_ids = teacher_profile.assigned_classes.values_list(
                "id", flat=True
            )
            queryset = queryset.filter(
                Q(teacher=teacher_profile)
                | Q(additional_teachers=teacher_profile)
                | Q(academic_class_id__in=assigned_class_ids)
            ).distinct()

        academic_year_param = self.request.query_params.get("academic_year")
        if academic_year_param:
            if str(academic_year_param).isdigit():
                queryset = queryset.filter(academic_year_id=academic_year_param)
            else:
                queryset = queryset.filter(academic_year__name=academic_year_param)
        elif role != "teacher":
            # Teachers see all their assigned subjects regardless of academic year;
            # other roles default to the current year to avoid listing historical subjects.
            current_year = ensure_current_academic_year()
            if current_year:
                queryset = queryset.filter(academic_year=current_year)
        return queryset

    def perform_create(self, serializer):
        academic_year = (
            serializer.validated_data.get("academic_year")
            or ensure_current_academic_year()
        )
        serializer.save(academic_year=academic_year)
