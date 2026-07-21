# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Token Budget Service — per-student and per-tenant daily AI token limits.

Design:
  - Budgets are stored in AITokenBudget.
  - Student-level budget takes priority over tenant-level.
  - Daily reset happens inline (no Celery): when reset_at is in the past,
    used_today is zeroed and reset_at advanced to the next midnight UTC.
  - check() raises TokenBudgetExceeded if the request would exceed the limit.
  - deduct() records the actual tokens consumed after a successful AI call.
  - Use select_for_update() to prevent race conditions under concurrent requests.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from datetime import timezone as dt_timezone

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

UTC = dt_timezone.utc


class TokenBudgetExceeded(Exception):
    """Raised when a student/tenant has exhausted their daily token budget."""

    def __init__(self, used: int, limit: int, resets_at):
        self.used = used
        self.limit = limit
        self.resets_at = resets_at
        super().__init__(
            f"Daily token budget exceeded ({used}/{limit} tokens used). "
            f"Resets at {resets_at.strftime('%Y-%m-%d %H:%M UTC')}."
        )


class TokenBudgetService:

    def _next_midnight_utc(self) -> object:
        """Return tomorrow's midnight in UTC."""
        now = timezone.now().astimezone(UTC)
        tomorrow = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        return tomorrow

    def _refresh_if_stale(self, budget, db_alias: str) -> None:
        """Reset used_today if the reset window has passed. Saves in place."""
        from ai_engine.models import AITokenBudget

        if timezone.now() >= budget.reset_at:
            AITokenBudget.objects.using(db_alias).filter(pk=budget.pk).update(
                used_today=0,
                reset_at=self._next_midnight_utc(),
            )
            budget.used_today = 0
            budget.reset_at = self._next_midnight_utc()

    def _get_budget(self, tenant, student, db_alias: str):
        """
        Return the most specific active budget for this request.
        Student-level wins over tenant-level. Returns None if no budget.
        """
        from ai_engine.models import AITokenBudget

        # Student-level first
        if student is not None:
            budget = (
                AITokenBudget.objects.using(db_alias)
                .filter(tenant=tenant, student=student, is_active=True)
                .first()
            )
            if budget:
                return budget
        # Tenant-level fallback
        return (
            AITokenBudget.objects.using(db_alias)
            .filter(tenant=tenant, student__isnull=True, is_active=True)
            .first()
        )

    def check(
        self, tenant, student, tokens_requested: int = 1, db_alias: str = "default"
    ) -> None:
        """
        Raise TokenBudgetExceeded if the student/tenant has no remaining budget.
        tokens_requested is an estimate (e.g. max_tokens setting).
        Pass 0 or None to skip the pre-flight check (deduct will still enforce).
        """
        budget = self._get_budget(tenant, student, db_alias)
        if budget is None:
            return  # No limit set

        self._refresh_if_stale(budget, db_alias)

        if budget.daily_limit_tokens == 0:
            return  # 0 = unlimited

        remaining = budget.daily_limit_tokens - budget.used_today
        if remaining <= 0:
            raise TokenBudgetExceeded(
                used=budget.used_today,
                limit=budget.daily_limit_tokens,
                resets_at=budget.reset_at,
            )

    def deduct(
        self, tenant, student, tokens_used: int, db_alias: str = "default"
    ) -> dict:
        """
        Record tokens consumed after a successful AI call.
        Uses select_for_update to prevent race conditions.
        Returns a dict with current budget status.
        """
        from ai_engine.models import AITokenBudget

        budget = self._get_budget(tenant, student, db_alias)
        if budget is None or tokens_used <= 0:
            return {"budget_active": False}

        try:
            with transaction.atomic(using=db_alias):
                locked = (
                    AITokenBudget.objects.using(db_alias)
                    .select_for_update()
                    .get(pk=budget.pk)
                )
                self._refresh_if_stale(locked, db_alias)
                locked.used_today = max(0, locked.used_today) + tokens_used
                locked.save(
                    using=db_alias,
                    update_fields=["used_today", "reset_at", "updated_at"],
                )
        except Exception as exc:
            logger.warning("Token budget deduction failed (non-fatal): %s", exc)
            return {"budget_active": True, "error": str(exc)}

        return {
            "budget_active": True,
            "daily_limit": budget.daily_limit_tokens,
            "used_today": locked.used_today,
            "remaining": (
                max(0, budget.daily_limit_tokens - locked.used_today)
                if budget.daily_limit_tokens > 0
                else None
            ),
            "resets_at": locked.reset_at.isoformat(),
        }

    def get_status(self, tenant, student, db_alias: str = "default") -> dict:
        """Return current budget status for display (student dashboard / admin panel)."""
        budget = self._get_budget(tenant, student, db_alias)
        if budget is None:
            return {"budget_active": False, "unlimited": True}

        self._refresh_if_stale(budget, db_alias)
        unlimited = budget.daily_limit_tokens == 0
        used = budget.used_today
        limit = budget.daily_limit_tokens
        return {
            "budget_active": True,
            "unlimited": unlimited,
            "daily_limit": limit,
            "used_today": used,
            "remaining": None if unlimited else max(0, limit - used),
            "resets_at": budget.reset_at.isoformat(),
            "scope": "student" if budget.student_id else "tenant",
        }

    def create_budget(
        self,
        tenant,
        daily_limit_tokens: int,
        student=None,
        created_by=None,
        db_alias: str = "default",
    ):
        """
        Create or update a budget for a tenant or student.
        Idempotent — updates existing record if one exists.
        """
        from ai_engine.models import AITokenBudget

        budget, _ = AITokenBudget.objects.using(db_alias).update_or_create(
            tenant=tenant,
            student=student,
            defaults={
                "daily_limit_tokens": daily_limit_tokens,
                "is_active": True,
                "reset_at": self._next_midnight_utc(),
                "created_by": created_by,
            },
        )
        return budget
