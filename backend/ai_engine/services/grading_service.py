# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging

from ai_engine.services.ai_client import (
    parse_json_content,
    provider_ready,
    structured_chat,
)

logger = logging.getLogger(__name__)

GRADE_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {
            "type": "number",
            "description": "Numeric score awarded, between 0 and the total points available.",
        },
        "feedback": {
            "type": "string",
            "description": "Constructive feedback for the student.",
        },
    },
    "required": ["score", "feedback"],
    "additionalProperties": False,
}


class GradingService:
    def grade_submission(
        self, question_text, student_answer, correct_answer=None, total_points=10
    ):
        """
        Grade a student submission using AI.
        Returns dict: { 'score': float, 'feedback': str }
        """
        if not provider_ready():
            return self._get_demo_grade(student_answer, total_points)

        prompt = f"""
        You are an expert teacher grading a student's answer.

        Question: {question_text}
        Correct Answer/Rubric: {correct_answer if correct_answer else "Evaluate based on general knowledge and correctness."}
        Student Answer: {student_answer}
        Total Points Available: {total_points}

        Evaluate the answer constraints:
        1. Accuracy of facts.
        2. Clarity of explanation.
        3. Completeness.

        Respond with JSON: {{"score": <numeric_score_out_of_total>, "feedback": "<constructive_feedback_string>"}}
        """

        try:
            response = structured_chat(
                [
                    {
                        "role": "system",
                        "content": "You are a fair and constructive precision grader.",
                    },
                    {"role": "user", "content": prompt},
                ],
                schema=GRADE_SCHEMA,
                schema_name="grade",
                temperature=0.3,
            )
            result = parse_json_content(response)
            return self._normalize_grade(result, total_points)
        except Exception as exc:
            logger.warning("Grading failed; using heuristic fallback: %s", exc)
            return self._get_demo_grade(student_answer, total_points, error=str(exc))

    @staticmethod
    def _normalize_grade(result, total_points):
        """Clamp the model output into the promised contract."""
        try:
            score = float(result.get("score", 0))
        except (TypeError, ValueError):
            score = 0.0
        score = max(0.0, min(score, float(total_points)))
        feedback = result.get("feedback")
        if not isinstance(feedback, str) or not feedback.strip():
            feedback = "Reviewed by AI grader."
        return {"score": round(score, 1), "feedback": feedback.strip()}

    def _get_demo_grade(self, answer, total_points, error=None):
        """Fallback heuristic grading when AI provider is unavailable."""
        words = len(answer.split())

        # Heuristic scoring fallback
        if words < 5:
            score = total_points * 0.2
            feedback = "The answer is too short. Please elaborate more."
        elif words < 20:
            score = total_points * 0.7
            feedback = "Good effort, but you could provide more specific details."
        else:
            score = total_points * 0.9
            feedback = "Excellent answer! Detailed and well-explained."

        if error:
            feedback += f" (AI provider temporarily unavailable; fallback rubric used. Error: {error})"

        return {"score": round(score, 1), "feedback": feedback}


grading_service = GradingService()
