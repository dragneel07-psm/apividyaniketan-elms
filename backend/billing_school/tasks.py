# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging
import re as _re
from datetime import date, timedelta
from decimal import Decimal

from celery import shared_task
from django.db import transaction
from django.db.models import Max, Sum
from django_tenants.utils import get_tenant_model, schema_context

logger = logging.getLogger(__name__)


@shared_task(name="billing_school.send_fee_due_reminders", bind=True, max_retries=3)
def send_fee_due_reminders(self):
    """
    Runs daily at 8 AM. For each tenant, find fees due in 0, 3, or 7 days
    and notify parents via in-app + SMS.
    """
    TenantModel = get_tenant_model()
    for tenant in TenantModel.objects.exclude(schema_name="public"):
        try:
            with schema_context(tenant.schema_name):
                _process_tenant_fee_reminders(tenant)
        except Exception as exc:
            logger.error(
                "Fee reminder failed for tenant %s: %s", tenant.schema_name, exc
            )


def _process_tenant_fee_reminders(tenant):
    from billing.models_school import StudentFee
    from notifications.services import NotificationService

    today = date.today()
    target_dates = [today, today + timedelta(days=3), today + timedelta(days=7)]

    fees = (
        StudentFee.objects.filter(
            tenant=tenant,
            due_date__in=target_dates,
            status__in=["pending", "partial", "overdue"],
        )
        .select_related("student__user", "fee_structure")
        .prefetch_related("student__parents__user")
    )

    sent = 0
    for fee in fees:
        balance = fee.amount_due - (fee.amount_paid or 0)
        if balance <= 0:
            continue
        days_left = (fee.due_date - today).days
        if days_left == 0:
            timing = "today"
        elif days_left < 0:
            timing = f"{abs(days_left)} day(s) ago (OVERDUE)"
        else:
            timing = f"in {days_left} day(s)"

        fee_name = getattr(fee.fee_structure, "name", "School Fee")
        message = (
            f"Dear Parent, NPR {balance:,.0f} for {fee_name} is due {timing}. "
            f"Please pay at the school or use the online portal to avoid late fees."
        )
        title = f"Fee Due {timing.title()}: {fee_name}"

        for parent in fee.student.parents.all():
            try:
                NotificationService.create_notification(
                    recipient=parent.user,
                    title=title,
                    message=message,
                    tenant=tenant,
                    link="/fees",
                    channels=["in_app", "sms"],
                )
                sent += 1
            except Exception as exc:
                logger.warning("Could not notify parent %s: %s", parent.user_id, exc)

    logger.info(
        "Fee reminders: sent %d notifications for tenant %s", sent, tenant.schema_name
    )


# ─────────────────────────────────────────────────────────────────────────────
# M5: Annual depreciation auto-posting
# ─────────────────────────────────────────────────────────────────────────────


@shared_task(name="billing_school.post_annual_depreciation", bind=True, max_retries=3)
def post_annual_depreciation(self, fiscal_year: str = None):
    """
    Post annual depreciation journal entries for all active capital assets
    across all tenants.

    Run once per year (e.g. via Celery Beat at end of Ashadh / start of Shrawan).
    Idempotent: skips tenants that already have a depreciation entry for the
    given fiscal year.

    Args:
        fiscal_year: Nepali fiscal year string e.g. '2081/2082'. Defaults to
                     the current fiscal year derived from today's date.
    """
    from billing_school.utils_bs_calendar import bs_date_str, fiscal_year_bs

    if not fiscal_year:
        fiscal_year = fiscal_year_bs()

    TenantModel = get_tenant_model()
    for tenant in TenantModel.objects.exclude(schema_name="public"):
        try:
            with schema_context(tenant.schema_name):
                _post_tenant_depreciation(tenant, fiscal_year)
        except Exception as exc:
            logger.error(
                "Depreciation posting failed for tenant %s FY %s: %s",
                tenant.schema_name,
                fiscal_year,
                exc,
            )


def _post_tenant_depreciation(tenant, fiscal_year: str):
    """Create and post a single depreciation journal entry for all assets of a tenant."""
    from billing_school.models_nas import (
        ChartOfAccount,
        InventoryItem,
        JournalEntry,
        JournalLine,
    )
    from billing_school.utils_bs_calendar import bs_date_str, fiscal_year_bs

    # Idempotency: skip if a depreciation entry already exists for this FY
    already_posted = JournalEntry.objects.filter(
        tenant=tenant,
        entry_type="depreciation",
        fiscal_year=fiscal_year,
        is_posted=True,
    ).exists()
    if already_posted:
        logger.info(
            "Depreciation already posted for tenant %s FY %s — skipping",
            tenant,
            fiscal_year,
        )
        return

    # Active capital assets with depreciable methods
    assets = InventoryItem.objects.filter(
        tenant=tenant,
        form_type="401",
        condition__in=["good", "fair", "poor"],
        depreciation_method__in=["straight_line", "diminishing"],
    )
    if not assets.exists():
        return

    total_dep = sum(item.annual_depreciation() for item in assets)
    if total_dep <= Decimal("0"):
        return

    # Locate required accounts (must exist — created by seed_defaults)
    try:
        dep_expense_acct = ChartOfAccount.objects.get(
            tenant=tenant, account_code="5500"
        )
        accum_dep_acct = ChartOfAccount.objects.get(tenant=tenant, account_code="1590")
    except ChartOfAccount.DoesNotExist as exc:
        logger.warning(
            "Cannot post depreciation for tenant %s: required account missing (%s)",
            tenant,
            exc,
        )
        return

    today = date.today()
    with transaction.atomic():
        max_num = (
            JournalEntry.objects.select_for_update()
            .filter(tenant=tenant)
            .aggregate(m=Max("entry_number"))["m"]
        )
        seq = 1
        if max_num:
            m_obj = _re.search(r"-(\d+)$", max_num)
            if m_obj:
                seq = int(m_obj.group(1)) + 1

        from billing_school.utils_bs_calendar import ad_to_bs

        y, _, _ = ad_to_bs(today)
        entry_number = f"JV-{y}-{seq:05d}"

        je = JournalEntry.objects.create(
            tenant=tenant,
            entry_number=entry_number,
            date_ad=today,
            description=f"Annual Depreciation — FY {fiscal_year}",
            entry_type="depreciation",
            narration=f"Auto-posted by post_annual_depreciation task. {assets.count()} asset(s).",
        )
        # Dr Depreciation Expense  5500
        # Cr Accumulated Depreciation  1590
        JournalLine.objects.create(
            entry=je,
            account=dep_expense_acct,
            debit=total_dep,
            credit=Decimal("0"),
            narration=f"Depreciation expense FY {fiscal_year}",
        )
        JournalLine.objects.create(
            entry=je,
            account=accum_dep_acct,
            debit=Decimal("0"),
            credit=total_dep,
            narration=f"Accumulated depreciation FY {fiscal_year}",
        )
        je.post()

        # Update accumulated_depreciation on each asset
        for item in assets:
            item.accumulated_depreciation += item.annual_depreciation()
            item.save(update_fields=["accumulated_depreciation"])

    logger.info(
        "Depreciation posted for tenant %s FY %s: NPR %s (%d assets)",
        tenant,
        fiscal_year,
        total_dep,
        assets.count(),
    )
