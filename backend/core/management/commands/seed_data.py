# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Django management command to seed the database with dummy data for testing.
This creates realistic sample data including tenants, users, courses, lessons, and assessments.
"""

import random

from django.core.management.base import BaseCommand
from django.db import transaction

from academic.models import (
    AcademicClass,
    Assessment,
    Course,
    Lesson,
    Parent,
    Result,
    Student,
    Teacher,
)
from ai_engine.models import AIInteractionLog
from billing.models import Subscription
from core.models import Tenant
from users.models import UserAccount


class Command(BaseCommand):
    help = "Seeds the database with dummy data for testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing data before seeding",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing existing data..."))
            self.clear_data()

        self.stdout.write(self.style.SUCCESS("Starting data seeding..."))

        # Create tenants
        tenants = self.create_tenants()
        self.stdout.write(self.style.SUCCESS(f"Created {len(tenants)} tenants"))

        # For each tenant, create full data
        for tenant in tenants:
            self.stdout.write(f"\nSeeding data for tenant: {tenant.name}")

            # Create subscriptions
            subscription = self.create_subscription(tenant)
            self.stdout.write(f"  ✓ Created subscription: {subscription.plan}")

            # Create users
            users = self.create_users(tenant)
            self.stdout.write(f'  ✓ Created {len(users["all"])} users')

            # Create academic classes
            classes = self.create_classes(tenant)
            self.stdout.write(f"  ✓ Created {len(classes)} classes")

            # Create teachers and students profiles
            teachers = self.create_teachers(users["teachers"])
            students = self.create_students(users["students"], classes)
            parents = self.create_parents(tenant, students)
            self.stdout.write(
                f"  ✓ Created {len(teachers)} teachers, {len(students)} students, {len(parents)} parents"
            )

            # Create courses
            courses = self.create_courses(classes, teachers)
            self.stdout.write(f"  ✓ Created {len(courses)} courses")

            # Create lessons
            lessons = self.create_lessons(courses)
            self.stdout.write(f"  ✓ Created {len(lessons)} lessons")

            # Create assessments
            assessments = self.create_assessments(courses)
            self.stdout.write(f"  ✓ Created {len(assessments)} assessments")

            # Create results
            results = self.create_results(assessments, students)
            self.stdout.write(f"  ✓ Created {len(results)} results")

            # Create AI logs
            ai_logs = self.create_ai_logs(tenant, users["all"])
            self.stdout.write(f"  ✓ Created {len(ai_logs)} AI interaction logs")

        self.stdout.write(
            self.style.SUCCESS("\n✓ Database seeding completed successfully!")
        )

    def clear_data(self):
        """Clear all existing data (except superusers)"""
        AIInteractionLog.objects.all().delete()
        Result.objects.all().delete()
        Assessment.objects.all().delete()
        Lesson.objects.all().delete()
        Course.objects.all().delete()
        Parent.objects.all().delete()
        Student.objects.all().delete()
        Teacher.objects.all().delete()
        AcademicClass.objects.all().delete()
        Subscription.objects.all().delete()
        UserAccount.objects.filter(is_superuser=False).delete()
        Tenant.objects.all().delete()

    def create_tenants(self):
        """Create sample tenants/schools"""
        tenants_data = [
            {
                "name": "Lincoln High School",
                "subdomain": "lincoln",
                "type": "School",
                "status": "active",
            },
            {
                "name": "Washington Academy",
                "subdomain": "washington",
                "type": "School",
                "status": "active",
            },
        ]

        tenants = []
        for data in tenants_data:
            tenant, created = Tenant.objects.get_or_create(
                subdomain=data["subdomain"], defaults=data
            )
            tenants.append(tenant)

        return tenants

    def create_subscription(self, tenant):
        """Create subscription for a tenant"""
        subscription, created = Subscription.objects.get_or_create(
            tenant=tenant,
            defaults={
                "plan": random.choice(["Basic", "Premium", "Enterprise"]),
                "student_limit": 500,
                "storage_limit_gb": 50,
                "ai_token_limit": 100000,
                "active": True,
            },
        )
        return subscription

    def create_users(self, tenant):
        """Create users for a tenant"""
        users = {"all": [], "teachers": [], "students": [], "parents": []}

        # Create admin user
        admin, created = UserAccount.objects.get_or_create(
            username=f"admin_{tenant.subdomain}",
            defaults={
                "email": f"admin@{tenant.subdomain}.edu",
                "role": "admin",
                "tenant": tenant,
                "is_staff": True,
            },
        )
        if created:
            admin.set_password("admin123456")
            admin.save()
        users["all"].append(admin)

        # Create teachers
        teacher_names = [
            "John Smith",
            "Emma Johnson",
            "Michael Brown",
            "Sarah Davis",
            "Robert Wilson",
        ]
        for i, name in enumerate(teacher_names, 1):
            first_name, last_name = name.split()
            username = f"{first_name.lower()}.{last_name.lower()}_{tenant.subdomain}"
            teacher, created = UserAccount.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@{tenant.subdomain}.edu",
                    "first_name": first_name,
                    "last_name": last_name,
                    "role": "teacher",
                    "tenant": tenant,
                },
            )
            if created:
                teacher.set_password("teacher123")
                teacher.save()
            users["teachers"].append(teacher)
            users["all"].append(teacher)

        # Create students
        student_names = [
            "James Anderson",
            "Olivia Martin",
            "Liam Garcia",
            "Sophia Martinez",
            "Noah Rodriguez",
            "Isabella Lopez",
            "William Hernandez",
            "Mia Gonzalez",
            "Benjamin Wilson",
            "Charlotte Moore",
            "Lucas Taylor",
            "Amelia Anderson",
            "Henry Thomas",
            "Harper Jackson",
            "Alexander White",
            "Evelyn Harris",
            "Daniel Martin",
            "Abigail Thompson",
            "Matthew Clark",
            "Emily Lewis",
        ]
        for name in student_names:
            first_name, last_name = name.split()
            username = f"{first_name.lower()}.{last_name.lower()}_{tenant.subdomain}"
            student, created = UserAccount.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@{tenant.subdomain}.edu",
                    "first_name": first_name,
                    "last_name": last_name,
                    "role": "student",
                    "tenant": tenant,
                },
            )
            if created:
                student.set_password("student123")
                student.save()
            users["students"].append(student)
            users["all"].append(student)

        return users

    def create_classes(self, tenant):
        """Create academic classes"""
        classes = []
        for grade in [9, 10, 11, 12]:
            for section in ["A", "B"]:
                academic_class, created = AcademicClass.objects.get_or_create(
                    tenant=tenant, grade=grade, section=section
                )
                classes.append(academic_class)
        return classes

    def create_teachers(self, teacher_users):
        """Create teacher profiles"""
        teachers = []

        for user in teacher_users:
            teacher, created = Teacher.objects.get_or_create(user=user)
            teachers.append(teacher)
        return teachers

    def create_students(self, student_users, classes):
        """Create student profiles"""
        students = []
        for user in student_users:
            academic_class = random.choice(classes)
            student, created = Student.objects.get_or_create(
                user=user, defaults={"academic_class": academic_class}
            )
            students.append(student)
        return students

    def create_parents(self, tenant, students):
        """Create parent profiles"""
        parents = []
        for i, student in enumerate(
            students[:15]
        ):  # Create parents for first 15 students
            parent, created = Parent.objects.get_or_create(
                tenant=tenant,
                full_name=f"Parent of {student.user.first_name}",
                defaults={"phone": f"+1234567{i:04d}"},
            )
            parent.students.add(student)
            parents.append(parent)
        return parents

    def create_courses(self, classes, teachers):
        """Create courses for each class"""
        courses = []
        subjects = [
            "Mathematics",
            "Science",
            "English Literature",
            "Social Studies",
            "Computer Science",
            "Physics",
            "Chemistry",
            "Biology",
            "History",
        ]

        for academic_class in classes:
            # 5-6 courses per class
            selected_subjects = random.sample(subjects, min(6, len(subjects)))
            for subject in selected_subjects:
                teacher = random.choice(teachers)
                course, created = Course.objects.get_or_create(
                    academic_class=academic_class, subject=subject
                )
                # No teachers field in Course model based on schema
                courses.append(course)
        return courses

    def create_lessons(self, courses):
        """Create lessons for each course"""
        lessons = []
        for course in courses:
            # 5-10 lessons per course
            num_lessons = random.randint(5, 10)
            for i in range(1, num_lessons + 1):
                lesson, created = Lesson.objects.get_or_create(
                    course=course,
                    title=f"{course.subject} - Lesson {i}",
                    defaults={
                        "content_type": random.choice(["Text", "Video", "Interactive"]),
                        "content": f"This is the content for lesson {i} of {course.subject}. "
                        f"Students will learn important concepts and skills.",
                    },
                )
                lessons.append(lesson)
        return lessons

    def create_assessments(self, courses):
        """Create assessments for each course"""
        assessments = []
        assessment_types = ["Quiz", "Test", "Assignment", "Project"]

        for course in courses:
            # 2-4 assessments per course
            num_assessments = random.randint(2, 4)
            for i in range(1, num_assessments + 1):
                assessment_type = random.choice(assessment_types)
                assessment, created = Assessment.objects.get_or_create(
                    course=course,
                    title=f"{course.subject} {assessment_type} {i}",
                    defaults={
                        "type": assessment_type,
                        "total_marks": random.choice([20, 50, 100]),
                    },
                )
                assessments.append(assessment)
        return assessments

    def create_results(self, assessments, students):
        """Create results for assessments"""
        results = []
        for assessment in assessments:
            # Get students from the same class as the course
            course_class = assessment.course.academic_class
            eligible_students = [
                s for s in students if s.academic_class == course_class
            ]

            # Create results for 70-100% of eligible students
            num_results = int(len(eligible_students) * random.uniform(0.7, 1.0))
            selected_students = random.sample(eligible_students, num_results)

            for student in selected_students:
                # Generate realistic scores (60-100% range mostly)
                percentage = random.triangular(60, 100, 85)
                score = int(assessment.total_marks * percentage / 100)

                result, created = Result.objects.get_or_create(
                    assessment=assessment, student=student, defaults={"score": score}
                )
                results.append(result)
        return results

    def create_ai_logs(self, tenant, users):
        """Create AI interaction logs"""
        logs = []
        features = ["Tutor", "Quiz Generator", "Study Plan", "Content Summary"]

        # Create 10-20 random AI interactions
        for _ in range(random.randint(10, 20)):
            user = random.choice([u for u in users if u.role in ["student", "teacher"]])
            log = AIInteractionLog.objects.create(
                tenant=tenant,
                user=user,
                feature_used=random.choice(features),
                prompt_tokens=random.randint(10, 100),
                completion_tokens=random.randint(20, 200),
                total_tokens=random.randint(30, 300),
            )
            logs.append(log)
        return logs
