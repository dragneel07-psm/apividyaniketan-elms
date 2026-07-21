# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Grading service for assessment submissions.
"""

import logging

logger = logging.getLogger(__name__)


class GradingService:
    @staticmethod
    def grade_submission(assessment, answers_data: dict) -> tuple[int, int, dict]:
        """
        Grade a student's submission against the assessment questions.

        Args:
            assessment:   Assessment model instance (must have _state.db set for multi-tenancy).
            answers_data: Mapping of { str(question_id): user_answer }.

        Returns:
            (total_score, max_possible, graded_answers) where graded_answers is a dict
            keyed by str(question_id) with per-question scoring detail.
        """
        from academic.models.question import Question

        db_alias = getattr(assessment._state, "db", None) or "default"
        questions = Question.objects.using(db_alias).filter(assessment=assessment)

        # Lazy-load AI grader — optional dependency; None if unavailable.
        ai_grader = None
        try:
            from ai_engine.services.grading_service import grading_service

            ai_grader = grading_service
        except ImportError:
            pass

        total_score = 0
        max_possible = 0
        graded_answers: dict = {}

        for q in questions:
            user_answer = answers_data.get(str(q.question_id))
            is_correct = False
            points_earned = 0
            feedback = ""

            try:
                if q.type == "mcq":
                    if user_answer == q.correct_answer:
                        is_correct = True
                        points_earned = q.points

                elif q.type == "short_answer":
                    if (
                        user_answer
                        and q.correct_answer
                        and str(user_answer).strip().lower()
                        == str(q.correct_answer).strip().lower()
                    ):
                        is_correct = True
                        points_earned = q.points

                elif ai_grader and user_answer:
                    try:
                        ai_result = ai_grader.grade_submission(
                            question_text=q.text,
                            student_answer=user_answer,
                            correct_answer=q.correct_answer,
                            total_points=q.points,
                        )
                        points_earned = ai_result.get("score", 0)
                        feedback = ai_result.get("feedback", "")
                        is_correct = points_earned >= (q.points * 0.5)
                    except Exception as ai_err:
                        logger.warning(
                            "AI grader failed for question — scoring as 0",
                            extra={
                                "question_id": str(q.question_id),
                                "question_type": q.type,
                                "error": str(ai_err),
                            },
                        )
                        feedback = "AI grading unavailable for this question."

            except Exception as err:
                logger.error(
                    "Unexpected error grading question",
                    extra={"question_id": str(q.question_id), "error": str(err)},
                )

            graded_answers[str(q.question_id)] = {
                "answer": user_answer,
                "correct": is_correct,
                "points_earned": points_earned,
                "max_points": q.points,
                "ai_feedback": feedback,
            }
            total_score += points_earned
            max_possible += q.points

        return total_score, max_possible, graded_answers
