# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Bayesian Knowledge Tracing (BKT) Service.

BKT models a student's knowledge of a skill as a latent binary variable:
"mastered" or "not yet mastered". Each practice attempt updates the estimate.

Parameters per skill:
  p_init    (L0) — Prior: P(already mastered before first attempt). Default 0.1
  p_transit (T)  — P(transition to mastered after one attempt). Default 0.1
  p_slip    (S)  — P(wrong answer | mastered). Default 0.1
  p_guess   (G)  — P(correct answer | not mastered). Default 0.2

Update rule for a single observation:
  1. Evidence update:
       If correct:   P_evidence = [L*(1-S)] / [L*(1-S) + (1-L)*G]
       If incorrect: P_evidence = [L*S]     / [L*S + (1-L)*(1-G)]
  2. Learning update:
       L_new = P_evidence + (1 - P_evidence) * T

References:
  Corbett, A.T. & Anderson, J.R. (1994). Knowledge tracing: Modeling the
  acquisition of procedural knowledge. User Modeling and User-Adapted Interaction.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class BKTResult:
    mastery_before: float
    mastery_after: float
    observations: int
    correct: bool


class BKTService:
    # Sensible defaults based on published BKT literature
    DEFAULT_P_INIT = 0.1
    DEFAULT_P_TRANSIT = 0.1
    DEFAULT_P_SLIP = 0.1
    DEFAULT_P_GUESS = 0.2

    # Mastery threshold — above this we consider a skill "mastered"
    MASTERY_THRESHOLD = 0.95

    def update(
        self,
        correct: bool,
        p_mastery: float,
        p_transit: float = DEFAULT_P_TRANSIT,
        p_slip: float = DEFAULT_P_SLIP,
        p_guess: float = DEFAULT_P_GUESS,
    ) -> float:
        """
        Apply one BKT observation and return the updated mastery probability.

        Args:
            correct: Whether the student's answer was correct.
            p_mastery: Current P(mastered) estimate (0-1).
            p_transit: P(learn this attempt).
            p_slip: P(wrong | mastered).
            p_guess: P(correct | not mastered).

        Returns:
            Updated p_mastery (0-1).
        """
        L = float(p_mastery)
        T = float(p_transit)
        S = float(p_slip)
        G = float(p_guess)

        # Step 1 — Evidence update (Bayes rule)
        if correct:
            numerator = L * (1.0 - S)
            denominator = numerator + (1.0 - L) * G
        else:
            numerator = L * S
            denominator = numerator + (1.0 - L) * (1.0 - G)

        if denominator == 0:
            p_evidence = L
        else:
            p_evidence = numerator / denominator

        # Step 2 — Learning update
        p_new = p_evidence + (1.0 - p_evidence) * T

        # Clamp to [0, 1]
        return max(0.0, min(1.0, p_new))

    def observe(
        self,
        student,
        skill_tag,
        correct: bool,
        score_pct: float = 0.0,
        source_type: str = "assessment",
        source_id: str = "",
        db_alias: str = "default",
    ) -> BKTResult:
        """
        Record a practice event, update the student's SkillMastery, and persist everything.

        Creates SkillMastery if it doesn't exist yet (using DEFAULT_P_INIT as the prior).
        Creates a SkillPracticeEvent audit record.

        Returns BKTResult with before/after mastery values.
        """
        from ai_engine.models import SkillMastery, SkillPracticeEvent

        mastery, _ = SkillMastery.objects.using(db_alias).get_or_create(
            student=student,
            skill_tag=skill_tag,
            defaults={
                "p_mastery": self.DEFAULT_P_INIT,
                "p_transit": self.DEFAULT_P_TRANSIT,
                "p_slip": self.DEFAULT_P_SLIP,
                "p_guess": self.DEFAULT_P_GUESS,
            },
        )

        mastery_before = mastery.p_mastery
        mastery_after = self.update(
            correct=correct,
            p_mastery=mastery.p_mastery,
            p_transit=mastery.p_transit,
            p_slip=mastery.p_slip,
            p_guess=mastery.p_guess,
        )

        mastery.p_mastery = mastery_after
        mastery.observations += 1
        mastery.save(using=db_alias)

        SkillPracticeEvent.objects.using(db_alias).create(
            student=student,
            skill_tag=skill_tag,
            correct=correct,
            score_pct=float(score_pct),
            source_type=source_type,
            source_id=str(source_id),
            mastery_before=mastery_before,
            mastery_after=mastery_after,
        )

        return BKTResult(
            mastery_before=mastery_before,
            mastery_after=mastery_after,
            observations=mastery.observations,
            correct=correct,
        )

    def get_skill_gaps(
        self, student, db_alias: str = "default", limit: int = 5
    ) -> list:
        """
        Return the student's lowest-mastery skills, ordered ascending.
        Used to prioritize learning path generation toward weak areas.
        """
        from ai_engine.models import SkillMastery

        return list(
            SkillMastery.objects.using(db_alias)
            .filter(student=student)
            .select_related("skill_tag", "skill_tag__subject")
            .order_by("p_mastery")[:limit]
        )

    def is_mastered(self, p_mastery: float) -> bool:
        return float(p_mastery) >= self.MASTERY_THRESHOLD
