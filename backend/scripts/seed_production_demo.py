# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Comprehensive seed script for the 'demo' tenant in production.
Run via:
  DATABASE_URL=<url> ALLOWED_HOSTS="*" DJANGO_SETTINGS_MODULE=config.settings.local \
  python manage.py shell < scripts/seed_production_demo.py
"""

import datetime
import random

from django.utils import timezone
from django_tenants.utils import schema_context

SCHEMA = "demo"

with schema_context(SCHEMA):
    from academic.models import AcademicClass, Lesson, Parent, Student, Subject, Teacher
    from ai_engine.models import (
        AiGeneratedArtifact,
        AIInteractionLog,
        LearningNode,
        LearningPath,
        StudyEvent,
    )
    from billing.models_school import Expense, FeeStructure, Payment, StudentFee
    from conversations.models import Conversation, ConversationParticipant, Message
    from core.models import Tenant
    from gamification.models import (
        Badge,
        GamificationProfile,
        PointTransaction,
        StudentBadge,
    )
    from library.models import Book, BookIssue
    from notifications.models import Notification
    from users.models import UserAccount

    tenant = Tenant.objects.get(schema_name=SCHEMA)
    students = list(Student.objects.select_related("user", "academic_class").all()[:50])
    teachers = list(Teacher.objects.select_related("user").all()[:10])
    student_users = [s.user for s in students]
    teacher_users = [t.user for t in teachers]
    classes = list(AcademicClass.objects.all())
    subjects = list(Subject.objects.all()[:10])
    lessons = list(Lesson.objects.all()[:30])

    print(
        f"Working with {len(students)} students, {len(teachers)} teachers, {len(lessons)} lessons"
    )

    # ── 1. PARENTS ─────────────────────────────────────────────────────────────
    parents_created = 0
    first_names = [
        "Robert",
        "Jennifer",
        "Michael",
        "Linda",
        "William",
        "Patricia",
        "David",
        "Barbara",
        "Richard",
        "Susan",
        "Joseph",
        "Jessica",
        "Thomas",
        "Sarah",
        "Charles",
        "Karen",
        "Christopher",
        "Lisa",
    ]
    last_names = [
        "Anderson",
        "Johnson",
        "Williams",
        "Brown",
        "Jones",
        "Garcia",
        "Miller",
        "Davis",
        "Wilson",
        "Taylor",
    ]

    for i, student in enumerate(students[:18]):
        fn = first_names[i % len(first_names)]
        ln = last_names[i % len(last_names)]
        parent_user, pu_created = UserAccount.objects.get_or_create(
            username=f"parent_{student.user.username[:20]}",
            defaults={
                "email": f"parent.{i}@demo.school.edu",
                "first_name": fn,
                "last_name": ln,
                "role": "parent",
                "tenant": tenant,
            },
        )
        if pu_created:
            parent_user.set_password("parent123")
            parent_user.save()

        parent, created = Parent.objects.get_or_create(user=parent_user)
        if created:
            parents_created += 1
        if not parent.students.filter(pk=student.pk).exists():
            parent.students.add(student)

    print(f"✓ Parents: {parents_created} created")

    # ── 2. NOTIFICATIONS ───────────────────────────────────────────────────────
    notif_data = [
        (
            "Assignment Due Tomorrow",
            "Your Math assignment is due tomorrow. Please submit on time.",
        ),
        (
            "Grade Posted",
            "Your Science test grade has been posted. Check your results.",
        ),
        (
            "Attendance Alert",
            "You were marked absent on Monday. Please contact your teacher.",
        ),
        (
            "New Lesson Available",
            "A new lesson has been published for your class. Start learning!",
        ),
        ("Fee Reminder", "Your term fee payment is due in 5 days."),
        ("Badge Earned", "Congratulations! You earned a new badge. Keep it up!"),
        ("Class Rescheduled", "Physics class has been rescheduled to Thursday 2 PM."),
        ("Library Book Due", "Your borrowed book is due for return in 2 days."),
        (
            "Parent-Teacher Meeting",
            "Parent-teacher meeting scheduled for next Friday at 4 PM.",
        ),
        (
            "Exam Schedule Released",
            "Final exam schedule has been published. Check the portal.",
        ),
        ("Study Planner Ready", "Your AI-generated study plan for the week is ready."),
        (
            "Result Announced",
            "Term results have been announced. Log in to view your performance.",
        ),
    ]
    notifs_created = 0
    for user in student_users[:30] + teacher_users[:5]:
        sample = random.sample(notif_data, random.randint(2, 5))
        for title, msg in sample:
            n, created = Notification.objects.get_or_create(
                recipient=user,
                title=title,
                defaults={
                    "message": msg,
                    "is_read": random.choice([True, False]),
                    "tenant": tenant,
                },
            )
            if created:
                notifs_created += 1
    print(f"✓ Notifications: {notifs_created} created")

    # ── 3. LIBRARY ─────────────────────────────────────────────────────────────
    # ISBNs must be ≤13 chars (DB varchar(13))
    books_data = [
        (
            "Introduction to Algebra",
            "James Stewart",
            "9780321874881",
            "Mathematics",
            5,
            "McGraw Hill",
            2020,
        ),
        (
            "Biology: Life Study",
            "William Schraer",
            "9780130498801",
            "Science",
            3,
            "Pearson",
            2019,
        ),
        (
            "History of the World",
            "Robert Palmer",
            "9780070408262",
            "History",
            4,
            "McGraw Hill",
            2018,
        ),
        (
            "English Grammar in Use",
            "Raymond Murphy",
            "9780521189064",
            "English",
            6,
            "Cambridge",
            2019,
        ),
        (
            "Physics for Scientists",
            "Paul Tipler",
            "9781429201741",
            "Physics",
            3,
            "W.H. Freeman",
            2020,
        ),
        (
            "Chemistry: Change",
            "Laurel Dingrando",
            "9780078665227",
            "Chemistry",
            4,
            "Glencoe",
            2021,
        ),
        (
            "Computer Science 101",
            "Nell Dale",
            "9781449613168",
            "Computer Science",
            2,
            "Jones Bartlett",
            2019,
        ),
        (
            "The Great Gatsby",
            "F. Scott Fitzgerald",
            "9780743273179",
            "Literature",
            5,
            "Scribner",
            1925,
        ),
        (
            "Calculus Transcendentals",
            "James Stewart",
            "9781285741550",
            "Mathematics",
            3,
            "Cengage",
            2020,
        ),
        (
            "Economics: Policy",
            "William Baumol",
            "9781285858932",
            "Economics",
            4,
            "Cengage",
            2018,
        ),
        (
            "World Geography",
            "Holt McDougal",
            "9780547484818",
            "Geography",
            3,
            "Holt",
            2017,
        ),
        (
            "Learning Python",
            "Guido van Rossum",
            "9781491912058",
            "Computer Science",
            2,
            "O'Reilly",
            2021,
        ),
        (
            "Shakespeare Works",
            "William Shakespeare",
            "9780141399267",
            "Literature",
            2,
            "Penguin",
            2005,
        ),
        (
            "Environmental Science",
            "Andrew Friedland",
            "9781464109385",
            "Science",
            3,
            "W.H. Freeman",
            2019,
        ),
        (
            "Modern World History",
            "Roger Beck",
            "9780618189606",
            "History",
            4,
            "McDougal",
            2018,
        ),
    ]
    books = []
    books_created = 0
    for title, author, isbn, category, copies, publisher, year in books_data:
        book, created = Book.objects.get_or_create(
            isbn=isbn,
            defaults={
                "title": title,
                "author": author,
                "category": category,
                "publisher": publisher,
                "published_year": year,
                "total_copies": copies,
                "available_copies": copies,
                "description": f"A comprehensive resource for {category} students.",
            },
        )
        books.append(book)
        if created:
            books_created += 1

    issues_created = 0
    # Refresh books from DB to get current available_copies
    books = list(Book.objects.all())
    for student in students[:20]:
        # Skip if student already has an issue
        if BookIssue.objects.filter(student=student).exists():
            continue
        available_books = [b for b in books if b.available_copies > 0]
        if not available_books:
            break
        book = random.choice(available_books)
        due_date = timezone.now().date() + datetime.timedelta(
            days=random.randint(3, 14)
        )
        returned = random.choice([True, False])
        return_date = (
            timezone.now().date() - datetime.timedelta(days=random.randint(1, 3))
            if returned
            else None
        )
        status = "returned" if returned else "issued"
        try:
            # BookIssue.save() auto-decrements available_copies
            issue = BookIssue(
                book=book,
                student=student,
                due_date=due_date,
                return_date=return_date,
                status=status,
                fine_amount=0,
            )
            issue.full_clean()
            issue.save()
            # Refresh book copy count
            book.refresh_from_db()
            issues_created += 1
        except Exception:
            pass
    print(f"✓ Library: {books_created} books, {issues_created} issues created")

    # ── 4. GAMIFICATION ────────────────────────────────────────────────────────
    badges_data = [
        (
            "Quick Learner",
            "Completed 5 lessons in one day",
            "zap",
            "lesson_count",
            5,
            50,
        ),
        (
            "Perfect Score",
            "Got 100% on an assessment",
            "trophy",
            "perfect_score",
            1,
            100,
        ),
        (
            "Consistent Achiever",
            "Maintained above-average for a month",
            "medal",
            "avg_score",
            80,
            75,
        ),
        ("Bookworm", "Borrowed 5 library books", "book-open", "book_borrow", 5, 30),
        (
            "Attendance Hero",
            "Perfect attendance for a month",
            "calendar-check",
            "attendance_streak",
            30,
            80,
        ),
        ("First Steps", "Completed your first lesson", "rocket", "lesson_count", 1, 10),
        (
            "Team Player",
            "Participated in 3 group discussions",
            "users",
            "conversation_count",
            3,
            40,
        ),
        (
            "Math Wizard",
            "Scored above 90% in 3 Math assessments",
            "calculator",
            "subject_score",
            90,
            90,
        ),
        (
            "Science Explorer",
            "Completed 10 Science lessons",
            "flask",
            "lesson_count",
            10,
            60,
        ),
        ("Top Achiever", "Ranked top in class for a term", "crown", "rank", 1, 150),
        (
            "Early Bird",
            "Submitted 5 assignments before deadline",
            "clock",
            "early_submit",
            5,
            25,
        ),
        ("Study Streak", "Studied 7 days in a row", "flame", "study_streak", 7, 70),
    ]
    badges = []
    badges_created = 0
    for name, desc, icon, criteria_type, criteria_val, xp in badges_data:
        badge, created = Badge.objects.get_or_create(
            name=name,
            defaults={
                "description": desc,
                "icon_name": icon,
                "criteria_type": criteria_type,
                "criteria_value": criteria_val,
                "xp_reward": xp,
                "tenant": tenant,
            },
        )
        badges.append(badge)
        if created:
            badges_created += 1

    profiles_created = 0
    student_badges_created = 0
    points_created = 0
    activity_types = [
        "lesson_complete",
        "quiz_pass",
        "assignment_submit",
        "attendance",
        "badge_earn",
    ]

    for student in students[:40]:
        profile, created = GamificationProfile.objects.get_or_create(
            student=student,
            defaults={
                "current_xp": 0,
                "total_xp": 0,
                "current_level": 1,
                "current_streak": random.randint(0, 10),
                "longest_streak": random.randint(5, 30),
                "last_activity_date": timezone.now().date()
                - datetime.timedelta(days=random.randint(0, 5)),
                "tenant": tenant,
            },
        )
        if created:
            profiles_created += 1

        awarded = random.sample(badges, random.randint(1, 4))
        for badge in awarded:
            _, bc = StudentBadge.objects.get_or_create(
                student=student,
                badge=badge,
                defaults={
                    "earned_at": timezone.now()
                    - datetime.timedelta(days=random.randint(1, 60)),
                    "tenant": tenant,
                },
            )
            if bc:
                student_badges_created += 1

        total_xp = 0
        for _ in range(random.randint(5, 15)):
            pts = random.choice([10, 25, 50, 75, 100])
            desc = random.choice(
                [
                    "Completed lesson",
                    "Passed assessment",
                    "Perfect attendance",
                    "Early submission",
                    "Participated in discussion",
                    "Earned a badge",
                    "Finished homework",
                    "Quiz completed",
                ]
            )
            _, pc = PointTransaction.objects.get_or_create(
                student=student,
                points=pts,
                description=desc,
                defaults={
                    "activity_type": random.choice(activity_types),
                    "timestamp": timezone.now()
                    - datetime.timedelta(days=random.randint(0, 30)),
                    "tenant": tenant,
                },
            )
            if pc:
                total_xp += pts
                points_created += 1

        if total_xp > 0 and created:
            profile.current_xp = total_xp % 100
            profile.total_xp = total_xp
            profile.current_level = max(1, total_xp // 100)
            profile.save(update_fields=["current_xp", "total_xp", "current_level"])

    print(
        f"✓ Gamification: {badges_created} badges, {profiles_created} profiles, "
        f"{student_badges_created} student badges, {points_created} point txns created"
    )

    # ── 5. CONVERSATION MESSAGES ───────────────────────────────────────────────
    convs = list(Conversation.objects.all()[:10])
    msgs_created = 0
    sample_messages = [
        "Hello! I had a question about the homework assignment.",
        "Sure, what would you like to know?",
        "When is the deadline for the project submission?",
        "The deadline is next Friday at 5 PM.",
        "Thank you! Will there be a review session before the exam?",
        "Yes, I'm planning one on Wednesday at 3 PM.",
        "That's great! I'll be there.",
        "Please bring your notes and practice problems.",
        "I reviewed your last assignment — good work overall!",
        "Thank you! I'll work on the areas you highlighted.",
        "Don't hesitate to reach out if you need help.",
        "I appreciate your support, thank you!",
    ]
    for conv in convs:
        participants = list(
            ConversationParticipant.objects.filter(conversation=conv).select_related(
                "user"
            )
        )
        if len(participants) < 2:
            continue
        for i, msg_text in enumerate(
            random.sample(sample_messages, random.randint(3, 6))
        ):
            sender = participants[i % len(participants)].user
            _, created = Message.objects.get_or_create(
                conversation=conv,
                sender=sender,
                content=msg_text,
                defaults={"is_system_message": False},
            )
            if created:
                msgs_created += 1
    print(f"✓ Messages: {msgs_created} created")

    # ── 6. BILLING ─────────────────────────────────────────────────────────────
    fs_created = 0
    sf_created = 0
    pay_created = 0
    exp_created = 0

    current_year = datetime.date.today().year

    fee_defs = [
        ("Tuition Fee", 50000, "termly"),
        ("Lab Fee", 5000, "termly"),
        ("Library Fee", 2000, "annual"),
        ("Sports Fee", 3000, "annual"),
        ("Exam Fee", 4000, "termly"),
    ]

    fee_structures = []
    for cls in classes[:5]:
        for fname, amount, freq in fee_defs:
            fs, created = FeeStructure.objects.get_or_create(
                academic_class=cls,
                name=fname,
                defaults={
                    "amount": amount + random.randint(-500, 500),
                    "frequency": freq,
                    "tenant": tenant,
                },
            )
            fee_structures.append(fs)
            if created:
                fs_created += 1

    for student in students[:30]:
        student_class_fees = [
            fs for fs in fee_structures if fs.academic_class == student.academic_class
        ]
        if not student_class_fees:
            student_class_fees = random.sample(
                fee_structures, min(3, len(fee_structures))
            )

        for fs in student_class_fees[:3]:
            status = random.choice(["paid", "paid", "unpaid", "partial"])
            amount_paid = (
                fs.amount
                if status == "paid"
                else (fs.amount // 2 if status == "partial" else 0)
            )
            due_date = timezone.now().date() + datetime.timedelta(
                days=random.randint(-30, 60)
            )
            sf, created = StudentFee.objects.get_or_create(
                student=student,
                fee_structure=fs,
                defaults={
                    "amount_due": fs.amount,
                    "amount_paid": amount_paid,
                    "due_date": due_date,
                    "status": status,
                    "tenant": tenant,
                },
            )
            if created:
                sf_created += 1
                if status in ("paid", "partial"):
                    Payment.objects.get_or_create(
                        student=student,
                        student_fee=sf,
                        defaults={
                            "amount": amount_paid,
                            "method": random.choice(
                                ["cash", "bank_transfer", "online"]
                            ),
                            "payment_date": timezone.now().date()
                            - datetime.timedelta(days=random.randint(1, 60)),
                            "transaction_id": f"TXN{student.pk}{fs.pk}{random.randint(1000,9999)}",
                            "recorded_by": teacher_users[0] if teacher_users else None,
                            "remarks": "Payment received",
                            "tenant": tenant,
                        },
                    )
                    pay_created += 1

    expense_data = [
        (
            "Chalk and Stationery Purchase",
            1500,
            "supplies",
            "Procurement of chalk and stationery for classrooms",
        ),
        ("Printer Paper Stock", 3000, "supplies", "A4 paper restock for term"),
        ("Whiteboard Markers", 800, "supplies", "Markers for all classrooms"),
        (
            "Projector Maintenance",
            5000,
            "maintenance",
            "Annual projector servicing and bulb replacement",
        ),
        (
            "AC Repair — Science Lab",
            12000,
            "maintenance",
            "Air conditioning repair in science laboratory",
        ),
        (
            "Staff Training Workshop",
            8000,
            "training",
            "Professional development for teaching staff",
        ),
        ("Sports Equipment", 15000, "sports", "New cricket and football equipment"),
        (
            "Library Acquisitions",
            20000,
            "library",
            "New books for the library collection",
        ),
        ("Electricity Bill", 25000, "utilities", "Monthly electricity charges"),
        (
            "Internet Services",
            5000,
            "utilities",
            "Monthly internet and connectivity charges",
        ),
    ]
    for title, amount, category, description in expense_data:
        _, created = Expense.objects.get_or_create(
            title=title,
            defaults={
                "amount": amount,
                "category": category,
                "description": description,
                "date": timezone.now().date()
                - datetime.timedelta(days=random.randint(1, 90)),
                "recorded_by": teacher_users[0] if teacher_users else None,
                "tenant": tenant,
            },
        )
        if created:
            exp_created += 1

    print(
        f"✓ Billing: {fs_created} fee structures, {sf_created} student fees, "
        f"{pay_created} payments, {exp_created} expenses created"
    )

    # ── 7. AI ENGINE ───────────────────────────────────────────────────────────
    ai_logs_created = 0
    study_events_created = 0
    lp_created = 0
    artifact_created = 0

    features = [
        "AI Tutor",
        "Quiz Generator",
        "Study Planner",
        "Lesson Summary",
        "Exam Generator",
    ]
    for student in students[:25]:
        for _ in range(random.randint(3, 8)):
            pt = random.randint(50, 300)
            ct = random.randint(100, 600)
            _, created = AIInteractionLog.objects.get_or_create(
                user=student.user,
                feature_used=random.choice(features),
                prompt_tokens=pt,
                defaults={
                    "completion_tokens": ct,
                    "total_tokens": pt + ct,
                    "cost_estimated": round((pt + ct) * 0.000002, 6),
                    "tenant": tenant,
                },
            )
            if created:
                ai_logs_created += 1

    # Study Events (study planner events)
    event_types = ["study", "revision", "homework", "practice", "reading"]
    study_titles = [
        "Review Chapter Notes",
        "Practice Problems",
        "Flashcard Session",
        "Read Textbook Section",
        "Watch Lesson Video",
        "Complete Assignment",
        "Prepare for Quiz",
        "Group Study Session",
        "Lab Report Writing",
    ]
    for student in students[:30]:
        subj = random.choice(subjects) if subjects else None
        for _ in range(random.randint(3, 8)):
            start = timezone.now() + datetime.timedelta(
                days=random.randint(-7, 14), hours=random.randint(8, 20)
            )
            end = start + datetime.timedelta(minutes=random.randint(30, 90))
            _, created = StudyEvent.objects.get_or_create(
                student=student,
                title=random.choice(study_titles),
                start_time=start,
                defaults={
                    "description": "AI-scheduled study session",
                    "end_time": end,
                    "event_type": random.choice(event_types),
                    "estimated_minutes": random.randint(30, 90),
                    "subject": subj,
                    "is_completed": random.choice([True, False]),
                    "tenant": tenant,
                },
            )
            if created:
                study_events_created += 1

    # Learning Paths
    for student in students[:20]:
        subj = random.choice(subjects) if subjects else None
        lp, created = LearningPath.objects.get_or_create(
            student=student,
            defaults={
                "title": f'Personalized Path — {subj.name if subj else "General"}',
                "description": "AI-curated learning path based on your strengths and weak areas.",
                "subject": subj,
                "is_active": True,
                "generated_by_ai": True,
                "tenant": tenant,
            },
        )
        if created:
            lp_created += 1
            node_lessons = (
                random.sample(lessons, min(5, len(lessons))) if lessons else []
            )
            for i, lesson in enumerate(node_lessons):
                LearningNode.objects.get_or_create(
                    learning_path=lp,
                    lesson=lesson,
                    defaults={
                        "title": lesson.title,
                        "description": f"Complete this lesson to progress.",
                        "order": i + 1,
                        "resource_type": "lesson",
                        "estimated_minutes": random.randint(15, 45),
                        "status": random.choice(
                            ["completed", "in_progress", "pending"]
                        ),
                    },
                )

    # AI Artifacts
    for student in students[:15]:
        subject = random.choice(subjects) if subjects else None
        artifacts = [
            (
                "quiz",
                "lesson",
                {
                    "questions": [
                        {
                            "question": "What is Newton's First Law?",
                            "options": [
                                "Law of Inertia",
                                "Law of Action",
                                "Law of Motion",
                                "Law of Gravity",
                            ],
                            "correct_index": 0,
                            "explanation": "Objects remain at rest or in motion unless acted upon by a force.",
                        }
                    ]
                },
            ),
            (
                "summary",
                "lesson",
                {
                    "summary": "Forces cause changes in motion. Newton's three laws describe how forces "
                    "interact with objects and govern all physical motion."
                },
            ),
            (
                "exam_paper",
                "assessment",
                {
                    "title": "Mid-Term Examination",
                    "total_marks": 100,
                    "sections": [
                        {
                            "name": "Section A — Short Answer",
                            "marks": 40,
                            "questions": [],
                        },
                        {
                            "name": "Section B — Long Answer",
                            "marks": 60,
                            "questions": [],
                        },
                    ],
                },
            ),
        ]
        for art_type, source_type, content in random.sample(
            artifacts, random.randint(1, 2)
        ):
            _, created = AiGeneratedArtifact.objects.get_or_create(
                created_by=student.user,
                artifact_type=art_type,
                source_type=source_type,
                defaults={
                    "source_id": str(random.randint(1, 100)),
                    "content": content,
                    "lang": "en",
                    "tenant": tenant,
                },
            )
            if created:
                artifact_created += 1

    print(
        f"✓ AI Engine: {ai_logs_created} logs, {study_events_created} study events, "
        f"{lp_created} learning paths, {artifact_created} artifacts created"
    )

    # ── Final Summary ──────────────────────────────────────────────────────────
    print("\n=== PRODUCTION SEED COMPLETE ===")
    print(f"  Schema: {SCHEMA} ({tenant.name})")
    print("  All features populated with dummy data.")
    print("\n  Login credentials:")
    print("  - Admin: admin@demo.school.edu / admin123456")
    print("  - Students: <name>@demo.school.edu / student123")
    print("  - Teachers: <name>@demo.school.edu / teacher123")
    print("  - Parents: parent.*@demo.school.edu / parent123")
