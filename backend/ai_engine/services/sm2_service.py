# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
SM-2 Spaced Repetition Algorithm Service.

Based on the SuperMemo SM-2 algorithm:
https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method

Quality ratings (0-5):
  5 — Perfect recall, no hesitation
  4 — Correct after minor hesitation
  3 — Correct with serious difficulty
  2 — Incorrect, but remembered once shown
  1 — Incorrect, close to remembering
  0 — Complete blackout

Quality >= 3 → node is "passed" → progress the interval
Quality < 3  → node is "failed" → reset, review again tomorrow
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from django.utils import timezone


@dataclass
class SM2Result:
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review_at: object  # datetime
    passed: bool


class SM2Service:
    MIN_EASE_FACTOR = 1.3
    DEFAULT_EASE_FACTOR = 2.5

    def calculate(
        self,
        quality: int,
        ease_factor: float = DEFAULT_EASE_FACTOR,
        interval_days: int = 1,
        repetitions: int = 0,
    ) -> SM2Result:
        """
        Apply one SM-2 review cycle and return updated scheduling values.

        Args:
            quality: Recall quality (0-5). Values 0-2 reset the card.
            ease_factor: Current ease factor (EF). Default 2.5.
            interval_days: Current interval in days.
            repetitions: Number of successful reviews so far.

        Returns:
            SM2Result with updated values ready to save to the DB.
        """
        quality = max(0, min(5, int(quality)))
        passed = quality >= 3

        # Update ease factor: EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
        new_ef = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ef = max(self.MIN_EASE_FACTOR, round(new_ef, 4))

        if not passed:
            # Failed: restart from scratch
            new_repetitions = 0
            new_interval = 1
        else:
            new_repetitions = repetitions + 1
            if new_repetitions == 1:
                new_interval = 1
            elif new_repetitions == 2:
                new_interval = 6
            else:
                new_interval = round(interval_days * new_ef)

        next_review_at = timezone.now() + timedelta(days=new_interval)

        return SM2Result(
            ease_factor=new_ef,
            interval_days=new_interval,
            repetitions=new_repetitions,
            next_review_at=next_review_at,
            passed=passed,
        )

    def initial_schedule(self) -> SM2Result:
        """
        Schedule a brand-new node for first review (1 day from now).
        """
        return SM2Result(
            ease_factor=self.DEFAULT_EASE_FACTOR,
            interval_days=1,
            repetitions=0,
            next_review_at=timezone.now() + timedelta(days=1),
            passed=True,
        )
