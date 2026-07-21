# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.

import json
import os

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django_tenants.utils import schema_context

from academic.models.academic import AcademicClass
from academic.models.lesson import Chapter, Lesson
from academic.models.subject import Subject


def setup_demo():
    with schema_context("demo"):
        # 1. Get or create a class
        klass, _ = AcademicClass.objects.get_or_create(
            name="Grade 12", defaults={"order": 12}
        )

        # 2. Create Subject
        subject, _ = Subject.objects.get_or_create(
            name="Interactive Demo Subject",
            academic_class=klass,
            defaults={"description": "A subject to test interactive lessons"},
        )

        # 3. Create Chapter
        chapter, _ = Chapter.objects.get_or_create(
            subject=subject,
            title="Module 1: Interactive Learning",
            defaults={"order": 1},
        )

        # 4. Create Quiz Lesson
        quiz_data = {
            "questions": [
                {
                    "question": "Which hook is used for side effects in React?",
                    "options": ["useState", "useEffect", "useContext", "useReducer"],
                    "correctIndex": 1,
                    "explanation": "useEffect is used to perform side effects in functional components.",
                },
                {
                    "question": "What is the correct way to update state in React?",
                    "options": [
                        "state.value = newValue",
                        "setState(newValue)",
                        "updateState(newValue)",
                        "this.val = newValue",
                    ],
                    "correctIndex": 1,
                    "explanation": "State should always be updated using the setter function from useState or setState.",
                },
            ]
        }
        Lesson.objects.get_or_create(
            chapter=chapter,
            title="React Hooks Quiz",
            defaults={
                "content_type": "quiz",
                "interactive_data": quiz_data,
                "content": "<p>Take this quiz to test your knowledge of React hooks.</p>",
                "is_published": True,
                "order": 1,
            },
        )

        # 5. Create Flashcards Lesson
        flash_data = {
            "cards": [
                {
                    "front": "JSX",
                    "back": "JavaScript XML. A syntax extension for JavaScript that looks like HTML.",
                },
                {
                    "front": "Props",
                    "back": "Short for properties. Data passed from parent to child components.",
                },
                {"front": "State", "back": "Internal data managed within a component."},
            ]
        }
        Lesson.objects.get_or_create(
            chapter=chapter,
            title="React Basics Flashcards",
            defaults={
                "content_type": "flashcards",
                "interactive_data": flash_data,
                "content": "<p>Review these flashcards to master React terminology.</p>",
                "is_published": True,
                "order": 2,
            },
        )

        # 6. Create Tabs Lesson
        tabs_data = {
            "tabs": [
                {
                    "title": "Components",
                    "content": "<p>Components are the building blocks of any React application. They can be <b>functional</b> or <b>class-based</b>.</p>",
                },
                {
                    "title": "Virtual DOM",
                    "content": "<p>The Virtual DOM is a lightweight copy of the real DOM. React uses it to improve performance by <i>diffing</i> changes.</p>",
                },
                {
                    "title": "One-way Data Flow",
                    "content": "<p>Data in React flows in one direction: from top to bottom (parents to children).</p>",
                },
            ]
        }
        Lesson.objects.get_or_create(
            chapter=chapter,
            title="React Architecture Overview",
            defaults={
                "content_type": "tabs",
                "interactive_data": tabs_data,
                "content": "<p>Explore the architecture of React through these interactive tabs.</p>",
                "is_published": True,
                "order": 3,
            },
        )

        print(
            f"Successfully created demo lessons in subject: {subject.name} (ID: {subject.id})"
        )


if __name__ == "__main__":
    setup_demo()
