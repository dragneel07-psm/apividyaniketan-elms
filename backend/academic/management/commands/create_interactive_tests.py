# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import json

from django.core.management.base import BaseCommand

from academic.models.lesson import Chapter, Lesson
from academic.models.subject import Subject


class Command(BaseCommand):
    help = "Create test interactive lessons for demonstration"

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS("=== Creating Interactive Test Lessons ===\n")
        )

        # Check for existing data
        subject_count = Subject.objects.count()
        chapter_count = Chapter.objects.count()

        self.stdout.write(f"Subjects in database: {subject_count}")
        self.stdout.write(f"Chapters in database: {chapter_count}\n")

        if chapter_count == 0:
            self.stdout.write(self.style.ERROR("❌ No chapters found!"))
            self.stdout.write("Please create a Subject and Chapter first.")
            return

        chapter = Chapter.objects.first()
        self.stdout.write(f"Using chapter: '{chapter.title}' (ID: {chapter.id})")
        self.stdout.write(f"Subject: '{chapter.subject.name}'\n")

        # Video lesson with interactions
        video_interaction_data = {
            "interactions": [
                {
                    "id": "quiz_1",
                    "type": "quiz",
                    "timestamp": 10,
                    "title": "Quick Check",
                    "content": {
                        "questions": [
                            {
                                "question": "What is this lesson about?",
                                "options": [
                                    "React",
                                    "Interactive Learning",
                                    "Sleep",
                                    "Food",
                                ],
                                "correctIndex": 1,
                                "explanation": "This demonstrates interactive elements!",
                            }
                        ]
                    },
                },
                {
                    "id": "info_1",
                    "type": "info",
                    "timestamp": 25,
                    "title": "Fun Fact",
                    "content": {
                        "text": "<p>Interactive lessons boost retention by 40%!</p>"
                    },
                },
            ]
        }

        lesson, created = Lesson.objects.update_or_create(
            title="Interactive Video Demo",
            defaults={
                "chapter": chapter,
                "content_type": "video",
                "video_url": "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
                "content": "<p>Video with timestamp-triggered interactions.</p>",
                "interactive_data": video_interaction_data,
                "is_published": True,
                "order": 100,
            },
        )
        status = "✅ Created" if created else "✅ Updated"
        self.stdout.write(
            self.style.SUCCESS(f"{status} '{lesson.title}' (ID: {lesson.id})")
        )

        # Text lesson with interactions
        text_interaction_data = {
            "interactions": [
                {
                    "id": "text_quiz_1",
                    "type": "quiz",
                    "position": "start",
                    "title": "Pre-Quiz",
                    "content": {
                        "questions": [
                            {
                                "question": "Ready to learn?",
                                "options": ["Yes!", "No", "Maybe"],
                                "correctIndex": 0,
                                "explanation": "Great! Let's go.",
                            }
                        ]
                    },
                },
                {
                    "id": "text_info_1",
                    "type": "info",
                    "position": "end",
                    "title": "Takeaway",
                    "content": {
                        "text": "<p><strong>Remember:</strong> Practice makes perfect!</p>"
                    },
                },
            ]
        }

        lesson_text, created_text = Lesson.objects.update_or_create(
            title="Interactive Text Demo",
            defaults={
                "chapter": chapter,
                "content_type": "text",
                "content": "<h2>Interactive Text</h2><p>This lesson has start and end interactions.</p>",
                "interactive_data": text_interaction_data,
                "is_published": True,
                "order": 101,
            },
        )
        status_text = "✅ Created" if created_text else "✅ Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{status_text} '{lesson_text.title}' (ID: {lesson_text.id})"
            )
        )

        self.stdout.write(self.style.SUCCESS("\n=== Done! ==="))
        self.stdout.write(f"\nTest at: http://localhost:3000")
        self.stdout.write(f"  Course: {chapter.subject.name}")
        self.stdout.write(f"  Chapter: {chapter.title}\n")
