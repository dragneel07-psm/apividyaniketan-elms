# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from django.db import connection, transaction
from django.db.models import Q
from django.utils import timezone

from academic.models import (
    AcademicClass,
    AcademicYear,
    Assessment,
    Attendance,
    Chapter,
    Lesson,
    LessonMaterial,
    Result,
    Section,
    Student,
    Subject,
    Timetable,
)
from academic.models.question import Question


@dataclass
class PromotionRules:
    min_score_percentage: Optional[float] = None
    min_attendance_percentage: Optional[float] = None
    manual_promote_student_ids: tuple[str, ...] = ()
    manual_hold_student_ids: tuple[str, ...] = ()

    @classmethod
    def from_payload(cls, payload: Optional[object]) -> "PromotionRules":
        if not isinstance(payload, dict):
            return cls()

        def _to_optional_percent(value: object) -> Optional[float]:
            if value is None:
                return None
            if isinstance(value, str):
                raw = value.strip()
                if raw == "":
                    return None
                value = raw
            try:
                parsed = float(value)  # type: ignore[arg-type]
            except (TypeError, ValueError):
                return None
            if parsed < 0:
                parsed = 0.0
            if parsed > 100:
                parsed = 100.0
            return parsed

        def _to_student_ids(value: object) -> tuple[str, ...]:
            if value is None:
                return ()
            if isinstance(value, str):
                parts = [item.strip() for item in value.split(",")]
            elif isinstance(value, (list, tuple, set)):
                parts = [str(item).strip() for item in value]
            else:
                return ()

            cleaned = []
            seen = set()
            for item in parts:
                if not item:
                    continue
                key = item.lower()
                if key in seen:
                    continue
                seen.add(key)
                cleaned.append(item)
            return tuple(cleaned)

        return cls(
            min_score_percentage=_to_optional_percent(
                payload.get("min_score_percentage")
            ),
            min_attendance_percentage=_to_optional_percent(
                payload.get("min_attendance_percentage")
            ),
            manual_promote_student_ids=_to_student_ids(
                payload.get("manual_promote_student_ids")
            ),
            manual_hold_student_ids=_to_student_ids(
                payload.get("manual_hold_student_ids")
            ),
        )


@dataclass
class YearRolloverOptions:
    migrate_subjects: bool = True
    migrate_lessons: bool = True
    migrate_assessments: bool = True
    migrate_timetable: bool = True
    auto_upgrade_students: bool = False
    promotion_rules: PromotionRules = field(default_factory=PromotionRules)


def _to_date(value: Optional[object]) -> Optional[date]:
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d").date()
    return None


def _set_current_year(year: AcademicYear) -> AcademicYear:
    with transaction.atomic():
        AcademicYear.objects.exclude(pk=year.pk).update(is_current=False)
        if not year.is_current:
            year.is_current = True
            year.save(update_fields=["is_current", "updated_at"])
    _sync_tenant_current_academic_year(year)
    return year


def _sync_tenant_current_academic_year(year: AcademicYear) -> None:
    """
    Keep shared Tenant.current_academic_year aligned with tenant-schema AcademicYear.
    """
    try:
        from core.models import Tenant

        schema_name = getattr(connection, "schema_name", None)
        if not schema_name:
            return
        Tenant.objects.filter(schema_name=schema_name).update(
            current_academic_year=year.name
        )
    except Exception:
        # Best-effort sync only.
        return


def _default_cycle_for_day(today: date) -> tuple[date, date]:
    """
    School cycle heuristic: Apr 1 -> Mar 31.
    """
    if (today.month, today.day) >= (4, 1):
        start_year = today.year
    else:
        start_year = today.year - 1
    start = date(start_year, 4, 1)
    end = date(start_year + 1, 3, 31)
    return start, end


def plan_next_academic_year(
    source_year: Optional[AcademicYear] = None,
    *,
    name: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> Dict[str, object]:
    if source_year is None:
        source_year = AcademicYear.objects.order_by("-end_date").first()

    start = start_date
    end = end_date

    if source_year:
        if start is None:
            start = source_year.end_date + timedelta(days=1)
        if end is None:
            cycle_days = max(1, (source_year.end_date - source_year.start_date).days)
            end = start + timedelta(days=cycle_days)

    if start is None or end is None:
        today = timezone.localdate()
        start, end = _default_cycle_for_day(today)

    year_name = name or f"{start.year}-{end.year}"
    existing_year = AcademicYear.objects.filter(name=year_name).first()
    return {
        "name": year_name,
        "start_date": start,
        "end_date": end,
        "existing_year": existing_year,
    }


def create_next_academic_year(
    source_year: Optional[AcademicYear] = None,
    *,
    name: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> AcademicYear:
    plan = plan_next_academic_year(
        source_year,
        name=name,
        start_date=start_date,
        end_date=end_date,
    )
    existing = plan.get("existing_year")
    if isinstance(existing, AcademicYear):
        return existing

    next_year, _ = AcademicYear.objects.get_or_create(
        name=str(plan["name"]),
        defaults={
            "start_date": plan["start_date"],
            "end_date": plan["end_date"],
            "is_current": False,
        },
    )
    return next_year


def ensure_current_academic_year(
    today: Optional[date] = None,
) -> Optional[AcademicYear]:
    today = today or timezone.localdate()

    current = (
        AcademicYear.objects.filter(is_current=True).order_by("-start_date").first()
    )
    if current and current.start_date <= today <= current.end_date:
        _sync_tenant_current_academic_year(current)
        return current

    active_for_day = (
        AcademicYear.objects.filter(
            start_date__lte=today,
            end_date__gte=today,
        )
        .order_by("-start_date")
        .first()
    )
    if active_for_day:
        return _set_current_year(active_for_day)

    anchor = current or AcademicYear.objects.order_by("-end_date").first()
    if anchor and anchor.end_date < today:
        next_year = create_next_academic_year(anchor)
        return _set_current_year(next_year)

    if not anchor:
        start, end = _default_cycle_for_day(today)
        created_year, _ = AcademicYear.objects.get_or_create(
            name=f"{start.year}-{end.year}",
            defaults={"start_date": start, "end_date": end, "is_current": True},
        )
        return _set_current_year(created_year)

    # Fallback to most recent year if today is before all known ranges.
    return _set_current_year(anchor)


def get_current_academic_year() -> Optional[AcademicYear]:
    return ensure_current_academic_year()


PROMOTION_HOLD_REASON_LABELS: Dict[str, str] = {
    "manual_hold": "Manually marked as hold",
    "score_below_threshold": "Final score below threshold",
    "attendance_below_threshold": "Attendance below threshold",
    "insufficient_data": "Insufficient score/attendance data",
    "final_class": "Already in final class",
    "unknown_class": "Student has missing or invalid class mapping",
}


def _student_display_name(student: Student) -> str:
    if getattr(student, "user_id", None):
        full_name = f"{student.user.first_name} {student.user.last_name}".strip()
        if full_name:
            return full_name
        if student.user.username:
            return student.user.username
    return str(student.student_id)


def _evaluate_single_student_promotion(
    *,
    student: Student,
    classes: List[AcademicClass],
    class_index: Dict[int, int],
    rules: PromotionRules,
    manual_promote_ids: set[str],
    manual_hold_ids: set[str],
    academic_year: Optional[AcademicYear],
    include_unpublished_results: bool = False,
) -> Dict[str, object]:
    student_id_text = str(student.student_id)
    student_id_key = student_id_text.lower()

    hold_reason: Optional[str] = None
    average_score_percentage: Optional[float] = None
    attendance_percentage: Optional[float] = None
    next_class: Optional[AcademicClass] = None
    next_section: Optional[Section] = None
    missing_next_section = False

    manual_promote_applied = student_id_key in manual_promote_ids
    manual_hold_applied = student_id_key in manual_hold_ids

    if manual_hold_applied:
        hold_reason = "manual_hold"
    elif not student.academic_class_id or student.academic_class_id not in class_index:
        hold_reason = "unknown_class"
    else:
        if not manual_promote_applied:
            if rules.min_score_percentage is not None:
                result_filter = {
                    "student": student,
                    "assessment__is_final_assessment": True,
                    "assessment__subject__academic_class": student.academic_class,
                }
                if not include_unpublished_results:
                    result_filter["assessment__results_published"] = True
                result_qs = Result.objects.filter(**result_filter).select_related(
                    "assessment"
                )

                if academic_year is not None:
                    result_qs = result_qs.filter(
                        assessment__academic_year=academic_year
                    )

                if student.section_id:
                    result_qs = result_qs.filter(
                        Q(assessment__section=student.section)
                        | Q(assessment__section__isnull=True)
                    )
                else:
                    result_qs = result_qs.filter(assessment__section__isnull=True)

                percentages = []
                for result in result_qs:
                    total_marks = max(
                        float(getattr(result.assessment, "total_marks", 0) or 0), 1.0
                    )
                    percentages.append((float(result.score) / total_marks) * 100.0)

                if not percentages:
                    hold_reason = "insufficient_data"
                else:
                    average_score_percentage = sum(percentages) / len(percentages)
                    if average_score_percentage < rules.min_score_percentage:
                        hold_reason = "score_below_threshold"

            if hold_reason is None and rules.min_attendance_percentage is not None:
                attendance_qs = Attendance.objects.filter(
                    student=student,
                    subject__academic_class=student.academic_class,
                )
                if academic_year is not None:
                    attendance_qs = attendance_qs.filter(
                        date__gte=academic_year.start_date,
                        date__lte=academic_year.end_date,
                    )

                total_attendance = attendance_qs.count()
                if total_attendance <= 0:
                    hold_reason = "insufficient_data"
                else:
                    attended_count = attendance_qs.filter(
                        status__in=["present", "late", "excused"]
                    ).count()
                    attendance_percentage = (attended_count / total_attendance) * 100.0
                    if attendance_percentage < rules.min_attendance_percentage:
                        hold_reason = "attendance_below_threshold"

        if hold_reason is None:
            idx = class_index[student.academic_class_id]
            if idx >= len(classes) - 1:
                hold_reason = "final_class"
            else:
                next_class = classes[idx + 1]
                if student.section_id:
                    next_section = Section.objects.filter(
                        academic_class=next_class,
                        name=student.section.name,
                    ).first()
                    if next_section is None:
                        missing_next_section = True

    recommended_action = "hold" if hold_reason else "promote"
    warning_reasons = ["missing_next_section"] if missing_next_section else []

    return {
        "student_id": student_id_text,
        "student_name": _student_display_name(student),
        "class_id": student.academic_class_id,
        "class_name": getattr(student.academic_class, "name", None),
        "section_id": student.section_id,
        "section_name": getattr(student.section, "name", None),
        "recommended_action": recommended_action,
        "hold_reason": hold_reason,
        "hold_reason_label": (
            PROMOTION_HOLD_REASON_LABELS.get(hold_reason, "") if hold_reason else ""
        ),
        "warning_reasons": warning_reasons,
        "average_score_percentage": (
            round(average_score_percentage, 2)
            if average_score_percentage is not None
            else None
        ),
        "attendance_percentage": (
            round(attendance_percentage, 2)
            if attendance_percentage is not None
            else None
        ),
        "manual_promote_applied": manual_promote_applied,
        "manual_hold_applied": manual_hold_applied,
        "failed_score": hold_reason == "score_below_threshold",
        "failed_attendance": hold_reason == "attendance_below_threshold",
        "insufficient_data": hold_reason == "insufficient_data",
        "final_class": hold_reason == "final_class",
        "unknown_class": hold_reason == "unknown_class",
        "missing_next_section": missing_next_section,
        "next_class_id": getattr(next_class, "id", None),
        "next_class_name": getattr(next_class, "name", None),
        "next_section_id": getattr(next_section, "id", None),
        "next_section_name": getattr(next_section, "name", None),
        "_student": student,
        "_next_class": next_class,
        "_next_section": next_section,
    }


def list_student_promotion_candidates(
    *,
    academic_class: Optional[AcademicClass] = None,
    section: Optional[Section] = None,
    academic_year: Optional[AcademicYear] = None,
    rules: Optional[PromotionRules] = None,
    include_unpublished_results: bool = False,
) -> List[Dict[str, object]]:
    classes = list(AcademicClass.objects.order_by("order", "id"))
    if not classes:
        return []

    rules = rules or PromotionRules()
    manual_promote_ids = {value.lower() for value in rules.manual_promote_student_ids}
    manual_hold_ids = {value.lower() for value in rules.manual_hold_student_ids}
    class_index = {cls.id: idx for idx, cls in enumerate(classes)}

    students_qs = Student.objects.select_related("academic_class", "section", "user")
    if section is not None:
        students_qs = students_qs.filter(section=section)
    elif academic_class is not None:
        students_qs = students_qs.filter(academic_class=academic_class)

    students_qs = students_qs.order_by(
        "academic_class__order",
        "academic_class__name",
        "section__name",
        "user__first_name",
        "user__last_name",
        "user__username",
    )

    rows: List[Dict[str, object]] = []
    for student in students_qs:
        evaluated = _evaluate_single_student_promotion(
            student=student,
            classes=classes,
            class_index=class_index,
            rules=rules,
            manual_promote_ids=manual_promote_ids,
            manual_hold_ids=manual_hold_ids,
            academic_year=academic_year,
            include_unpublished_results=include_unpublished_results,
        )
        evaluated.pop("_student", None)
        evaluated.pop("_next_class", None)
        evaluated.pop("_next_section", None)
        rows.append(evaluated)
    return rows


def promote_students_to_next_class(
    *,
    academic_class: Optional[AcademicClass] = None,
    section: Optional[Section] = None,
    academic_year: Optional[AcademicYear] = None,
    rules: Optional[PromotionRules] = None,
    dry_run: bool = False,
) -> Dict[str, int]:
    classes = list(AcademicClass.objects.order_by("order", "id"))
    if not classes:
        return {
            "promoted_students": 0,
            "skipped_students": 0,
            "failed_score": 0,
            "failed_attendance": 0,
            "manual_promoted": 0,
            "manual_held": 0,
            "insufficient_data": 0,
            "missing_next_section": 0,
            "final_class_students": 0,
            "unknown_class_students": 0,
        }

    class_index = {cls.id: idx for idx, cls in enumerate(classes)}
    promoted = 0
    skipped = 0
    failed_score = 0
    failed_attendance = 0
    manual_promoted = 0
    manual_held = 0
    insufficient_data = 0
    missing_next_section = 0
    final_class_students = 0
    unknown_class_students = 0

    rules = rules or PromotionRules()
    manual_promote_ids = {value.lower() for value in rules.manual_promote_student_ids}
    manual_hold_ids = {value.lower() for value in rules.manual_hold_student_ids}
    class_index = {cls.id: idx for idx, cls in enumerate(classes)}

    students_qs = Student.objects.select_related("academic_class", "section", "user")
    if section is not None:
        students_qs = students_qs.filter(section=section)
    elif academic_class is not None:
        students_qs = students_qs.filter(academic_class=academic_class)
    students_qs = students_qs.order_by(
        "academic_class__order",
        "academic_class__name",
        "section__name",
        "user__first_name",
        "user__last_name",
        "user__username",
    )

    for student in students_qs:
        evaluated = _evaluate_single_student_promotion(
            student=student,
            classes=classes,
            class_index=class_index,
            rules=rules,
            manual_promote_ids=manual_promote_ids,
            manual_hold_ids=manual_hold_ids,
            academic_year=academic_year,
            include_unpublished_results=False,
        )

        if evaluated["recommended_action"] != "promote":
            skipped += 1
            if bool(evaluated["manual_hold_applied"]):
                manual_held += 1
            if bool(evaluated["failed_score"]):
                failed_score += 1
            if bool(evaluated["failed_attendance"]):
                failed_attendance += 1
            if bool(evaluated["insufficient_data"]):
                insufficient_data += 1
            if bool(evaluated["final_class"]):
                final_class_students += 1
            if bool(evaluated["unknown_class"]):
                unknown_class_students += 1
            continue

        if bool(evaluated["missing_next_section"]):
            missing_next_section += 1

        if not dry_run:
            next_class = evaluated["_next_class"]
            next_section = evaluated["_next_section"]
            if next_class is None:
                skipped += 1
                continue
            student.academic_class = next_class
            student.section = next_section
            student.save(update_fields=["academic_class", "section"])

        if bool(evaluated["manual_promote_applied"]):
            manual_promoted += 1
        promoted += 1

    return {
        "promoted_students": promoted,
        "skipped_students": skipped,
        "failed_score": failed_score,
        "failed_attendance": failed_attendance,
        "manual_promoted": manual_promoted,
        "manual_held": manual_held,
        "insufficient_data": insufficient_data,
        "missing_next_section": missing_next_section,
        "final_class_students": final_class_students,
        "unknown_class_students": unknown_class_students,
    }


def build_rollover_preview(
    *,
    source_year: AcademicYear,
    target_year: AcademicYear,
    options: YearRolloverOptions,
) -> Dict[str, object]:
    summary = {
        "subjects_to_migrate": 0,
        "chapters_to_migrate": 0,
        "lessons_to_migrate": 0,
        "materials_to_migrate": 0,
        "assessments_to_migrate": 0,
        "questions_to_migrate": 0,
        "timetable_entries_to_migrate": 0,
    }
    warnings = []

    target_exists = bool(getattr(target_year, "pk", None))
    target_year_id = getattr(target_year, "pk", None)

    source_subjects = list(
        Subject.objects.filter(academic_year=source_year).select_related(
            "academic_class", "teacher"
        )
    )
    source_subjects_by_id: Dict[int, Subject] = {
        subject.id: subject for subject in source_subjects
    }

    target_subjects_by_key: Dict[tuple[str, int], Subject] = {}
    if target_exists and target_year_id is not None:
        for subject in Subject.objects.filter(
            academic_year_id=target_year_id
        ).select_related("academic_class"):
            target_subjects_by_key[(subject.name, subject.academic_class_id)] = subject

    subject_map: Dict[int, Subject] = {}
    if options.migrate_subjects:
        for source_subject in source_subjects:
            mapped = target_subjects_by_key.get(
                (source_subject.name, source_subject.academic_class_id)
            )
            if mapped is None:
                summary["subjects_to_migrate"] += 1
                if target_exists:
                    mapped = source_subject  # placeholder for downstream counts
                else:
                    mapped = source_subject
            subject_map[source_subject.id] = mapped
    else:
        for source_subject in source_subjects:
            mapped = target_subjects_by_key.get(
                (source_subject.name, source_subject.academic_class_id)
            )
            if mapped:
                subject_map[source_subject.id] = mapped

    if not subject_map and (options.migrate_assessments or options.migrate_lessons):
        warnings.append(
            "No subject mapping found for target year. Assessments/lessons cannot be migrated unless subjects are migrated or pre-created."
        )

    if options.migrate_assessments and subject_map:
        source_assessments = (
            Assessment.objects.filter(
                academic_year=source_year,
                subject_id__in=subject_map.keys(),
            )
            .select_related("section", "subject")
            .prefetch_related("questions")
        )

        for source_assessment in source_assessments:
            source_subject = source_subjects_by_id.get(source_assessment.subject_id)
            if source_subject is None:
                continue

            target_subject = target_subjects_by_key.get(
                (source_subject.name, source_subject.academic_class_id)
            )
            if target_subject is None and target_exists:
                continue

            target_section = None
            if source_assessment.section_id:
                target_section = Section.objects.filter(
                    academic_class=source_assessment.section.academic_class,
                    name=source_assessment.section.name,
                ).first()

            assessment_exists = False
            if target_exists and target_subject is not None:
                assessment_exists = Assessment.objects.filter(
                    academic_year=target_year,
                    subject=target_subject,
                    section=target_section,
                    title=source_assessment.title,
                    type=source_assessment.type,
                ).exists()

            if not assessment_exists:
                summary["assessments_to_migrate"] += 1
                summary["questions_to_migrate"] += source_assessment.questions.count()

    if options.migrate_lessons and subject_map:
        source_chapters = (
            Chapter.objects.filter(subject_id__in=subject_map.keys())
            .select_related("subject")
            .prefetch_related("lessons__materials")
        )

        for source_chapter in source_chapters:
            source_subject = source_subjects_by_id.get(source_chapter.subject_id)
            if source_subject is None:
                continue
            target_subject = target_subjects_by_key.get(
                (source_subject.name, source_subject.academic_class_id)
            )

            chapter_exists = False
            existing_chapter = None
            if target_exists and target_subject is not None:
                existing_chapter = Chapter.objects.filter(
                    subject=target_subject,
                    title=source_chapter.title,
                    order=source_chapter.order,
                ).first()
                chapter_exists = existing_chapter is not None

            if not chapter_exists:
                summary["chapters_to_migrate"] += 1

            for source_lesson in source_chapter.lessons.all():
                lesson_exists = False
                if chapter_exists and existing_chapter is not None:
                    lesson_exists = Lesson.objects.filter(
                        chapter=existing_chapter,
                        title=source_lesson.title,
                        order=source_lesson.order,
                    ).exists()

                if not lesson_exists:
                    summary["lessons_to_migrate"] += 1
                    summary["materials_to_migrate"] += source_lesson.materials.count()

    if options.migrate_timetable:
        source_slots = Timetable.objects.filter(academic_year=source_year)
        for source_slot in source_slots:
            slot_exists = False
            if target_exists:
                slot_exists = Timetable.objects.filter(
                    academic_year=target_year,
                    academic_class=source_slot.academic_class,
                    day_of_week=source_slot.day_of_week,
                    start_time=source_slot.start_time,
                    end_time=source_slot.end_time,
                    subject_name=source_slot.subject_name,
                    entry_type=source_slot.entry_type,
                ).exists()

            if not slot_exists:
                summary["timetable_entries_to_migrate"] += 1

    promotion_preview: Dict[str, int] = {}
    if options.auto_upgrade_students:
        promotion_preview = promote_students_to_next_class(
            academic_year=source_year,
            rules=options.promotion_rules,
            dry_run=True,
        )

    return {
        "summary": summary,
        "warnings": warnings,
        "promotion_preview": promotion_preview,
    }


@transaction.atomic
def rollover_academic_year(
    *,
    source_year: AcademicYear,
    target_year: AcademicYear,
    options: YearRolloverOptions,
) -> Dict[str, int]:
    summary = {
        "subjects_migrated": 0,
        "chapters_migrated": 0,
        "lessons_migrated": 0,
        "materials_migrated": 0,
        "assessments_migrated": 0,
        "questions_migrated": 0,
        "timetable_entries_migrated": 0,
        "students_promoted": 0,
        "students_skipped": 0,
    }

    year_delta_days = (target_year.start_date - source_year.start_date).days

    def shift_datetime(value):
        if value is None:
            return None
        return value + timedelta(days=year_delta_days)

    source_subjects = Subject.objects.filter(academic_year=source_year).select_related(
        "academic_class", "teacher"
    )
    subject_map: Dict[int, Subject] = {}

    if options.migrate_subjects:
        for source_subject in source_subjects:
            target_subject, created = Subject.objects.get_or_create(
                name=source_subject.name,
                academic_class=source_subject.academic_class,
                academic_year=target_year,
                defaults={
                    "code": source_subject.code,
                    "description": source_subject.description,
                    "credits": source_subject.credits,
                    "is_elective": source_subject.is_elective,
                    "is_active": source_subject.is_active,
                    "teacher": source_subject.teacher,
                },
            )
            if created:
                target_subject.additional_teachers.set(
                    source_subject.additional_teachers.all()
                )
                summary["subjects_migrated"] += 1
            subject_map[source_subject.id] = target_subject
    else:
        # Build best-effort map against already-existing subjects in target year.
        for source_subject in source_subjects:
            mapped = Subject.objects.filter(
                name=source_subject.name,
                academic_class=source_subject.academic_class,
                academic_year=target_year,
            ).first()
            if mapped:
                subject_map[source_subject.id] = mapped

    assessment_map: Dict[str, Assessment] = {}
    if options.migrate_assessments and subject_map:
        source_assessments = (
            Assessment.objects.filter(
                academic_year=source_year,
                subject_id__in=subject_map.keys(),
            )
            .select_related("subject", "section")
            .prefetch_related("questions")
        )

        for source_assessment in source_assessments:
            target_subject = subject_map.get(source_assessment.subject_id)
            if not target_subject:
                continue

            target_section = None
            if source_assessment.section_id:
                target_section = Section.objects.filter(
                    academic_class=source_assessment.section.academic_class,
                    name=source_assessment.section.name,
                ).first()

            target_assessment, created = Assessment.objects.get_or_create(
                academic_year=target_year,
                subject=target_subject,
                section=target_section,
                title=source_assessment.title,
                type=source_assessment.type,
                defaults={
                    "description": source_assessment.description,
                    "total_marks": source_assessment.total_marks,
                    "passing_marks": source_assessment.passing_marks,
                    "scheduled_at": shift_datetime(source_assessment.scheduled_at),
                    "due_date": shift_datetime(source_assessment.due_date),
                    "duration_minutes": source_assessment.duration_minutes,
                    "blooms_level": source_assessment.blooms_level,
                    "is_final_assessment": source_assessment.is_final_assessment,
                },
            )

            assessment_map[str(source_assessment.assessment_id)] = target_assessment

            if created:
                summary["assessments_migrated"] += 1
                questions_to_create = []
                for source_question in source_assessment.questions.all():
                    questions_to_create.append(
                        Question(
                            assessment=target_assessment,
                            text=source_question.text,
                            type=source_question.type,
                            tags=source_question.tags,
                            difficulty=source_question.difficulty,
                            options=source_question.options,
                            correct_answer=source_question.correct_answer,
                            points=source_question.points,
                            order=source_question.order,
                        )
                    )
                if questions_to_create:
                    Question.objects.bulk_create(questions_to_create, batch_size=200)
                    summary["questions_migrated"] += len(questions_to_create)

    if options.migrate_lessons and subject_map:
        source_chapters = (
            Chapter.objects.filter(subject_id__in=subject_map.keys())
            .select_related("subject")
            .prefetch_related("lessons__materials")
        )

        for source_chapter in source_chapters:
            target_subject = subject_map.get(source_chapter.subject_id)
            if not target_subject:
                continue

            target_chapter, chapter_created = Chapter.objects.get_or_create(
                subject=target_subject,
                title=source_chapter.title,
                order=source_chapter.order,
                defaults={
                    "description": source_chapter.description,
                    "is_published": source_chapter.is_published,
                },
            )
            if chapter_created:
                summary["chapters_migrated"] += 1

            for source_lesson in source_chapter.lessons.all():
                linked_assessment = None
                if source_lesson.assessment_id:
                    linked_assessment = assessment_map.get(
                        str(source_lesson.assessment_id)
                    )

                target_lesson, lesson_created = Lesson.objects.get_or_create(
                    chapter=target_chapter,
                    title=source_lesson.title,
                    order=source_lesson.order,
                    defaults={
                        "content_type": source_lesson.content_type,
                        "content": source_lesson.content,
                        "video_url": source_lesson.video_url,
                        "interactive_data": source_lesson.interactive_data,
                        "assessment": linked_assessment,
                        "is_published": source_lesson.is_published,
                        "duration_minutes": source_lesson.duration_minutes,
                    },
                )

                if (
                    not lesson_created
                    and linked_assessment
                    and target_lesson.assessment_id != linked_assessment.assessment_id
                ):
                    target_lesson.assessment = linked_assessment
                    target_lesson.save(update_fields=["assessment"])

                if lesson_created:
                    summary["lessons_migrated"] += 1
                    materials_to_create = []
                    for source_material in source_lesson.materials.all():
                        materials_to_create.append(
                            LessonMaterial(
                                lesson=target_lesson,
                                title=source_material.title,
                                file=source_material.file,
                                link=source_material.link,
                                material_type=source_material.material_type,
                            )
                        )
                    if materials_to_create:
                        LessonMaterial.objects.bulk_create(
                            materials_to_create, batch_size=200
                        )
                        summary["materials_migrated"] += len(materials_to_create)

    if options.migrate_timetable:
        source_slots = Timetable.objects.filter(
            academic_year=source_year
        ).select_related("teacher")
        timetable_to_create = []
        for source_slot in source_slots:
            already_exists = Timetable.objects.filter(
                academic_year=target_year,
                academic_class=source_slot.academic_class,
                day_of_week=source_slot.day_of_week,
                start_time=source_slot.start_time,
                end_time=source_slot.end_time,
                subject_name=source_slot.subject_name,
                entry_type=source_slot.entry_type,
            ).exists()
            if already_exists:
                continue

            timetable_to_create.append(
                Timetable(
                    academic_year=target_year,
                    academic_class=source_slot.academic_class,
                    day_of_week=source_slot.day_of_week,
                    start_time=source_slot.start_time,
                    end_time=source_slot.end_time,
                    subject_name=source_slot.subject_name,
                    teacher=source_slot.teacher,
                    room_number=source_slot.room_number,
                    entry_type=source_slot.entry_type,
                    status=source_slot.status,
                    approval_comment=source_slot.approval_comment,
                    created_by=source_slot.created_by,
                    approved_by=source_slot.approved_by,
                    approved_at=source_slot.approved_at,
                )
            )

        if timetable_to_create:
            Timetable.objects.bulk_create(timetable_to_create, batch_size=200)
            summary["timetable_entries_migrated"] = len(timetable_to_create)

    if options.auto_upgrade_students:
        promotion_summary = promote_students_to_next_class(
            academic_year=source_year,
            rules=options.promotion_rules,
        )
        summary["students_promoted"] = promotion_summary["promoted_students"]
        summary["students_skipped"] = promotion_summary["skipped_students"]

    _set_current_year(target_year)
    return summary
