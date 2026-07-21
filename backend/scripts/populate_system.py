# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import random
from datetime import date, time, timedelta

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.utils import timezone

from academic.models import (
    AcademicClass,
    AcademicYear,
    Assessment,
    Attendance,
    Chapter,
    Lesson,
    LessonMaterial,
    Notice,
    Result,
    Section,
    Student,
    Subject,
    Teacher,
    Timetable,
)
from core.middleware.tenant import _thread_locals
from core.models import Tenant
from gamification.models import Badge, PointTransaction, StudentBadge
from library.models import Book, BookIssue
from users.models import UserAccount


def populate():
    print("🚀 Starting system population...")

    # 1. Get Tenant
    tenant = Tenant.objects.filter(subdomain="demo").first()
    if not tenant:
        tenant = Tenant.objects.first()

    if not tenant:
        print("❌ No tenant found. Please create a tenant first.")
        return

    # Set thread local for routing
    _thread_locals.tenant = tenant
    _thread_locals.db_alias = tenant.db_alias

    # Dynamic Database Registration (Mirroring Middleware)
    from django.conf import settings
    from django.db import connections

    if tenant.db_alias not in settings.DATABASES:
        new_db_config = settings.DATABASES["default"].copy()
        new_db_config["NAME"] = settings.BASE_DIR / tenant.db_name
        settings.DATABASES[tenant.db_alias] = new_db_config
        # Update connections.databases which is what Django uses at runtime
        connections.databases[tenant.db_alias] = new_db_config

    print(
        f"🌍 Using Tenant: {tenant.name} ({tenant.subdomain}) -> DB Alias: {tenant.db_alias}"
    )

    # 2. Academic Year
    year, _ = AcademicYear.objects.get_or_create(
        name="2025-2026",
        defaults={
            "start_date": date(2025, 1, 1),
            "end_date": date(2025, 12, 31),
            "is_current": True,
        },
    )
    print(f"📅 Academic Year: {year.name}")

    # 3. Academic Classes & Sections
    class_names = ["Grade 10", "Grade 11", "Grade 12"]
    sections_list = ["A", "B"]
    classes = []
    sections = []

    for i, name in enumerate(class_names):
        ac_class, _ = AcademicClass.objects.get_or_create(
            name=name, defaults={"order": i + 10}
        )
        classes.append(ac_class)
        for sec_name in sections_list:
            sec, _ = Section.objects.get_or_create(
                name=sec_name, academic_class=ac_class, defaults={"capacity": 30}
            )
            sections.append(sec)

    print(f"🏫 Created {len(classes)} classes and {len(sections)} sections.")

    # 4. Teachers
    teacher_names = [
        ("David", "Miller"),
        ("Sarah", "Wilson"),
        ("Michael", "Brown"),
        ("Emily", "Davis"),
        ("Robert", "Garcia"),
    ]
    teachers = []
    for first, last in teacher_names:
        username = f"teacher_{first.lower()}"
        email = f"{username}@demo.com"
        user, created = UserAccount.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": first,
                "last_name": last,
                "role": "teacher",
                "tenant": tenant,
            },
        )
        if created:
            user.set_password("teacher123")
            user.save()

        teacher, _ = Teacher.objects.get_or_create(user=user)
        teachers.append(teacher)

    print(f"👨‍🏫 Created {len(teachers)} teachers.")

    # 5. Subjects
    subject_data = [
        ("Mathematics", "MATH101"),
        ("Physics", "PHYS101"),
        ("Chemistry", "CHEM101"),
        ("English", "ENG101"),
        ("Computer Science", "CS101"),
    ]
    subjects = []
    for ac_class in classes:
        for name, code in subject_data:
            subject, _ = Subject.objects.get_or_create(
                name=f"{name} ({ac_class.name})",
                academic_class=ac_class,
                defaults={
                    "code": f"{code}-{ac_class.name.replace(' ', '')}",
                    "teacher": random.choice(teachers),
                    "credits": 4.0,
                },
            )
            subjects.append(subject)

    print(f"📚 Created {len(subjects)} subjects.")

    # 6. Students
    student_names = [
        ("Alice", "Perez"),
        ("Bob", "Vance"),
        ("Charlie", "Day"),
        ("Diane", "Nguyen"),
        ("Edward", "Norton"),
        ("Fiona", "Apple"),
        ("George", "Harrison"),
        ("Hannah", "Montana"),
        ("Ian", "McKellen"),
        ("Julia", "Roberts"),
    ]
    all_students = []
    for i, sec in enumerate(sections):
        # Create 3-4 students per section
        for j in range(3):
            first, last = student_names[(i * 3 + j) % len(student_names)]
            username = f"std_{first.lower()}_{sec.academic_class.name.replace(' ', '')}_{sec.name}_{j}"
            email = f"{username}@demo.com"
            user, created = UserAccount.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": first,
                    "last_name": last,
                    "role": "student",
                    "tenant": tenant,
                },
            )
            if created:
                user.set_password("student123")
                user.save()

            student, _ = Student.objects.get_or_create(
                user=user,
                defaults={
                    "academic_class": sec.academic_class,
                },
            )
            all_students.append(student)

    print(f"🎓 Created {len(all_students)} students.")

    # 7. Chapters & Lessons
    print("📖 Seeding Chapters and Lessons...")
    for sub in subjects[:10]:  # Limit to first 10 subjects for speed
        for i in range(1, 4):
            chapter, _ = Chapter.objects.get_or_create(
                subject=sub,
                title=f"Chapter {i}: Introduction to {sub.name}",
                defaults={"order": i},
            )

            # Lesson 1: Video
            Lesson.objects.get_or_create(
                chapter=chapter,
                title=f"Lesson {i}.1: Overview of {sub.name}",
                defaults={
                    "content_type": "video",
                    "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    "order": 1,
                    "is_published": True,
                },
            )

            # Lesson 2: Text/Interactive
            Lesson.objects.get_or_create(
                chapter=chapter,
                title=f"Lesson {i}.2: Deep Dive",
                defaults={
                    "content_type": "text",
                    "content": f"Detailed content for {sub.name} chapter {i}.",
                    "order": 2,
                    "is_published": True,
                },
            )

    # 8. Attendance
    print("📅 Seeding Attendance...")
    today = date.today()
    for student in all_students[:10]:
        for i in range(5):
            d = today - timedelta(days=i)
            # Skip weekends
            if d.weekday() >= 5:
                continue

            sub = Subject.objects.filter(academic_class=student.academic_class).first()
            if sub:
                Attendance.objects.get_or_create(
                    student=student,
                    subject=sub,
                    date=d,
                    defaults={
                        "status": random.choice(
                            ["present", "present", "present", "late", "absent"]
                        )
                    },
                )

    # 9. Timetable
    print("🕙 Seeding Timetable...")
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    for sec in sections[:2]:
        for i, day in enumerate(days):
            subs = Subject.objects.filter(academic_class=sec.academic_class)
            for j, sub in enumerate(subs[:4]):
                Timetable.objects.get_or_create(
                    academic_class=sec.academic_class,
                    day_of_week=day,
                    start_time=time(9 + j, 0),
                    end_time=time(10 + j, 0),
                    defaults={
                        "subject_name": sub.name.split(" (")[0],
                        "teacher": sub.teacher,
                        "room_number": f"Room {100 + i + j}",
                    },
                )

    # 10. Assessments & Results
    print("📝 Seeding Assessments...")
    for sub in subjects[:5]:
        assessment, _ = Assessment.objects.get_or_create(
            subject=sub,
            title=f"Mid-Term Quiz - {sub.name}",
            defaults={
                "type": "quiz",
                "total_marks": 50,
                "due_date": timezone.now() + timedelta(days=7),
            },
        )

        # Results for the first set of students
        relevant_students = Student.objects.filter(academic_class=sub.academic_class)
        for std in relevant_students:
            Result.objects.get_or_create(
                assessment=assessment,
                student=std,
                defaults={
                    "score": random.randint(30, 50),
                    "teacher_feedback": "Well done!",
                },
            )

    # 11. Notices
    print("📢 Seeding Notices...")
    Notice.objects.get_or_create(
        title="Welcome to the New Academic Year!",
        defaults={
            "content": "We are excited to welcome all students back to school. Let's make this a great year!",
            "category": "school",
            "priority": "high",
            "published_date": timezone.now(),
        },
    )

    Notice.objects.get_or_create(
        title="Mathematics Assessment Next Week",
        defaults={
            "content": "Please prepare for the mid-term quiz next Friday.",
            "category": "class",
            "priority": "medium",
            "published_date": timezone.now(),
        },
    )

    # 12. Library
    print("📚 Seeding Library...")
    books_data = [
        ("The Great Gatsby", "F. Scott Fitzgerald", "fiction"),
        ("A Brief History of Time", "Stephen Hawking", "science"),
        ("Calculus Made Easy", "Silvanus P. Thompson", "mathematics"),
        ("Clean Code", "Robert C. Martin", "technology"),
        ("The Diary of a Young Girl", "Anne Frank", "biography"),
    ]
    for title, author, cat in books_data:
        if not Book.objects.filter(title=title, author=author).exists():
            Book.objects.create(
                title=title,
                author=author,
                category=cat,
                total_copies=5,
                available_copies=5,
            )

    # 13. Gamification
    print("🏆 Seeding Gamification...")
    badges_data = [
        (
            "Early Bird",
            "Submit 3 assessments before due date",
            "bird",
            "early_bird",
            50,
        ),
        ("Streak Master", "Login 7 days in a row", "zap", "streak_days", 100),
        (
            "Math Genius",
            "Get a perfect score in a Math assessment",
            "target",
            "perfect_score",
            150,
        ),
        ("Bookworm", "Complete 5 lessons in a week", "book", "lessons_completed", 75),
    ]
    for name, desc, icon, ctype, xp in badges_data:
        Badge.objects.get_or_create(
            name=name,
            tenant=tenant,
            defaults={
                "description": desc,
                "icon_name": icon,
                "criteria_type": ctype,
                "xp_reward": xp,
            },
        )

    print("\n✨ System population complete! Enjoy testing the E-Learning platform.")


if __name__ == "__main__":
    populate()
