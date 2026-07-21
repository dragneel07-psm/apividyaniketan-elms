# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Shared RBAC helpers for assessment views.
"""

import logging

from django.db import models

from academic.models import AcademicYear
from academic.models.teacher import Teacher
from academic.services.academic_year_service import ensure_current_academic_year

logger = logging.getLogger(__name__)


def _to_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _find_academic_year(raw_year):
    if raw_year is None or raw_year == "":
        return None
    if isinstance(raw_year, AcademicYear):
        return raw_year
    if str(raw_year).isdigit():
        return AcademicYear.objects.filter(pk=int(raw_year)).first()
    return AcademicYear.objects.filter(name=str(raw_year)).first()


def _resolve_request_year(request):
    raw_year = request.query_params.get("academic_year")
    if raw_year:
        return _find_academic_year(raw_year), True
    return ensure_current_academic_year(), False


def _role(user) -> str:
    return (getattr(user, "role", "") or "").lower()


def _is_admin_manager(user) -> bool:
    return _role(user) in {"admin", "staff", "saas_admin", "management", "school_admin"}


def _is_content_manager(user) -> bool:
    return _role(user) == "teacher" or _is_admin_manager(user)


def _teacher_profile(user):
    return (
        Teacher.objects.prefetch_related("assigned_classes").filter(user=user).first()
    )


def _teacher_assessment_visibility_q(user, prefix: str = ""):
    teacher = _teacher_profile(user)
    if not teacher:
        return models.Q(pk__in=[])

    class_ids = [
        cid for cid in teacher.assigned_classes.values_list("id", flat=True) if cid
    ]
    pre = f"{prefix}__" if prefix else ""
    return (
        models.Q(**{f"{pre}subject__teacher": teacher})
        | models.Q(**{f"{pre}subject__additional_teachers": teacher})
        | models.Q(**{f"{pre}subject__academic_class_id__in": class_ids})
    )


def _teacher_can_manage_subject(user, subject) -> bool:
    teacher = _teacher_profile(user)
    if not teacher or subject is None:
        return False

    if teacher.teacher_id == getattr(subject, "teacher_id", None):
        return True
    if subject.additional_teachers.filter(teacher_id=teacher.teacher_id).exists():
        return True
    class_id = getattr(subject, "academic_class_id", None)
    return bool(class_id and teacher.assigned_classes.filter(id=class_id).exists())


def _teacher_can_manage_assessment(user, assessment) -> bool:
    if assessment is None or not getattr(assessment, "subject_id", None):
        return False
    return _teacher_can_manage_subject(user, assessment.subject)
