# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from datetime import timedelta

from django.db.models import Avg, Count, Sum
from django.utils import timezone

from academic.models.assessment import Assessment, Result
from academic.models.attendance import Attendance
from academic.models.student import Student
from academic.models.subject import Subject


class PredictiveAnalyticsService:
    def get_teacher_dashboard_data(self, class_ids, using="default"):
        """
        Generate predictive analytics for a list of academic class IDs.
        """
        if not class_ids:
            return {
                "at_risk_count": 0,
                "at_risk_students": [],
                "performance_trends": [],
                "topic_mastery": [],
                "ai_insights": ["You haven't been assigned any classes yet."],
            }

        # 1. Identify Students at Risk
        risk_students = self._identify_at_risk_students(class_ids, using=using)

        # 2. Performance Trends (Last 4 weeks)
        trends = self._calculate_performance_trends(class_ids, using=using)

        # 3. Topic Mastery Predictions
        topic_mastery = self._calculate_topic_mastery(class_ids, using=using)

        return {
            "at_risk_count": len(risk_students),
            "at_risk_students": risk_students[:5],  # Top 5 highest risk
            "performance_trends": trends,
            "topic_mastery": topic_mastery,
            "ai_insights": self._generate_ai_insights(risk_students, topic_mastery),
        }

    def get_teacher_analytics(self, teacher_user, using="default"):
        """
        Generate predictive analytics for a teacher's assigned classes.
        """
        from academic.models.teacher import Teacher

        try:
            teacher = Teacher.objects.using(using).get(user=teacher_user)
            assigned_classes = teacher.assigned_classes or []

            if not assigned_classes:
                return {"error": "No classes assigned to this teacher"}

            return self.get_teacher_dashboard_data(assigned_classes, using=using)
        except Exception as e:
            print(f"Predictive Analytics Error: {e}")
            return {"error": str(e)}

    def _identify_at_risk_students(self, class_ids, using="default"):
        """
        Identify students with low grades or declining attendance.
        """
        risk_list = []
        # Use select_related to join with user table and avoid DoesNotExist later
        students = (
            Student.objects.using(using)
            .filter(academic_class_id__in=class_ids)
            .select_related("user")
        )

        for student in students:
            # Skip students without a valid user record in this DB
            try:
                if not student.user:
                    continue
            except Exception:
                continue

            reasons = []
            risk_score = 0

            # Check Grades (avg < 50%)
            results = (
                Result.objects.using(using)
                .filter(student=student)
                .select_related("assessment")
            )
            if results.exists():
                valid_results = [r for r in results if r.assessment.total_marks > 0]
                if valid_results:
                    total_percentage = sum(
                        (r.score / r.assessment.total_marks) * 100
                        for r in valid_results
                    ) / len(valid_results)
                    if total_percentage < 55:
                        risk_score += 35
                        reasons.append(
                            f"Low average grade ({round(total_percentage)}%)"
                        )

            # Check Attendance (last 30 days)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            attendance = Attendance.objects.using(using).filter(
                student=student, date__gte=thirty_days_ago
            )
            if attendance.exists():
                present_count = attendance.filter(status="present").count()
                total_days = attendance.count()
                att_percentage = (present_count / total_days) * 100
                if att_percentage < 75:
                    risk_score += 25
                    reasons.append(f"Low attendance ({round(att_percentage)}%)")

            # Check Gamification Engagement (New in Sprint 7)
            from gamification.models import PointTransaction

            points_last_7 = (
                PointTransaction.objects.using(using)
                .filter(
                    student=student, timestamp__gte=timezone.now() - timedelta(days=7)
                )
                .aggregate(total=Sum("points"))["total"]
                or 0
            )

            if points_last_7 < 50:
                risk_score += 15
                reasons.append("Low academic engagement (minimal recent activity)")

            if student.current_streak == 0:
                risk_score += 10
                reasons.append("Inactive streak (needs motivation)")

            if risk_score > 0:
                risk_list.append(
                    {
                        "id": student.student_id,
                        "name": student.user.get_full_name(),
                        "risk_level": "High" if risk_score >= 50 else "Medium",
                        "reasons": reasons,
                        "score": risk_score,
                    }
                )

        return sorted(risk_list, key=lambda x: x["score"], reverse=True)

    def _calculate_performance_trends(self, class_ids, using="default"):
        """
        Weekly performance trends.
        """
        weeks = []
        now = timezone.now()
        for i in range(4, -1, -1):
            start_date = now - timedelta(weeks=i + 1)
            end_date = now - timedelta(weeks=i)

            avg = (
                Result.objects.using(using)
                .filter(
                    assessment__subject__academic_class_id__in=class_ids,
                    submitted_at__range=(start_date, end_date),
                )
                .select_related("assessment")
            )

            if avg.exists():
                # Percentages
                valid_avg = [r for r in avg if r.assessment.total_marks > 0]
                if valid_avg:
                    p_avg = sum(
                        (r.score / r.assessment.total_marks) * 100 for r in valid_avg
                    ) / len(valid_avg)
                    weeks.append(
                        {
                            "week": f"Week {5-i}",
                            "avgScore": round(p_avg),
                            "classAvg": 70,  # Standard/Target
                        }
                    )
                else:
                    weeks.append({"week": f"Week {5-i}", "avgScore": 0, "classAvg": 70})
            else:
                weeks.append({"week": f"Week {5-i}", "avgScore": 0, "classAvg": 70})
        return weeks

    def _calculate_topic_mastery(self, class_ids, using="default"):
        """
        Mastery level by subject.
        """
        subjects = Subject.objects.using(using).filter(academic_class_id__in=class_ids)
        mastery = []
        for sub in subjects:
            results = (
                Result.objects.using(using)
                .filter(assessment__subject=sub)
                .select_related("assessment")
            )
            if results.exists():
                valid_res = [r for r in results if r.assessment.total_marks > 0]
                if valid_res:
                    avg_p = sum(
                        (r.score / r.assessment.total_marks) * 100 for r in valid_res
                    ) / len(valid_res)
                    mastery.append({"topic": sub.name, "score": round(avg_p)})
        return mastery

    def _generate_ai_insights(self, risk_students, topic_mastery):
        """
        Generate text insights based on data using AI.
        """
        from .tutor_service import ai_tutor_service

        data = {
            "at_risk_count": len(risk_students),
            "at_risk_students": risk_students[:5],
            "topic_mastery": topic_mastery,
        }

        return ai_tutor_service.generate_teacher_insights(data)


predictive_service = PredictiveAnalyticsService()
