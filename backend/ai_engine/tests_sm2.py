# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Unit tests for the SM-2 Spaced Repetition Service.
Run with: python manage.py test ai_engine.tests_sm2
"""

from django.test import TestCase

from ai_engine.services.sm2_service import SM2Service


class SM2ServiceTest(TestCase):
    def setUp(self):
        self.sm2 = SM2Service()

    # --- First review ---

    def test_first_perfect_recall(self):
        result = self.sm2.calculate(quality=5)
        self.assertEqual(result.repetitions, 1)
        self.assertEqual(result.interval_days, 1)
        self.assertTrue(result.passed)
        self.assertGreater(result.ease_factor, 2.5)

    def test_first_correct_minor_hesitation(self):
        result = self.sm2.calculate(quality=4)
        self.assertEqual(result.repetitions, 1)
        self.assertEqual(result.interval_days, 1)
        self.assertTrue(result.passed)

    def test_first_correct_serious_difficulty(self):
        result = self.sm2.calculate(quality=3)
        self.assertEqual(result.repetitions, 1)
        self.assertEqual(result.interval_days, 1)
        self.assertTrue(result.passed)
        # EF decreases for quality=3
        self.assertLess(result.ease_factor, 2.5)

    # --- Failed recall resets ---

    def test_quality_below_3_resets(self):
        for q in [0, 1, 2]:
            result = self.sm2.calculate(quality=q, repetitions=5, interval_days=30)
            self.assertFalse(result.passed, f"quality={q} should fail")
            self.assertEqual(result.repetitions, 0)
            self.assertEqual(result.interval_days, 1)

    # --- Second review (repetitions=1) ---

    def test_second_review_gives_6_day_interval(self):
        # After first pass, we have repetitions=1, interval=1
        result = self.sm2.calculate(
            quality=4, ease_factor=2.5, interval_days=1, repetitions=1
        )
        self.assertEqual(result.interval_days, 6)
        self.assertEqual(result.repetitions, 2)

    # --- Third review onwards uses EF multiplier ---

    def test_third_review_uses_ef_multiplier(self):
        result = self.sm2.calculate(
            quality=4, ease_factor=2.5, interval_days=6, repetitions=2
        )
        expected_interval = round(6 * 2.5)
        self.assertEqual(result.interval_days, expected_interval)
        self.assertEqual(result.repetitions, 3)

    # --- Ease factor bounds ---

    def test_ease_factor_never_below_min(self):
        # Repeated quality=0 should not drop EF below 1.3
        ef = 2.5
        for _ in range(20):
            result = self.sm2.calculate(quality=0, ease_factor=ef)
            ef = result.ease_factor
        self.assertGreaterEqual(ef, SM2Service.MIN_EASE_FACTOR)

    def test_ease_factor_increases_on_perfect_recall(self):
        result = self.sm2.calculate(quality=5, ease_factor=2.5)
        self.assertGreater(result.ease_factor, 2.5)

    # --- next_review_at scheduling ---

    def test_next_review_at_is_in_future(self):
        from django.utils import timezone

        result = self.sm2.calculate(quality=4)
        self.assertGreater(result.next_review_at, timezone.now())

    def test_next_review_at_matches_interval(self):
        from datetime import timedelta

        from django.utils import timezone

        result = self.sm2.calculate(
            quality=4, ease_factor=2.5, interval_days=6, repetitions=2
        )
        expected_days = round(6 * 2.5)
        delta = result.next_review_at - timezone.now()
        # Allow 2 seconds tolerance for test execution time
        self.assertAlmostEqual(delta.days, expected_days, delta=1)

    # --- Initial schedule ---

    def test_initial_schedule(self):
        from django.utils import timezone

        result = self.sm2.initial_schedule()
        self.assertEqual(result.repetitions, 0)
        self.assertEqual(result.interval_days, 1)
        self.assertEqual(result.ease_factor, SM2Service.DEFAULT_EASE_FACTOR)
        self.assertGreater(result.next_review_at, timezone.now())

    # --- Quality clamping ---

    def test_quality_clamped_to_0_5(self):
        result_low = self.sm2.calculate(quality=-99)
        result_high = self.sm2.calculate(quality=99)
        # Should behave same as 0 and 5
        expected_low = self.sm2.calculate(quality=0)
        expected_high = self.sm2.calculate(quality=5)
        self.assertEqual(result_low.passed, expected_low.passed)
        self.assertEqual(result_high.passed, expected_high.passed)
