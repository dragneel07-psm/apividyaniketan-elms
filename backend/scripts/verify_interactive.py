# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import json
import os
import sys

import django

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from academic.models.lesson import Chapter, Lesson
from academic.models.subject import Subject


def create_test_interactive_lesson():
    print("=== Interactive Lesson Verification Script ===\n")

    # Check for existing data
    subject_count = Subject.objects.count()
    chapter_count = Chapter.objects.count()

    print(f"Subjects in database: {subject_count}")
    print(f"Chapters in database: {chapter_count}\n")

    if chapter_count == 0:
        print("❌ No chapters found in the database.")
        print(
            "Please create a Subject and Chapter first using the Django admin or API.\n"
        )
        print("Example steps:")
        print("  1. Login to Django admin: http://localhost:8000/admin")
        print("  2. Create a Subject")
        print("  3. Create a Chapter within that Subject")
        print("\nThen run this script again.")
        sys.exit(1)

    # Get or create test chapter
    chapter = Chapter.objects.first()
    print(f"Using chapter: '{chapter.title}' (ID: {chapter.id})")
    print(f"Subject: '{chapter.subject.name}'\n")

    # Create a video lesson with interactions
    video_interaction_data = {
        "interactions": [
            {
                "id": "quiz_1",
                "type": "quiz",
                "timestamp": 10,
                "title": "Quick Check: Basics",
                "content": {
                    "questions": [
                        {
                            "question": "What is the primary goal of this lesson?",
                            "options": [
                                "To learn React",
                                "To understand Interactivity",
                                "To sleep",
                                "To eat",
                            ],
                            "correctIndex": 1,
                            "explanation": "Interactivity is the core topic here!",
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
                    "text": "<p>Did you know that interactive lessons increase retention by 40%?</p>"
                },
            },
        ]
    }

    lesson, created = Lesson.objects.update_or_create(
        title="Interactive Video Demo",
        defaults={
            "chapter": chapter,
            "content_type": "video",
            "video_url": "https://www.youtube.com/watch?v=aqz-KE-bpKQ",  # Sample big buck bunny video
            "content": "<p>This video demonstrates interactive elements that trigger at specific timestamps.</p>",
            "interactive_data": video_interaction_data,
            "is_published": True,
            "order": 100,
        },
    )
    status = "✅ Created" if created else "✅ Updated"
    print(f"{status} lesson: '{lesson.title}' (ID: {lesson.id})")

    # Create a text lesson with interactions
    text_interaction_data = {
        "interactions": [
            {
                "id": "text_quiz_1",
                "type": "quiz",
                "position": "start",
                "title": "Pre-Lesson Quiz",
                "content": {
                    "questions": [
                        {
                            "question": "Are you ready to learn?",
                            "options": ["Yes!", "No", "Maybe"],
                            "correctIndex": 0,
                            "explanation": "Great! Let's get started.",
                        }
                    ]
                },
            },
            {
                "id": "text_info_1",
                "type": "info",
                "position": "end",
                "title": "Key Takeaway",
                "content": {
                    "text": "<p><strong>Remember:</strong> Always practice what you learn!</p>"
                },
            },
        ]
    }

    lesson_text, created_text = Lesson.objects.update_or_create(
        title="Interactive Text Demo",
        defaults={
            "chapter": chapter,
            "content_type": "text",
            "content": "<h2>Welcome to Interactive Learning</h2><p>This is a text lesson with interactions at the start and end.</p><p>The main content explains concepts, and interactive elements help reinforce learning.</p>",
            "interactive_data": text_interaction_data,
            "is_published": True,
            "order": 101,
        },
    )
    status_text = "✅ Created" if created_text else "✅ Updated"
    print(f"{status_text} lesson: '{lesson_text.title}' (ID: {lesson_text.id})\n")

    print("=== Verification Complete ===")
    print("\nYou can now test these lessons:")
    print(f"  1. Login to http://localhost:3000 as a student")
    print(f"  2. Navigate to the course containing '{chapter.subject.name}'")
    print(f"  3. Open the '{chapter.title}' chapter")
    print(
        f"  4. Try the 'Interactive Video Demo' and 'Interactive Text Demo' lessons\n"
    )


if __name__ == "__main__":
    try:
        create_test_interactive_lesson()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
