# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
GradeForecastService — Predictive grade forecasting using exponential weighted moving average.

For each subject, uses past assessment results (ordered chronologically) with
exponential weights so recent scores count more than older ones. Returns a
per-subject forecast with trajectory direction and confidence level.
"""

from datetime import timedelta

from django.utils import timezone

from academic.models.assessment import Assessment, Result
from academic.models.student import Student
from academic.models.subject import Subject


class GradeForecastService:
    # Exponential decay factor — higher means recent results matter much more
    DECAY = 0.75
    # Minimum results needed to produce a forecast
    MIN_OBSERVATIONS = 2
    # Trajectory comparison window (results per half)
    TRAJECTORY_WINDOW = 3

    def forecast_for_student(self, student, using="default"):
        """
        Return grade forecasts per subject for a single student.

        Returns a list of dicts:
          {
            subject_id, subject_name,
            current_avg,        # simple average of all results (%)
            forecasted_grade,   # exponential weighted moving average (%)
            trajectory,         # 'improving' | 'declining' | 'stable'
            trajectory_delta,   # pp change between recent and older half
            confidence,         # 'high' | 'medium' | 'low'
            observation_count,
          }
        """
        results_qs = (
            Result.objects.using(using)
            .filter(student=student)
            .select_related("assessment__subject")
            .order_by("submitted_at")
        )

        # Group by subject
        by_subject: dict[str, list] = {}
        for r in results_qs:
            subj = r.assessment.subject
            if subj is None or r.assessment.total_marks == 0:
                continue
            pct = (r.score / r.assessment.total_marks) * 100
            key = str(subj.id)
            by_subject.setdefault(key, {"subject": subj, "scores": []})
            by_subject[key]["scores"].append(pct)

        forecasts = []
        for key, data in by_subject.items():
            scores = data["scores"]
            subj = data["subject"]
            n = len(scores)

            if n < self.MIN_OBSERVATIONS:
                continue

            # Exponential weights: index 0 (oldest) gets lowest weight
            weights = [self.DECAY ** (n - 1 - i) for i in range(n)]
            total_weight = sum(weights)
            ewma = sum(s * w for s, w in zip(scores, weights)) / total_weight
            current_avg = sum(scores) / n

            # Trajectory: compare most-recent TRAJECTORY_WINDOW vs the ones before
            trajectory, delta = self._calc_trajectory(scores)
            confidence = self._calc_confidence(n)

            forecasts.append(
                {
                    "subject_id": key,
                    "subject_name": subj.name,
                    "current_avg": round(current_avg, 1),
                    "forecasted_grade": round(ewma, 1),
                    "trajectory": trajectory,
                    "trajectory_delta": round(delta, 1),
                    "confidence": confidence,
                    "observation_count": n,
                }
            )

        return sorted(forecasts, key=lambda x: x["forecasted_grade"])

    def forecast_for_class(self, class_id, using="default"):
        """
        Return aggregate grade forecasts for all students in a class.

        Returns:
          {
            students: list of { student_id, student_name, forecasts: [...], overall_forecast }
            class_avg_forecast,
            at_risk_count,   # students with overall_forecast < 50
            improving_count,
          }
        """
        students = (
            Student.objects.using(using)
            .filter(academic_class_id=class_id)
            .select_related("user")
        )

        student_summaries = []
        class_forecasts = []

        for student in students:
            try:
                if not student.user:
                    continue
            except Exception:
                continue

            forecasts = self.forecast_for_student(student, using=using)
            if not forecasts:
                continue

            overall_forecast = (
                sum(f["forecasted_grade"] for f in forecasts) / len(forecasts)
                if forecasts
                else None
            )

            student_summaries.append(
                {
                    "student_id": str(student.student_id),
                    "student_name": student.user.get_full_name(),
                    "forecasts": forecasts,
                    "overall_forecast": (
                        round(overall_forecast, 1)
                        if overall_forecast is not None
                        else None
                    ),
                }
            )

            if overall_forecast is not None:
                class_forecasts.append(overall_forecast)

        class_avg = (
            round(sum(class_forecasts) / len(class_forecasts), 1)
            if class_forecasts
            else None
        )
        at_risk_count = sum(
            1
            for s in student_summaries
            if s["overall_forecast"] is not None and s["overall_forecast"] < 50
        )
        improving_count = sum(
            1
            for s in student_summaries
            for f in s["forecasts"]
            if f["trajectory"] == "improving"
        )

        return {
            "students": sorted(
                student_summaries,
                key=lambda x: (x["overall_forecast"] or 0),
            ),
            "class_avg_forecast": class_avg,
            "at_risk_count": at_risk_count,
            "improving_count": improving_count,
        }

    # ---- Internal helpers ----

    def _calc_trajectory(self, scores: list[float]) -> tuple[str, float]:
        """
        Compare the most recent TRAJECTORY_WINDOW scores against the previous window.
        Returns ('improving'|'declining'|'stable', delta_pp).
        """
        n = len(scores)
        w = self.TRAJECTORY_WINDOW
        if n < w * 2:
            # Not enough data for a two-window comparison; use first vs last half
            mid = n // 2
            older = scores[:mid]
            recent = scores[mid:]
        else:
            older = scores[-(w * 2) : -w]
            recent = scores[-w:]

        if not older or not recent:
            return "stable", 0.0

        avg_older = sum(older) / len(older)
        avg_recent = sum(recent) / len(recent)
        delta = avg_recent - avg_older

        if delta >= 5:
            return "improving", delta
        if delta <= -5:
            return "declining", delta
        return "stable", delta

    def _calc_confidence(self, n: int) -> str:
        if n >= 8:
            return "high"
        if n >= 4:
            return "medium"
        return "low"


grade_forecast_service = GradeForecastService()
