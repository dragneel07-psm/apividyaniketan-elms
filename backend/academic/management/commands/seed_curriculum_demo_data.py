# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Seeds curriculum content (Chapter/Lesson/LessonMaterial/LessonProgress) for
every Subject in an existing school tenant, so the teacher portal's
Courses/Curriculum pages have content to show instead of "No chapters
created yet." Idempotent (get_or_create throughout).

Assumes seed_school_demo_data has already been run for the target schema.

Usage:
  python manage.py seed_curriculum_demo_data --schema apividyaniketan
"""

import random

from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import schema_context

from academic.models import Student, Subject
from academic.models.lesson import Chapter, Lesson, LessonMaterial, LessonProgress
from academic.services.academic_year_service import ensure_current_academic_year
from core.models import Tenant

CHAPTER_TITLES = ["Foundations & Introduction", "Core Concepts", "Applied Practice"]

# (title, content_type, duration_minutes)
LESSON_SPECS = [
    ("Introduction & Overview", "text", 30),
    ("Guided Video Walkthrough", "video", 25),
    ("Practice & Worked Examples", "text", 40),
    ("Recap & Key Takeaways", "text", 20),
]


class Command(BaseCommand):
    help = (
        "Seed Chapter/Lesson/LessonMaterial/LessonProgress curriculum "
        "content for every subject in an existing tenant. Run "
        "seed_school_demo_data first."
    )

    def add_arguments(self, parser):
        parser.add_argument("--schema", required=True, help="Tenant schema to seed into.")
        parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducible progress.")

    def handle(self, *args, **options):
        schema = str(options["schema"]).strip().lower()
        rng = random.Random(int(options["seed"]))

        if not schema or schema == "public":
            raise CommandError("--schema must be a non-public tenant schema.")

        tenant = Tenant.objects.filter(schema_name=schema).first()
        if not tenant:
            raise CommandError(f"Tenant schema '{schema}' not found.")

        with schema_context(schema):
            year = ensure_current_academic_year()
            if not year:
                raise CommandError(
                    f"No academic year found in schema '{schema}'. Run seed_school_demo_data first."
                )
            subjects = list(Subject.objects.filter(academic_year=year).select_related("academic_class"))
            if not subjects:
                raise CommandError(
                    f"No subjects found in schema '{schema}'. Run seed_school_demo_data first."
                )

            chapters_created = 0
            lessons_created = 0
            materials_created = 0
            progress_created = 0

            for subject in subjects:
                students = list(Student.objects.filter(academic_class=subject.academic_class))

                for chapter_order, chapter_title in enumerate(CHAPTER_TITLES, start=1):
                    chapter, chapter_created = Chapter.objects.get_or_create(
                        subject=subject,
                        order=chapter_order,
                        defaults={
                            "title": f"{chapter_title}",
                            "description": f"{chapter_title} for {subject.name}.",
                            "is_published": chapter_order < len(CHAPTER_TITLES),  # last chapter left as draft
                        },
                    )
                    if chapter_created:
                        chapters_created += 1

                    for lesson_order, (title, content_type, duration) in enumerate(LESSON_SPECS, start=1):
                        is_last_lesson_of_last_chapter = (
                            chapter_order == len(CHAPTER_TITLES) and lesson_order == len(LESSON_SPECS)
                        )
                        lesson, lesson_created = Lesson.objects.get_or_create(
                            chapter=chapter,
                            order=lesson_order,
                            defaults={
                                "title": title,
                                "content_type": content_type,
                                "content": f"<p>{title} content for {subject.name} — {chapter.title}.</p>",
                                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" if content_type == "video" else None,
                                "duration_minutes": duration,
                                "is_published": not is_last_lesson_of_last_chapter,
                            },
                        )
                        if lesson_created:
                            lessons_created += 1

                        if lesson_created and lesson_order == 1:
                            _, material_created = LessonMaterial.objects.get_or_create(
                                lesson=lesson,
                                title=f"{subject.name} - {chapter.title} reference notes",
                                defaults={
                                    "link": "https://example.com/reference-notes.pdf",
                                    "material_type": "link",
                                },
                            )
                            if material_created:
                                materials_created += 1

                        if lesson_created and lesson.is_published:
                            for idx, student in enumerate(students):
                                completed = idx % 2 == 0
                                _, progress_was_created = LessonProgress.objects.get_or_create(
                                    student=student,
                                    lesson=lesson,
                                    defaults={
                                        "completed": completed,
                                        "xp_awarded": completed,
                                        "progress_percent": 100.0 if completed else round(rng.uniform(10, 80), 1),
                                    },
                                )
                                if progress_was_created:
                                    progress_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nCurriculum demo data seeded into schema={schema}: "
                f"{chapters_created} chapters, {lessons_created} lessons, "
                f"{materials_created} lesson materials, {progress_created} lesson-progress rows created."
            )
        )
