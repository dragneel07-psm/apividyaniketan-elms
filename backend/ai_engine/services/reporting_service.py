# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import json
from datetime import timedelta
from typing import Dict, List

from django.db.models import Avg, Count
from django.utils import timezone

from academic.models import Attendance, LessonProgress, Result, Student, Subject

from ..models import StudentAIReport
from ..services.tutor_service import AITutorService


class ReportingService:
    def __init__(self):
        self.tutor_service = AITutorService()

    def generate_student_report(
        self,
        student_id: str,
        save: bool = True,
        is_automated: bool = False,
        using: str = "default",
    ) -> Dict:
        """
        Generate a comprehensive AI-driven performance report for a student.
        """
        try:
            student = (
                Student.objects.using(using)
                .select_related("user", "academic_class", "section")
                .get(student_id=student_id)
            )

            # 1. Gather Performance Data
            results = (
                Result.objects.using(using)
                .filter(student=student)
                .select_related("assessment", "assessment__subject")
                .order_by("-submitted_at")
            )
            avg_score = results.aggregate(Avg("score"))["score__avg"] or 0

            # 2. Topic Mastery
            subjects = Subject.objects.using(using).filter(
                academic_class=student.academic_class
            )
            mastery_data = []
            for sub in subjects:
                sub_results = results.filter(assessment__subject=sub)
                if sub_results.exists():
                    total_p = (
                        sum(
                            (r.score / r.assessment.total_marks) * 100
                            for r in sub_results
                        )
                        / sub_results.count()
                    )
                    mastery_data.append(
                        {"subject": sub.name, "score": round(total_p, 1)}
                    )

            # 3. Attendance
            thirty_days_ago = timezone.now() - timedelta(days=30)
            att_records = Attendance.objects.using(using).filter(
                student=student, date__gte=thirty_days_ago
            )
            att_rate = 0
            if att_records.exists():
                att_rate = (
                    att_records.filter(status="present").count() / att_records.count()
                ) * 100

            # 4. Learning Habits
            streak = getattr(student, "current_streak", 0)
            focus = getattr(student, "focus_score", 0)

            # 5. Generate AI Summary
            report_context = {
                "name": student.user.get_full_name(),
                "class": (
                    student.academic_class.name if student.academic_class else "N/A"
                ),
                "avg_score": avg_score,
                "mastery": mastery_data,
                "attendance": att_rate,
                "streak": streak,
                "focus": focus,
            }

            prompt = f"""
            Generate a formal academic progress report for {report_context['name']} (Class: {report_context['class']}).
            Current Metrics:
            - Average Score: {report_context['avg_score']}%
            - Attendance Rate: {report_context['attendance']}%
            - Topic Mastery: {', '.join([f"{m['subject']}: {m['score']}%" for m in report_context['mastery']])}
            - Consistency: {report_context['streak']} day streak, {report_context['focus']}% focus score.

            Format response as JSON with: 'summary', 'strengths', 'weaknesses', 'recommendations'.
            """

            response = self.tutor_service.get_chat_response(
                [{"role": "user", "content": prompt}]
            )

            try:
                ai_data = json.loads(response)
            except:
                ai_data = {
                    "summary": f"{student.user.first_name} is showing steady progress in {report_context['class']}.",
                    "strengths": ["Consistent participation", "Good performance"],
                    "weaknesses": ["Attendance could be better"],
                    "recommendations": ["Review weak topics daily"],
                }

            report_obj = {
                "student_name": report_context["name"],
                "metrics": report_context,
                "ai_report": ai_data,
                "generated_at": timezone.now().isoformat(),
            }

            if save:
                StudentAIReport.objects.using(using).create(
                    tenant_id=student.user.tenant_id,
                    student=student,
                    report_data=report_obj,
                    is_automated=is_automated,
                )

            return report_obj

        except Exception as e:
            print(f"Reporting Error: {e}")
            return {"error": str(e)}

    def generate_class_summary(self, class_id: int, using: str = "default") -> Dict:
        """
        Generate an aggregate AI summary for an entire class.
        """
        try:
            from academic.models import AcademicClass

            academic_class = AcademicClass.objects.using(using).get(id=class_id)
            students = Student.objects.using(using).filter(
                academic_class=academic_class
            )

            if not students.exists():
                return {"error": "No students in this class"}

            # Aggregate stats
            results = Result.objects.using(using).filter(student__in=students)
            avg_score = results.aggregate(Avg("score"))["score__avg"] or 0

            # Top Performing vs At Risk
            from .predictive_service import PredictiveAnalyticsService

            predictor = PredictiveAnalyticsService()
            risk_data = predictor._identify_at_risk_students([class_id], using=using)

            summary_context = {
                "class_name": academic_class.name,
                "student_count": students.count(),
                "avg_score": round(avg_score, 1),
                "at_risk_count": len(risk_data),
                "top_performing": students.annotate(avg=Avg("results__score")).order_by(
                    "-avg"
                )[:3],
            }

            prompt = f"""
            Summarize the academic health of class {summary_context['class_name']}.
            Metrics:
            - Average Score: {summary_context['avg_score']}%
            - Students at Risk: {summary_context['at_risk_count']} out of {summary_context['student_count']}
            - Top Students: {', '.join([s.user.get_full_name() for s in summary_context['top_performing']])}

            Provide a 3-sentence professional summary for the school administrator.
            """

            response = self.tutor_service.get_chat_response(
                [{"role": "user", "content": prompt}]
            )

            return {
                "class_id": class_id,
                "class_name": academic_class.name,
                "stats": summary_context,
                "ai_summary": response,
            }
        except Exception as e:
            print(f"Class Reporting Error: {e}")
            return {"error": str(e)}
