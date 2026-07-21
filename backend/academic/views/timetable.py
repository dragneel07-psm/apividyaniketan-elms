# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import transaction
from django.db.models import Case, IntegerField, Q, Value, When
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import AcademicClass, AcademicYear, Parent, Student, Teacher, Timetable
from ..serializers.timetable import TimetableSerializer
from ..services.academic_year_service import ensure_current_academic_year


class TimetableViewSet(viewsets.ModelViewSet):
    queryset = Timetable.objects.all()
    serializer_class = TimetableSerializer
    permission_classes = [IsAuthenticated]

    DAY_SEQUENCE = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]

    def _base_queryset(self, *, apply_year_scope=True):
        queryset = Timetable.objects.select_related(
            "academic_year",
            "academic_class",
            "teacher__user",
            "created_by",
            "approved_by",
        )
        if not apply_year_scope:
            return queryset

        requested_year = self.request.query_params.get("academic_year")
        if requested_year:
            academic_year = self._find_academic_year(requested_year)
            if not academic_year:
                return queryset.none()
            return queryset.filter(academic_year=academic_year)

        current_year = ensure_current_academic_year()
        if current_year:
            return queryset.filter(academic_year=current_year)
        return queryset

    def _find_academic_year(self, raw_year):
        if raw_year is None or raw_year == "":
            return None
        if isinstance(raw_year, AcademicYear):
            return raw_year
        if str(raw_year).isdigit():
            return AcademicYear.objects.filter(pk=int(raw_year)).first()
        return AcademicYear.objects.filter(name=str(raw_year)).first()

    def _ordered_queryset(self, queryset):
        return queryset.annotate(
            _day_order=Case(
                *[
                    When(day_of_week=day, then=Value(idx))
                    for idx, day in enumerate(self.DAY_SEQUENCE, start=1)
                ],
                default=Value(99),
                output_field=IntegerField(),
            )
        ).order_by("_day_order", "start_time", "timetable_id")

    def _is_timetable_manager(self, user):
        return bool(
            user
            and user.is_authenticated
            and user.role in ["admin", "staff", "management", "saas_admin"]
        )

    def _teacher_profile(self, user):
        if not user or not user.is_authenticated or user.role != "teacher":
            return None
        return (
            Teacher.objects.prefetch_related("assigned_classes")
            .filter(user=user)
            .first()
        )

    def _assigned_class_ids(self, teacher_profile):
        if not teacher_profile:
            return set()
        return set(teacher_profile.assigned_classes.values_list("id", flat=True))

    def _to_bool(self, value, default=False):
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "on"}
        return bool(value)

    def _can_view_class(self, user, class_id):
        if self._is_timetable_manager(user):
            return True

        if user.role == "teacher":
            teacher_profile = self._teacher_profile(user)
            return bool(
                teacher_profile
                and class_id in self._assigned_class_ids(teacher_profile)
            )

        if user.role == "student":
            student = Student.objects.filter(user=user).first()
            return bool(student and student.academic_class_id == class_id)

        if user.role == "parent":
            parent = (
                Parent.objects.prefetch_related("students").filter(user=user).first()
            )
            if not parent:
                return False
            return class_id in set(
                cid
                for cid in parent.students.values_list("academic_class_id", flat=True)
                if cid
            )

        return False

    def _validate_no_overlap(
        self,
        *,
        academic_year_id,
        academic_class_id,
        day_of_week,
        start_time,
        end_time,
        exclude_timetable_id=None,
        only_approved=True,
    ):
        conflicts = self._base_queryset(apply_year_scope=False).filter(
            academic_year_id=academic_year_id,
            academic_class_id=academic_class_id,
            day_of_week=day_of_week,
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if only_approved:
            conflicts = conflicts.filter(status="approved")
        if exclude_timetable_id:
            conflicts = conflicts.exclude(timetable_id=exclude_timetable_id)

        if conflicts.exists():
            raise ValidationError(
                {
                    "non_field_errors": [
                        "This time range overlaps with an existing approved timetable slot for the class."
                    ]
                }
            )

    def _validate_internal_overlaps(self, slots):
        grouped_slots = {}
        for idx, slot in enumerate(slots):
            grouped_slots.setdefault(slot["day_of_week"], []).append((idx, slot))

        overlap_errors = []
        for day, day_slots in grouped_slots.items():
            day_slots.sort(key=lambda item: item[1]["start_time"])
            for index in range(1, len(day_slots)):
                prev_row_index, prev_slot = day_slots[index - 1]
                row_index, slot = day_slots[index]
                if slot["start_time"] < prev_slot["end_time"]:
                    overlap_errors.append(
                        f"Rows {prev_row_index + 1} and {row_index + 1} overlap on {day}."
                    )

        if overlap_errors:
            raise ValidationError({"slots": overlap_errors})

    def _build_main_slot_objects(
        self, *, academic_year, academic_class_id, validated_slots, actor
    ):
        approved_time = timezone.now()
        return [
            Timetable(
                academic_year=academic_year,
                academic_class_id=academic_class_id,
                day_of_week=slot["day_of_week"],
                start_time=slot["start_time"],
                end_time=slot["end_time"],
                subject_name=slot["subject_name"],
                teacher=slot.get("teacher"),
                room_number=slot.get("room_number"),
                entry_type="main",
                status="approved",
                created_by=actor,
                approved_by=actor,
                approved_at=approved_time,
            )
            for slot in validated_slots
        ]

    def _build_overview_payload(self, *, academic_class, slots):
        serialized_slots = self.get_serializer(slots, many=True).data

        grouped = {day: [] for day in self.DAY_SEQUENCE}
        for item in serialized_slots:
            grouped.setdefault(item["day_of_week"], []).append(item)

        total_slots = len(serialized_slots)
        approved_slots = sum(
            1 for item in serialized_slots if item.get("status") == "approved"
        )
        pending_slots = sum(
            1 for item in serialized_slots if item.get("status") == "pending"
        )
        main_slots = sum(
            1 for item in serialized_slots if item.get("entry_type") == "main"
        )
        extra_slots = sum(
            1 for item in serialized_slots if item.get("entry_type") == "extra"
        )

        day_payload = []
        for day in self.DAY_SEQUENCE:
            day_slots = grouped.get(day, [])
            day_payload.append(
                {
                    "day_of_week": day,
                    "total_slots": len(day_slots),
                    "approved_slots": sum(
                        1 for item in day_slots if item.get("status") == "approved"
                    ),
                    "main_slots": sum(
                        1 for item in day_slots if item.get("entry_type") == "main"
                    ),
                    "extra_slots": sum(
                        1 for item in day_slots if item.get("entry_type") == "extra"
                    ),
                    "slots": day_slots,
                }
            )

        return {
            "academic_year": (
                serialized_slots[0]["academic_year"] if serialized_slots else None
            ),
            "academic_year_name": (
                serialized_slots[0].get("academic_year_name")
                if serialized_slots
                else None
            ),
            "academic_class": academic_class.id,
            "academic_class_name": academic_class.name,
            "total_slots": total_slots,
            "approved_slots": approved_slots,
            "pending_slots": pending_slots,
            "main_slots": main_slots,
            "extra_slots": extra_slots,
            "days": day_payload,
        }

    def get_queryset(self):
        user = self.request.user
        queryset = self._base_queryset().all()

        class_id = self.request.query_params.get(
            "academic_class"
        ) or self.request.query_params.get("class")
        if class_id:
            queryset = queryset.filter(academic_class_id=class_id)

        day = self.request.query_params.get("day_of_week")
        if day:
            queryset = queryset.filter(day_of_week=day)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        entry_type = self.request.query_params.get("entry_type")
        if entry_type:
            queryset = queryset.filter(entry_type=entry_type)

        if self._is_timetable_manager(user):
            return self._ordered_queryset(queryset)

        if user.role == "teacher":
            teacher_profile = self._teacher_profile(user)
            if not teacher_profile:
                return Timetable.objects.none()

            assigned_class_ids = list(
                teacher_profile.assigned_classes.values_list("id", flat=True)
            )
            visible = Q(created_by=user) | Q(teacher=teacher_profile, status="approved")
            if assigned_class_ids:
                visible |= Q(
                    academic_class_id__in=assigned_class_ids, status="approved"
                )
            return self._ordered_queryset(queryset.filter(visible).distinct())

        if user.role == "student":
            student = (
                Student.objects.select_related("academic_class")
                .filter(user=user)
                .first()
            )
            if not student or not student.academic_class_id:
                return Timetable.objects.none()
            return self._ordered_queryset(
                queryset.filter(
                    academic_class_id=student.academic_class_id, status="approved"
                )
            )

        if user.role == "parent":
            parent = (
                Parent.objects.prefetch_related("students").filter(user=user).first()
            )
            if not parent:
                return Timetable.objects.none()

            class_ids = [
                cid
                for cid in parent.students.values_list("academic_class_id", flat=True)
                if cid
            ]
            if not class_ids:
                return Timetable.objects.none()

            return self._ordered_queryset(
                queryset.filter(academic_class_id__in=class_ids, status="approved")
            )

        return Timetable.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        academic_year = (
            serializer.validated_data.get("academic_year")
            or ensure_current_academic_year()
        )
        if not academic_year:
            raise ValidationError({"academic_year": "No active academic year found."})

        if user.role == "teacher":
            teacher_profile = self._teacher_profile(user)
            if not teacher_profile:
                raise PermissionDenied("Teacher profile not found.")
            assigned_class_ids = self._assigned_class_ids(teacher_profile)

            requested_entry_type = serializer.validated_data.get("entry_type", "extra")
            if requested_entry_type != "extra":
                raise PermissionDenied(
                    "Teachers can only create extra timetable requests."
                )

            requested_class = serializer.validated_data.get("academic_class")
            if not requested_class or requested_class.id not in assigned_class_ids:
                raise PermissionDenied(
                    "Teachers can only request extra classes for their assigned classes."
                )

            requested_teacher = serializer.validated_data.get("teacher")
            if (
                requested_teacher
                and requested_teacher.teacher_id != teacher_profile.teacher_id
            ):
                raise ValidationError(
                    {
                        "teacher": "Teachers can only assign themselves for extra class requests."
                    }
                )

            self._validate_no_overlap(
                academic_year_id=academic_year.id,
                academic_class_id=requested_class.id,
                day_of_week=serializer.validated_data.get("day_of_week"),
                start_time=serializer.validated_data.get("start_time"),
                end_time=serializer.validated_data.get("end_time"),
                only_approved=True,
            )

            serializer.save(
                academic_year=academic_year,
                entry_type="extra",
                status="pending",
                teacher=requested_teacher or teacher_profile,
                created_by=user,
                approved_by=None,
                approved_at=None,
            )
            return

        if self._is_timetable_manager(user):
            requested_status = serializer.validated_data.get("status", "approved")
            if requested_status not in {"pending", "approved", "rejected"}:
                requested_status = "approved"

            if requested_status == "approved":
                requested_class = serializer.validated_data.get("academic_class")
                self._validate_no_overlap(
                    academic_year_id=academic_year.id,
                    academic_class_id=requested_class.id,
                    day_of_week=serializer.validated_data.get("day_of_week"),
                    start_time=serializer.validated_data.get("start_time"),
                    end_time=serializer.validated_data.get("end_time"),
                    only_approved=True,
                )

            approved_by = user if requested_status in {"approved", "rejected"} else None
            approved_at = (
                timezone.now() if requested_status in {"approved", "rejected"} else None
            )

            serializer.save(
                academic_year=academic_year,
                created_by=user,
                approved_by=approved_by,
                approved_at=approved_at,
            )
            return

        raise PermissionDenied(
            "You do not have permission to create timetable entries."
        )

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()

        if self._is_timetable_manager(user):
            new_status = serializer.validated_data.get("status", instance.status)
            target_year = (
                serializer.validated_data.get("academic_year", instance.academic_year)
                or ensure_current_academic_year()
            )
            if not target_year:
                raise ValidationError(
                    {"academic_year": "No active academic year found."}
                )
            target_class = serializer.validated_data.get(
                "academic_class", instance.academic_class
            )
            target_day = serializer.validated_data.get(
                "day_of_week", instance.day_of_week
            )
            target_start = serializer.validated_data.get(
                "start_time", instance.start_time
            )
            target_end = serializer.validated_data.get("end_time", instance.end_time)

            if new_status == "approved":
                self._validate_no_overlap(
                    academic_year_id=target_year.id,
                    academic_class_id=target_class.id,
                    day_of_week=target_day,
                    start_time=target_start,
                    end_time=target_end,
                    exclude_timetable_id=instance.timetable_id,
                    only_approved=True,
                )

            approved_by = instance.approved_by
            approved_at = instance.approved_at

            if new_status in {"approved", "rejected"}:
                approved_by = user
                approved_at = timezone.now()
            elif new_status == "pending":
                approved_by = None
                approved_at = None

            serializer.save(approved_by=approved_by, approved_at=approved_at)
            return

        if user.role == "teacher":
            teacher_profile = self._teacher_profile(user)
            if not teacher_profile:
                raise PermissionDenied("Teacher profile not found.")
            assigned_class_ids = self._assigned_class_ids(teacher_profile)

            if instance.entry_type != "extra" or instance.created_by_id != user.id:
                raise PermissionDenied(
                    "Teachers can only edit their own extra class requests."
                )
            if instance.status == "approved":
                raise PermissionDenied(
                    "Approved extra classes can only be edited by admin/management."
                )
            if (
                "entry_type" in serializer.validated_data
                or "status" in serializer.validated_data
                or "academic_year" in serializer.validated_data
            ):
                raise PermissionDenied(
                    "Teachers cannot change entry type or approval status."
                )

            target_class = serializer.validated_data.get(
                "academic_class", instance.academic_class
            )
            if target_class.id not in assigned_class_ids:
                raise PermissionDenied(
                    "Teachers can only request extra classes for their assigned classes."
                )

            target_day = serializer.validated_data.get(
                "day_of_week", instance.day_of_week
            )
            target_start = serializer.validated_data.get(
                "start_time", instance.start_time
            )
            target_end = serializer.validated_data.get("end_time", instance.end_time)
            self._validate_no_overlap(
                academic_year_id=instance.academic_year_id,
                academic_class_id=target_class.id,
                day_of_week=target_day,
                start_time=target_start,
                end_time=target_end,
                exclude_timetable_id=instance.timetable_id,
                only_approved=True,
            )

            requested_teacher = serializer.validated_data.get("teacher")
            if (
                requested_teacher
                and requested_teacher.teacher_id != teacher_profile.teacher_id
            ):
                raise ValidationError(
                    {
                        "teacher": "Teachers can only assign themselves for extra class requests."
                    }
                )

            serializer.save(
                teacher=requested_teacher or teacher_profile,
                status="pending",
                approved_by=None,
                approved_at=None,
            )
            return

        raise PermissionDenied(
            "You do not have permission to update timetable entries."
        )

    def destroy(self, request, *args, **kwargs):
        user = request.user
        instance = self.get_object()

        if self._is_timetable_manager(user):
            return super().destroy(request, *args, **kwargs)

        if user.role == "teacher":
            if instance.entry_type != "extra" or instance.created_by_id != user.id:
                raise PermissionDenied(
                    "Teachers can only delete their own extra class requests."
                )
            if instance.status == "approved":
                raise PermissionDenied(
                    "Approved extra classes can only be deleted by admin/management."
                )
            return super().destroy(request, *args, **kwargs)

        raise PermissionDenied(
            "You do not have permission to delete timetable entries."
        )

    @action(detail=False, methods=["get"])
    def my_timetable(self, request):
        if request.user.role not in ["student", "teacher", "parent"]:
            return Response(
                {
                    "detail": "This endpoint is available for student/teacher/parent roles."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def my_requests(self, request):
        if request.user.role != "teacher":
            return Response(
                {"detail": "Only teachers can view their extra timetable requests."},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = (
            self._base_queryset()
            .filter(created_by=request.user, entry_type="extra")
            .order_by("-timetable_id")
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def pending_requests(self, request):
        if not self._is_timetable_manager(request.user):
            return Response(
                {"detail": "Only admin/management can view pending requests."},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = self._ordered_queryset(
            self._base_queryset().filter(entry_type="extra", status="pending")
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def overview(self, request):
        class_id_raw = request.query_params.get(
            "academic_class"
        ) or request.query_params.get("class")
        if not class_id_raw:
            return Response(
                {"detail": "academic_class is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            class_id = int(class_id_raw)
        except (TypeError, ValueError):
            return Response(
                {"detail": "academic_class must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        academic_class = AcademicClass.objects.filter(id=class_id).first()
        if not academic_class:
            return Response(
                {"detail": "Class not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if not self._can_view_class(request.user, class_id):
            return Response(
                {"detail": "You do not have access to this class timetable."},
                status=status.HTTP_403_FORBIDDEN,
            )

        class_slots = list(self.get_queryset().filter(academic_class_id=class_id))
        return Response(
            self._build_overview_payload(
                academic_class=academic_class, slots=class_slots
            )
        )

    @action(detail=False, methods=["post"])
    def bulk_replace_main(self, request):
        if not self._is_timetable_manager(request.user):
            return Response(
                {
                    "detail": "Only admin/management can bulk replace the main timetable."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        class_id_raw = request.data.get("academic_class") or request.data.get("class")
        slots_payload = request.data.get("slots")
        academic_year_raw = request.data.get("academic_year")
        overwrite_existing = self._to_bool(
            request.data.get("overwrite_existing"), default=True
        )

        if not class_id_raw:
            return Response(
                {"detail": "academic_class is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(slots_payload, list) or not slots_payload:
            return Response(
                {"detail": "slots must be a non-empty list."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(slots_payload) > 400:
            return Response(
                {"detail": "slots cannot exceed 400 entries per request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            class_id = int(class_id_raw)
        except (TypeError, ValueError):
            return Response(
                {"detail": "academic_class must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        academic_class = AcademicClass.objects.filter(id=class_id).first()
        if not academic_class:
            return Response(
                {"detail": "Class not found."}, status=status.HTTP_404_NOT_FOUND
            )

        academic_year = (
            self._find_academic_year(academic_year_raw)
            if academic_year_raw
            else ensure_current_academic_year()
        )
        if not academic_year:
            return Response(
                {"detail": "Academic year not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_payload = []
        for slot in slots_payload:
            if not isinstance(slot, dict):
                return Response(
                    {"detail": "Each slot must be an object."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            normalized_payload.append(
                {
                    **slot,
                    "academic_class": class_id,
                    "entry_type": "main",
                    "status": "approved",
                }
            )

        serializer = self.get_serializer(data=normalized_payload, many=True)
        serializer.is_valid(raise_exception=True)
        validated_slots = serializer.validated_data
        self._validate_internal_overlaps(validated_slots)

        with transaction.atomic():
            existing_main_qs = self._base_queryset(apply_year_scope=False).filter(
                academic_year=academic_year,
                academic_class_id=class_id,
                entry_type="main",
            )
            if overwrite_existing:
                existing_main_qs.delete()
            elif existing_main_qs.exists():
                return Response(
                    {
                        "detail": "Main timetable already exists. Enable overwrite_existing to replace it."
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            for slot in validated_slots:
                self._validate_no_overlap(
                    academic_year_id=academic_year.id,
                    academic_class_id=class_id,
                    day_of_week=slot["day_of_week"],
                    start_time=slot["start_time"],
                    end_time=slot["end_time"],
                    only_approved=True,
                )

            Timetable.objects.bulk_create(
                self._build_main_slot_objects(
                    academic_year=academic_year,
                    academic_class_id=class_id,
                    validated_slots=validated_slots,
                    actor=request.user,
                ),
                batch_size=200,
            )

        class_slots = list(
            self._ordered_queryset(
                self._base_queryset(apply_year_scope=False).filter(
                    academic_year=academic_year,
                    academic_class_id=class_id,
                )
            )
        )
        payload = self._build_overview_payload(
            academic_class=academic_class, slots=class_slots
        )
        payload["created_count"] = len(validated_slots)
        return Response(payload, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def clone_main(self, request):
        if not self._is_timetable_manager(request.user):
            return Response(
                {"detail": "Only admin/management can clone main timetable schedules."},
                status=status.HTTP_403_FORBIDDEN,
            )

        source_class_raw = request.data.get("source_class")
        target_class_raw = request.data.get("target_class")
        academic_year_raw = request.data.get("academic_year")
        overwrite_existing = self._to_bool(
            request.data.get("overwrite_existing"), default=True
        )

        try:
            source_class_id = int(source_class_raw)
            target_class_id = int(target_class_raw)
        except (TypeError, ValueError):
            return Response(
                {"detail": "source_class and target_class must be valid integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if source_class_id == target_class_id:
            return Response(
                {"detail": "source_class and target_class must be different."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        source_class = AcademicClass.objects.filter(id=source_class_id).first()
        target_class = AcademicClass.objects.filter(id=target_class_id).first()
        if not source_class or not target_class:
            return Response(
                {"detail": "Source or target class not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        academic_year = (
            self._find_academic_year(academic_year_raw)
            if academic_year_raw
            else ensure_current_academic_year()
        )
        if not academic_year:
            return Response(
                {"detail": "Academic year not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        source_slots = list(
            self._ordered_queryset(
                self._base_queryset(apply_year_scope=False).filter(
                    academic_year=academic_year,
                    academic_class_id=source_class_id,
                    entry_type="main",
                    status="approved",
                )
            )
        )
        if not source_slots:
            return Response(
                {
                    "detail": "No approved main timetable slots found for the source class."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        template_slots = [
            {
                "day_of_week": slot.day_of_week,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "subject_name": slot.subject_name,
                "teacher": slot.teacher,
                "room_number": slot.room_number,
            }
            for slot in source_slots
        ]
        self._validate_internal_overlaps(template_slots)

        with transaction.atomic():
            target_main_qs = self._base_queryset(apply_year_scope=False).filter(
                academic_year=academic_year,
                academic_class_id=target_class_id,
                entry_type="main",
            )
            if overwrite_existing:
                target_main_qs.delete()
            elif target_main_qs.exists():
                return Response(
                    {
                        "detail": "Target class already has a main timetable. Enable overwrite_existing to replace it."
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            for slot in template_slots:
                self._validate_no_overlap(
                    academic_year_id=academic_year.id,
                    academic_class_id=target_class_id,
                    day_of_week=slot["day_of_week"],
                    start_time=slot["start_time"],
                    end_time=slot["end_time"],
                    only_approved=True,
                )

            Timetable.objects.bulk_create(
                self._build_main_slot_objects(
                    academic_year=academic_year,
                    academic_class_id=target_class_id,
                    validated_slots=template_slots,
                    actor=request.user,
                ),
                batch_size=200,
            )

        target_slots = list(
            self._ordered_queryset(
                self._base_queryset(apply_year_scope=False).filter(
                    academic_year=academic_year,
                    academic_class_id=target_class_id,
                )
            )
        )
        payload = self._build_overview_payload(
            academic_class=target_class, slots=target_slots
        )
        payload["created_count"] = len(template_slots)
        payload["source_class"] = source_class_id
        payload["target_class"] = target_class_id
        return Response(payload, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        if not self._is_timetable_manager(request.user):
            return Response(
                {"detail": "Only admin/management can approve or reject requests."},
                status=status.HTTP_403_FORBIDDEN,
            )

        timetable_entry = self.get_object()
        if timetable_entry.entry_type != "extra":
            return Response(
                {"detail": "Only extra class requests can be approved or rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if timetable_entry.status != "pending":
            return Response(
                {
                    "detail": "Only pending extra class requests can be approved or rejected."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = request.data.get("status")
        if new_status not in ["approved", "rejected"]:
            return Response(
                {"detail": "status must be either 'approved' or 'rejected'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status == "approved":
            self._validate_no_overlap(
                academic_year_id=timetable_entry.academic_year_id,
                academic_class_id=timetable_entry.academic_class_id,
                day_of_week=timetable_entry.day_of_week,
                start_time=timetable_entry.start_time,
                end_time=timetable_entry.end_time,
                exclude_timetable_id=timetable_entry.timetable_id,
                only_approved=True,
            )

        timetable_entry.status = new_status
        timetable_entry.approval_comment = request.data.get("approval_comment", "")
        timetable_entry.approved_by = request.user
        timetable_entry.approved_at = timezone.now()
        timetable_entry.save(
            update_fields=["status", "approval_comment", "approved_by", "approved_at"]
        )

        serializer = self.get_serializer(timetable_entry)
        return Response(serializer.data)
