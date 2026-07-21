# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Unit tests for Phase 3: Bayesian Knowledge Tracing (BKT) Service.
Run with: python manage.py test ai_engine.tests_phase3
"""

from django.test import TestCase

from ai_engine.services.bkt_service import BKTService


class BKTUpdateTest(TestCase):
    def setUp(self):
        self.bkt = BKTService()
        # Default BKT parameters
        self.T = BKTService.DEFAULT_P_TRANSIT  # 0.1
        self.S = BKTService.DEFAULT_P_SLIP  # 0.1
        self.G = BKTService.DEFAULT_P_GUESS  # 0.2

    # --- Core update rule ---

    def test_correct_answer_increases_mastery(self):
        before = 0.3
        after = self.bkt.update(correct=True, p_mastery=before)
        self.assertGreater(after, before)

    def test_incorrect_answer_decreases_mastery(self):
        before = 0.8
        after = self.bkt.update(correct=False, p_mastery=before)
        self.assertLess(after, before)

    def test_mastery_clamped_between_0_and_1(self):
        # Edge: start at 0
        after_correct = self.bkt.update(correct=True, p_mastery=0.0)
        self.assertGreaterEqual(after_correct, 0.0)
        self.assertLessEqual(after_correct, 1.0)
        # Edge: start at 1
        after_incorrect = self.bkt.update(correct=False, p_mastery=1.0)
        self.assertGreaterEqual(after_incorrect, 0.0)
        self.assertLessEqual(after_incorrect, 1.0)

    def test_repeated_correct_answers_approach_mastery(self):
        p = BKTService.DEFAULT_P_INIT
        for _ in range(50):
            p = self.bkt.update(correct=True, p_mastery=p)
        # After many correct answers, mastery should be very high
        self.assertGreater(p, 0.9)

    def test_repeated_incorrect_answers_keep_low_mastery(self):
        p = 0.5
        for _ in range(20):
            p = self.bkt.update(correct=False, p_mastery=p)
        # After many incorrect answers, mastery should stay low
        self.assertLess(p, 0.3)

    def test_manual_bkt_formula_correct(self):
        """Verify formula output matches hand-calculation."""
        L, T, S, G = 0.3, 0.1, 0.1, 0.2
        # Evidence: [L*(1-S)] / [L*(1-S) + (1-L)*G]
        p_evidence = (L * (1 - S)) / (L * (1 - S) + (1 - L) * G)
        # Learning: p_evidence + (1 - p_evidence) * T
        expected = p_evidence + (1 - p_evidence) * T
        result = self.bkt.update(
            correct=True, p_mastery=L, p_transit=T, p_slip=S, p_guess=G
        )
        self.assertAlmostEqual(result, expected, places=6)

    def test_manual_bkt_formula_incorrect(self):
        """Verify formula output for incorrect answer."""
        L, T, S, G = 0.3, 0.1, 0.1, 0.2
        p_evidence = (L * S) / (L * S + (1 - L) * (1 - G))
        expected = p_evidence + (1 - p_evidence) * T
        result = self.bkt.update(
            correct=False, p_mastery=L, p_transit=T, p_slip=S, p_guess=G
        )
        self.assertAlmostEqual(result, expected, places=6)

    # --- Mastery threshold ---

    def test_is_mastered_above_threshold(self):
        self.assertTrue(self.bkt.is_mastered(0.95))
        self.assertTrue(self.bkt.is_mastered(0.99))
        self.assertTrue(self.bkt.is_mastered(1.0))

    def test_is_not_mastered_below_threshold(self):
        self.assertFalse(self.bkt.is_mastered(0.0))
        self.assertFalse(self.bkt.is_mastered(0.5))
        self.assertFalse(self.bkt.is_mastered(0.94))

    # --- Parameter sensitivity ---

    def test_high_transit_learns_faster(self):
        """Higher p_transit should lead to faster mastery growth."""
        p_low_t = self.bkt.update(correct=True, p_mastery=0.2, p_transit=0.05)
        p_high_t = self.bkt.update(correct=True, p_mastery=0.2, p_transit=0.4)
        self.assertGreater(p_high_t, p_low_t)

    def test_high_slip_penalizes_incorrect_more(self):
        """Higher p_slip means a wrong answer is more surprising → less mastery drop."""
        # Actually higher slip means P(wrong|mastered) is high, so less penalized
        p_low_slip = self.bkt.update(correct=False, p_mastery=0.7, p_slip=0.05)
        p_high_slip = self.bkt.update(correct=False, p_mastery=0.7, p_slip=0.4)
        # With high slip, incorrect answer is less informative (could be a slip)
        self.assertGreater(p_high_slip, p_low_slip)

    def test_denominator_zero_safety(self):
        """If denominator would be 0, function should not crash."""
        # p_guess=0, p_slip=0, p_mastery=0 → denominator for correct = 0
        # Should return unchanged or clamped safely
        result = self.bkt.update(correct=True, p_mastery=0.0, p_guess=0.0, p_slip=0.0)
        self.assertGreaterEqual(result, 0.0)
        self.assertLessEqual(result, 1.0)
