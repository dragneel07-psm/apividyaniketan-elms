# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.core.exceptions import ValidationError
from django.db import transaction

from ..models.exam import Exam, ExamSeating
from ..models.student import Student


class ExamService:
    @staticmethod
    def allocate_seating(exam_id):
        """
        Allocates students to seats for an exam based on the targeted section.
        Generates unique hall ticket numbers and seat identifiers.
        """
        try:
            exam = Exam.objects.select_related("assessment", "assessment__section").get(
                exam_id=exam_id
            )
        except Exam.DoesNotExist:
            raise ValidationError(f"Exam {exam_id} not found.")

        assessment = exam.assessment

        # Determine the target student pool
        # Note: We avoid filtering by user__is_active here to prevent cross-db joins
        # between tenant DB (Student) and shared DB (UserAccount).
        if assessment.section:
            students = Student.objects.filter(section=assessment.section)
        else:
            # Fallback to the subject's class if section isn't specified
            students = Student.objects.filter(
                academic_class=assessment.subject.academic_class
            )

        total_students = students.count()
        if total_students == 0:
            raise ValidationError("No students found for the target section/class.")

        if total_students > exam.seating_capacity:
            raise ValidationError(
                f"Insufficient seating capacity in {exam.exam_center or 'the hall'}. "
                f"Needed: {total_students}, Available: {exam.seating_capacity}"
            )

        with transaction.atomic():
            # Clear existing seating for a fresh allocation
            ExamSeating.objects.filter(exam=exam).delete()

            allocated_count = 0
            # Order by student_id to avoid cross-db ordering overhead
            for i, student in enumerate(students.order_by("student_id"), 1):
                hall_ticket = exam.generate_hall_ticket_number(student)

                ExamSeating.objects.create(
                    exam=exam,
                    student=student,
                    hall_ticket_number=hall_ticket,
                    room_number=exam.exam_center or "Main Examination Hall",
                    seat_number=f"S-{i:03d}",
                    attendance_status="present",  # Initial state
                )
                allocated_count += 1

        return allocated_count

    @staticmethod
    def publish_exam(exam_id):
        """
        Marks an exam as published and generates notifications for assigned students.
        """
        exam = Exam.objects.get(exam_id=exam_id)
        if not exam.is_published:
            exam.is_published = True
            exam.save()
            # Logic for triggering global notifications would go here
            return True
        return False
