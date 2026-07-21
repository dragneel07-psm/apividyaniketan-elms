# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from academic.models import LessonProgress
from academic.models.assessment import Result
from academic.models.submission import Submission

from .models import Badge, PointTransaction, StudentBadge

logger = logging.getLogger(__name__)


def _db_alias(instance):
    state = getattr(instance, "_state", None)
    return (state.db if state else None) or "default"


def _get_evaluator(student, using="default"):
    from gamification.badge_evaluator import BadgeEvaluatorService

    try:
        tenant = student.user.tenant
    except Exception:
        tenant = None
    return BadgeEvaluatorService(student=student, tenant=tenant, using=using)


@receiver(post_save, sender=LessonProgress)
def award_lesson_xp(sender, instance, created, **kwargs):
    if not instance.completed:
        return

    using = _db_alias(instance)
    exists = (
        PointTransaction.objects.using(using)
        .filter(
            student=instance.student,
            description__contains=f"Completed lesson: {instance.lesson.title}",
        )
        .exists()
    )

    if not exists:
        points = 50
        try:
            tenant = instance.student.user.tenant
        except Exception:
            tenant = None

        if tenant:
            PointTransaction.objects.using(using).create(
                tenant=tenant,
                student=instance.student,
                points=points,
                description=f"Completed lesson: {instance.lesson.title}",
                activity_type="lesson",
            )
            logger.info(
                "Awarded %d XP to %s for lesson %s",
                points,
                instance.student,
                instance.lesson.title,
            )

    try:
        evaluator = _get_evaluator(instance.student, using=using)
        evaluator.on_lesson_completed()
    except Exception as exc:
        logger.warning("BadgeEvaluator on_lesson_completed failed: %s", exc)


@receiver(post_save, sender=Result)
def check_badges_on_result(sender, instance, created, **kwargs):
    """Evaluate assessments_passed and perfect_score badges after any Result is saved."""
    if not created:
        return
    using = _db_alias(instance)
    try:
        evaluator = _get_evaluator(instance.student, using=using)
        evaluator.on_assessment_result(instance)
    except Exception as exc:
        logger.warning("BadgeEvaluator on_assessment_result failed: %s", exc)


@receiver(post_save, sender=Submission)
def check_early_bird_badge(sender, instance, created, **kwargs):
    """Evaluate early_bird badge when a submission is made before the due date."""
    if not created:
        return
    if instance.status != "submitted":
        return
    using = _db_alias(instance)
    try:
        evaluator = _get_evaluator(instance.student, using=using)
        evaluator.on_early_submission(instance)
    except Exception as exc:
        logger.warning("BadgeEvaluator on_early_submission failed: %s", exc)
