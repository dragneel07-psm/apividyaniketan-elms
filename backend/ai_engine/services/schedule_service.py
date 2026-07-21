# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from datetime import timedelta

from django.utils import timezone

from academic.models import Subject
from ai_engine.models import StudyEvent


class ScheduleService:
    def generate_study_schedule(
        self, student, start_date=None, days=7, using="default"
    ):
        """
        Generates study events for the next 'days' days.
        Prioritizes weak subjects and schedules sessions around upcoming exams.
        """
        if not start_date:
            start_date = timezone.now()

        # 1. Get student's subjects and performance
        if student.academic_class:
            subjects = list(student.academic_class.subjects.using(using).all())
        else:
            subjects = []

        if not subjects:
            return []

        # 2. Identify "Weak" subjects (<60% average)
        from academic.models import Assessment, Result
        from ai_engine.models import LearningPath

        weak_subjects = []
        for sub in subjects:
            results = (
                Result.objects.using(using)
                .filter(student=student, assessment__subject=sub)
                .select_related("assessment")
            )
            if results.exists():
                valid_res = [r for r in results if r.assessment.total_marks > 0]
                if valid_res:
                    avg = sum(
                        (r.score / r.assessment.total_marks) * 100 for r in valid_res
                    ) / len(valid_res)
                    if avg < 60:
                        weak_subjects.append(sub)

        # 3. Identify Upcoming Exams (next 7 days)
        end_period = start_date + timedelta(days=days + 3)
        exams = (
            Assessment.objects.using(using)
            .filter(
                type__in=["exam", "quiz"], scheduled_at__range=(start_date, end_period)
            )
            .select_related("subject")
        )

        # 4. Get Active Learning Path Nodes
        active_nodes = []
        active_path = (
            LearningPath.objects.using(using)
            .filter(student=student, is_active=True)
            .first()
        )
        if active_path:
            active_nodes = list(
                active_path.nodes.filter(
                    status__in=["unlocked", "in_progress"]
                ).order_by("order")
            )

        # Clear existing future study events to avoid duplicates
        # StudyEvent.objects.using(using).filter(student=student, start_time__gte=start_date).delete()

        generated_events = []
        subject_index = 0
        node_index = 0

        for i in range(days):
            day_date = start_date + timedelta(days=i)
            weekday = day_date.weekday()

            if weekday == 6:  # Rest day Sunday
                continue

            # Evening study blocks
            # Session 1: 5:00 PM - 6:00 PM
            start_1 = day_date.replace(hour=17, minute=0, second=0, microsecond=0)
            end_1 = start_1 + timedelta(hours=1)

            # Smart Selection Logic
            # Priority A: Exam Prep (if exam is in 1-2 days)
            exam_near = [e for e in exams if 0 < (e.scheduled_at - start_1).days <= 2]

            if exam_near:
                target_exam = exam_near[0]
                title = f"Exam Prep: {target_exam.subject.name}"
                desc = f"Focused review for upcoming {target_exam.title}"
                e_type = "exam"
                subject = target_exam.subject
            else:
                # Priority B: Weak Subjects (more frequent)
                if weak_subjects and (i % 2 == 0):
                    subject = weak_subjects[subject_index % len(weak_subjects)]
                    title = f"Remedial Study: {subject.name}"
                    desc = f"Priority review for {subject.name} to improve performance."
                    subject_index += 1
                else:
                    # Priority C: Normal Rotation
                    subject = subjects[subject_index % len(subjects)]
                    title = f"Study: {subject.name}"
                    desc = f"Regular review for {subject.name}"
                    subject_index += 1
                e_type = "study"

            # Add content from Learning Path if available
            if node_index < len(active_nodes):
                node = active_nodes[node_index]
                desc += f"\nFocus: {node.title}"
                node_index += 1

            event = StudyEvent.objects.create(
                tenant=student.user.tenant,
                student=student,
                title=title,
                description=desc,
                start_time=start_1,
                end_time=end_1,
                event_type=e_type,
                subject=subject,
            )
            generated_events.append(event)

        return generated_events
