# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""Scheduled library tasks."""

import logging
from datetime import date

from celery import shared_task
from django_tenants.utils import get_tenant_model, schema_context

logger = logging.getLogger(__name__)


@shared_task(
    name="library.mark_overdue_book_issues",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3},
    default_retry_delay=300,
)
def mark_overdue_book_issues(self):
    """Flip `issued` book issues past their due_date to `overdue` across all tenants.

    Runs daily. Replaces the per-request UPDATE that previously fired on every
    BookIssueViewSet.get_queryset() call.
    """
    from library.models import BookIssue

    TenantModel = get_tenant_model()
    today = date.today()
    total = 0
    for tenant in TenantModel.objects.exclude(schema_name="public"):
        try:
            with schema_context(tenant.schema_name):
                updated = BookIssue.objects.filter(
                    status="issued",
                    due_date__lt=today,
                ).update(status="overdue")
                total += updated
        except Exception as exc:
            logger.exception(
                "Overdue sweep failed for tenant %s: %s",
                tenant.schema_name,
                exc,
            )
    logger.info("Overdue sweep: flipped %d book issues across tenants", total)
    return total
