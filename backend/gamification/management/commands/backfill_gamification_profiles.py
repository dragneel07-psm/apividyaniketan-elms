# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.core.management.base import BaseCommand

from academic.models import Student
from gamification.services.gamification_service import GamificationService


class Command(BaseCommand):
    help = "Ensures all students have a GamificationProfile"

    def handle(self, *args, **options):
        students = Student.objects.all()
        count = 0
        for student in students:
            try:
                GamificationService.get_or_create_profile(student)
                count += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error for student {student.pk}: {str(e)}")
                )

        self.stdout.write(self.style.SUCCESS(f"Processed {count} students"))
