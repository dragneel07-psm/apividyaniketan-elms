# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Unit tests for Phase 5: Token Budget / Cost Controls.
Run with: python manage.py test ai_engine.tests_phase5
"""

from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone

from ai_engine.services.token_budget_service import (
    TokenBudgetExceeded,
    TokenBudgetService,
)


def _make_budget(
    daily_limit=1000, used_today=0, is_active=True, student=None, reset_future=True
):
    """Build a mock AITokenBudget with the given parameters."""
    from ai_engine.models import AITokenBudget

    b = MagicMock(spec=AITokenBudget)
    b.daily_limit_tokens = daily_limit
    b.used_today = used_today
    b.is_active = is_active
    b.student_id = getattr(student, "pk", None)
    b.reset_at = (
        timezone.now() + timedelta(hours=10)
        if reset_future
        else timezone.now() - timedelta(hours=1)
    )
    b.pk = "budget-uuid"
    return b


class TokenBudgetServiceCheckTest(TestCase):

    def setUp(self):
        self.svc = TokenBudgetService()
        self.tenant = MagicMock()
        self.student = MagicMock()

    def _patch_get_budget(self, budget):
        return patch.object(self.svc, "_get_budget", return_value=budget)

    def _patch_refresh(self):
        return patch.object(self.svc, "_refresh_if_stale")

    # --- No budget configured → pass-through ---

    def test_no_budget_allows_request(self):
        with self._patch_get_budget(None), self._patch_refresh():
            # Should not raise
            self.svc.check(self.tenant, self.student)

    # --- Unlimited budget (daily_limit = 0) ---

    def test_unlimited_budget_always_allows(self):
        budget = _make_budget(daily_limit=0, used_today=999999)
        with self._patch_get_budget(budget), self._patch_refresh():
            self.svc.check(self.tenant, self.student)

    # --- Within budget ---

    def test_within_budget_allows_request(self):
        budget = _make_budget(daily_limit=1000, used_today=500)
        with self._patch_get_budget(budget), self._patch_refresh():
            self.svc.check(self.tenant, self.student)

    # --- Exactly at limit ---

    def test_at_limit_raises(self):
        budget = _make_budget(daily_limit=1000, used_today=1000)
        with self._patch_get_budget(budget), self._patch_refresh():
            with self.assertRaises(TokenBudgetExceeded) as ctx:
                self.svc.check(self.tenant, self.student)
        self.assertEqual(ctx.exception.used, 1000)
        self.assertEqual(ctx.exception.limit, 1000)

    # --- Over limit ---

    def test_over_limit_raises(self):
        budget = _make_budget(daily_limit=1000, used_today=1500)
        with self._patch_get_budget(budget), self._patch_refresh():
            with self.assertRaises(TokenBudgetExceeded):
                self.svc.check(self.tenant, self.student)

    # --- Exception carries correct values ---

    def test_exception_has_correct_fields(self):
        reset_time = timezone.now() + timedelta(hours=8)
        budget = _make_budget(daily_limit=500, used_today=500)
        budget.reset_at = reset_time
        with self._patch_get_budget(budget), self._patch_refresh():
            try:
                self.svc.check(self.tenant, self.student)
                self.fail("Expected TokenBudgetExceeded")
            except TokenBudgetExceeded as exc:
                self.assertEqual(exc.used, 500)
                self.assertEqual(exc.limit, 500)
                self.assertEqual(exc.resets_at, reset_time)


class TokenBudgetRefreshTest(TestCase):

    def setUp(self):
        self.svc = TokenBudgetService()

    def test_stale_budget_resets_used_today(self):
        """When reset_at is in the past, used_today should be zeroed."""
        from ai_engine.models import AITokenBudget

        budget = MagicMock(spec=AITokenBudget)
        budget.pk = "fake-pk"
        budget.reset_at = timezone.now() - timedelta(minutes=1)
        budget.used_today = 800

        with patch("ai_engine.models.AITokenBudget.objects") as mock_qs:
            mock_filter = MagicMock()
            mock_qs.using.return_value.filter.return_value.update = MagicMock()
            self.svc._refresh_if_stale(budget, db_alias="default")

        # used_today on the in-memory object should be zeroed
        self.assertEqual(budget.used_today, 0)

    def test_fresh_budget_not_reset(self):
        """When reset_at is in the future, used_today is unchanged."""
        from ai_engine.models import AITokenBudget

        budget = MagicMock(spec=AITokenBudget)
        budget.pk = "fake-pk"
        budget.reset_at = timezone.now() + timedelta(hours=12)
        budget.used_today = 300

        self.svc._refresh_if_stale(budget, db_alias="default")
        # Should not change (no DB call was made)
        self.assertEqual(budget.used_today, 300)


class TokenBudgetStatusTest(TestCase):

    def setUp(self):
        self.svc = TokenBudgetService()
        self.tenant = MagicMock()
        self.student = MagicMock()

    def test_no_budget_returns_unlimited_true(self):
        with patch.object(self.svc, "_get_budget", return_value=None):
            result = self.svc.get_status(self.tenant, self.student)
        self.assertFalse(result["budget_active"])
        self.assertTrue(result["unlimited"])

    def test_active_budget_returns_correct_remaining(self):
        budget = _make_budget(daily_limit=2000, used_today=500)
        with patch.object(self.svc, "_get_budget", return_value=budget):
            with patch.object(self.svc, "_refresh_if_stale"):
                result = self.svc.get_status(self.tenant, self.student)
        self.assertTrue(result["budget_active"])
        self.assertEqual(result["remaining"], 1500)
        self.assertEqual(result["used_today"], 500)
        self.assertEqual(result["daily_limit"], 2000)

    def test_unlimited_budget_has_none_remaining(self):
        budget = _make_budget(daily_limit=0, used_today=0)
        with patch.object(self.svc, "_get_budget", return_value=budget):
            with patch.object(self.svc, "_refresh_if_stale"):
                result = self.svc.get_status(self.tenant, self.student)
        self.assertTrue(result["unlimited"])
        self.assertIsNone(result["remaining"])

    def test_remaining_never_negative(self):
        budget = _make_budget(daily_limit=100, used_today=999)
        with patch.object(self.svc, "_get_budget", return_value=budget):
            with patch.object(self.svc, "_refresh_if_stale"):
                result = self.svc.get_status(self.tenant, self.student)
        self.assertEqual(result["remaining"], 0)


class NextMidnightTest(TestCase):

    def test_next_midnight_is_in_future(self):
        svc = TokenBudgetService()
        midnight = svc._next_midnight_utc()
        self.assertGreater(midnight, timezone.now())

    def test_next_midnight_is_less_than_24h_away(self):
        svc = TokenBudgetService()
        midnight = svc._next_midnight_utc()
        delta = midnight - timezone.now()
        self.assertLessEqual(delta.total_seconds(), 86400)

    def test_next_midnight_is_at_hour_zero(self):
        from datetime import timezone as dt_tz

        svc = TokenBudgetService()
        midnight = svc._next_midnight_utc()
        utc_midnight = midnight.astimezone(dt_tz.utc)
        self.assertEqual(utc_midnight.hour, 0)
        self.assertEqual(utc_midnight.minute, 0)
        self.assertEqual(utc_midnight.second, 0)


class TokenBudgetExceededException(TestCase):

    def test_str_contains_usage_info(self):
        resets = timezone.now() + timedelta(hours=6)
        exc = TokenBudgetExceeded(used=800, limit=1000, resets_at=resets)
        msg = str(exc)
        self.assertIn("800", msg)
        self.assertIn("1000", msg)

    def test_fields_accessible(self):
        resets = timezone.now() + timedelta(hours=6)
        exc = TokenBudgetExceeded(used=300, limit=500, resets_at=resets)
        self.assertEqual(exc.used, 300)
        self.assertEqual(exc.limit, 500)
        self.assertEqual(exc.resets_at, resets)
