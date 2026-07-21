# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from typing import Dict, List

from academic.models.assessment import Result
from academic.models.lesson import Lesson, LessonProgress
from academic.models.student import Student
from academic.models.subject import Subject


class PersonalizationService:
    def get_student_recommendations(self, student_id: str) -> Dict:
        """
        Analyze student performance and return personalized study recommendations.
        """
        try:
            student = Student.objects.get(student_id=student_id)

            # 1. Analyze Weak Topics from Results
            results = Result.objects.filter(student=student).order_by("-submitted_at")[
                :10
            ]
            weak_subjects = {}

            for res in results:
                percentage = (res.score / res.assessment.total_marks) * 100
                subject_id = res.assessment.subject.id
                if percentage < 60:
                    weak_subjects[subject_id] = weak_subjects.get(subject_id, 0) + 1

            # 2. Find Incomplete Lessons in those subjects (High Priority)
            recommendations = []
            for sub_id, count in sorted(
                weak_subjects.items(), key=lambda item: item[1], reverse=True
            ):
                subject = Subject.objects.get(id=sub_id)
                lessons = Lesson.objects.filter(
                    chapter__subject=subject, is_published=True
                ).order_by("chapter__order", "order")

                for lesson in lessons:
                    progress_exists = LessonProgress.objects.filter(
                        student=student, lesson=lesson, completed=True
                    ).exists()
                    if not progress_exists:
                        recommendations.append(
                            {
                                "id": lesson.id,
                                "title": lesson.title,
                                "subject": subject.name,
                                "subject_id": subject.id,
                                "type": "Review",
                                "priority": 1,
                                "reason": f"High priority: Strengthen your understanding in {subject.name} based on recent quiz performance.",
                            }
                        )
                        break  # One per weak subject
                if len(recommendations) >= 2:
                    break

            # 3. syllabus Progression (Medium Priority)
            subjects = Subject.objects.filter(academic_class=student.academic_class)
            for sub in subjects:
                if sub.id in weak_subjects:
                    continue

                lessons = Lesson.objects.filter(
                    chapter__subject=sub, is_published=True
                ).order_by("chapter__order", "order")
                for lesson in lessons:
                    if not LessonProgress.objects.filter(
                        student=student, lesson=lesson, completed=True
                    ).exists():
                        recommendations.append(
                            {
                                "id": lesson.id,
                                "title": lesson.title,
                                "subject": sub.name,
                                "subject_id": sub.id,
                                "type": "Next Topic",
                                "priority": 2,
                                "reason": f"Next recommended step in your {sub.name} curriculum.",
                            }
                        )
                        break
                if len(recommendations) >= 3:
                    break

            # Sort by priority
            recommendations.sort(key=lambda x: x["priority"])

            return {
                "recommendations": recommendations[:3],
                "learning_style_advice": self._get_learning_style_advice(
                    getattr(student, "learning_style", "visual")
                ),
                "stats": {
                    "lessons_completed": LessonProgress.objects.filter(
                        student=student, completed=True
                    ).count(),
                    "streak": student.current_streak,
                },
            }
        except Exception as e:
            print(f"Personalization Error: {e}")
            return {"recommendations": [], "error": str(e)}

    def _get_learning_style_advice(self, style: str) -> str:
        advices = {
            "visual": "Try using mind maps and diagrams for the topics you find challenging.",
            "reading": "Read through the lesson materials carefully and take structured notes.",
            "practice": "Focus on completing the practice exercises and quizzes multiple times.",
            "auditory": "Consider reading the content out loud or using text-to-speech tools.",
        }
        return advices.get(style, "Keep up with your daily study goals!")


personalization_service = PersonalizationService()
