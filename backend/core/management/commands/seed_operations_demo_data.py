# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Seeds non-destructive demo data into an existing school tenant for:
Timetable, Calendar (SchoolEvent), Transport, Hostel, Communication
(Notice/Notification/Conversation), and Inventory. Idempotent
(get_or_create throughout) and scoped to a single tenant schema.

Assumes `seed_school_demo_data` has already been run for the target schema
— this command reads its Students/Sections/Teachers/Subjects rather than
creating its own.

Usage:
  python manage.py seed_operations_demo_data --schema apividyaniketan
"""

import random
from datetime import date, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import schema_context

from academic.models import (
    Asset,
    AssetAssignment,
    ConsumableStock,
    MaintenanceRequest,
    Notice,
    SchoolEvent,
    Section,
    Student,
    Subject,
    Teacher,
    Timetable,
)
from academic.services.academic_year_service import ensure_current_academic_year
from conversations.models import Conversation, ConversationParticipant, Message
from core.models import Tenant
from hostel.models import HostelAllotment, HostelBlock, HostelRoom
from notifications.models import Notification, NotificationTemplate
from transport.models import Route, StudentTransportAssignment, Vehicle
from users.models import UserAccount

# Nepal school week: Sunday-Friday, Saturday off.
WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

# Government-rule school day: 10:00-16:00 (6 hours), 45-minute periods, one
# 30-minute lunch break, opening with the standard morning assembly. Each
# slot is (start, end, kind); "assembly"/"break" are fixed non-subject
# blocks, "period" is a real class. 1 assembly (15m) + 7 periods (45m each)
# + 1 break (30m) = 360 minutes exactly, 10:00 -> 16:00.
DAY_SCHEDULE = [
    (time(10, 0), time(10, 15), "assembly"),
    (time(10, 15), time(11, 0), "period"),
    (time(11, 0), time(11, 45), "period"),
    (time(11, 45), time(12, 30), "period"),
    (time(12, 30), time(13, 15), "period"),
    (time(13, 15), time(13, 45), "break"),
    (time(13, 45), time(14, 30), "period"),
    (time(14, 30), time(15, 15), "period"),
    (time(15, 15), time(16, 0), "period"),
]
FALLBACK_SUBJECTS = [
    "English", "Nepali", "Mathematics", "Science",
    "Social Studies", "Computer Science",
]

ROUTES_DATA = [
    {
        "name": "Lagankhel - Satdobato",
        "description": "Southbound route via Lagankhel, Satdobato, Nakhu.",
        "stops": [
            {"name": "Lagankhel", "order": 1, "pickup_time": "07:00"},
            {"name": "Satdobato", "order": 2, "pickup_time": "07:15"},
            {"name": "Nakhu", "order": 3, "pickup_time": "07:30"},
        ],
    },
    {
        "name": "Koteshwor - Tinkune",
        "description": "Eastbound route via Koteshwor, Tinkune, Airport Gate.",
        "stops": [
            {"name": "Koteshwor", "order": 1, "pickup_time": "07:05"},
            {"name": "Tinkune", "order": 2, "pickup_time": "07:20"},
            {"name": "Airport Gate", "order": 3, "pickup_time": "07:35"},
        ],
    },
    {
        "name": "Kalanki - Balkhu",
        "description": "Westbound route via Kalanki, Balkhu, Kuleshwor.",
        "stops": [
            {"name": "Kalanki", "order": 1, "pickup_time": "06:55"},
            {"name": "Balkhu", "order": 2, "pickup_time": "07:10"},
            {"name": "Kuleshwor", "order": 3, "pickup_time": "07:25"},
        ],
    },
]

VEHICLES_DATA = [
    {"plate_number": "BA 1 KHA 1234", "model": "Tata Starbus", "capacity": 32, "driver_name": "Hari Bahadur Tamang", "driver_phone": "9841020304"},
    {"plate_number": "BA 2 KHA 5678", "model": "Ashok Leyland", "capacity": 28, "driver_name": "Ram Kumar Shrestha", "driver_phone": "9851030405"},
    {"plate_number": "BA 3 KHA 9012", "model": "Mahindra Tourister", "capacity": 20, "driver_name": "Shyam Prasad Rai", "driver_phone": "9861040506"},
]

HOSTEL_BLOCKS_DATA = [
    {"name": "Sunrise Hostel", "gender": "male", "warden_name": "Krishna Bahadur Karki", "warden_phone": "9801122334"},
    {"name": "Moonlight Hostel", "gender": "female", "warden_name": "Radha Kumari Poudel", "warden_phone": "9801122335"},
]
ROOM_SPECS = [
    # (room_number, room_type, capacity, monthly_fee, floor)
    ("101", "single", 1, Decimal("5000"), 1),
    ("102", "double", 2, Decimal("3500"), 1),
    ("201", "double", 2, Decimal("3500"), 2),
    ("202", "dormitory", 6, Decimal("2000"), 2),
]

ASSETS_DATA = [
    {"name": "Dell OptiPlex Desktop", "category": "electronics", "brand": "Dell", "condition": "good", "status": "in_use", "location": "Computer Lab", "purchase_price": Decimal("55000")},
    {"name": "Epson Projector", "category": "electronics", "brand": "Epson", "condition": "good", "status": "in_use", "location": "Staff Room", "purchase_price": Decimal("42000")},
    {"name": "Student Desk-Bench Set", "category": "furniture", "brand": "Local", "condition": "good", "status": "in_use", "location": "Grade 5 Classroom", "purchase_price": Decimal("4500")},
    {"name": "Microscope", "category": "lab_equipment", "brand": "Labomed", "condition": "good", "status": "available", "location": "Science Lab", "purchase_price": Decimal("18000")},
    {"name": "Football Set", "category": "sports", "brand": "Nivia", "condition": "fair", "status": "in_use", "location": "Sports Store", "purchase_price": Decimal("3500")},
    {"name": "Photocopy Machine", "category": "electronics", "brand": "Canon", "condition": "good", "status": "maintenance", "location": "Admin Office", "purchase_price": Decimal("85000")},
]

CONSUMABLES_DATA = [
    {"name": "Whiteboard Markers", "category": "other", "unit": "box", "current_quantity": Decimal("12"), "minimum_quantity": Decimal("5"), "location": "Store Room"},
    {"name": "A4 Printing Paper", "category": "other", "unit": "ream", "current_quantity": Decimal("3"), "minimum_quantity": Decimal("10"), "location": "Admin Office"},
    {"name": "Chalk Sticks", "category": "other", "unit": "box", "current_quantity": Decimal("20"), "minimum_quantity": Decimal("8"), "location": "Store Room"},
    {"name": "Chemistry Lab Reagents", "category": "lab_equipment", "unit": "set", "current_quantity": Decimal("2"), "minimum_quantity": Decimal("4"), "location": "Science Lab"},
]

NOTIFICATION_TEMPLATES_DATA = [
    {"name": "Fee Due Reminder", "subject_template": "Fee payment due - {student_name}", "body_template": "Dear {parent_name}, the {fee_name} of Rs. {amount} for {student_name} is due on {due_date}.", "type": "sms"},
    {"name": "Attendance Alert", "subject_template": "Attendance alert - {student_name}", "body_template": "Dear {parent_name}, {student_name} was marked absent today ({date}).", "type": "app"},
    {"name": "Assignment Posted", "subject_template": "New assignment posted - {subject_name}", "body_template": "A new assignment for {subject_name} has been posted. Due date: {due_date}.", "type": "email"},
]


class Command(BaseCommand):
    help = (
        "Seed demo data for Timetable, Calendar, Transport, Hostel, "
        "Communication, and Inventory into an existing tenant. "
        "Run seed_school_demo_data first."
    )

    def add_arguments(self, parser):
        parser.add_argument("--schema", required=True, help="Tenant schema to seed into.")
        parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducible sampling.")

    def handle(self, *args, **options):
        schema = str(options["schema"]).strip().lower()
        rng = random.Random(int(options["seed"]))

        if not schema or schema == "public":
            raise CommandError("--schema must be a non-public tenant schema.")

        tenant = Tenant.objects.filter(schema_name=schema).first()
        if not tenant:
            raise CommandError(f"Tenant schema '{schema}' not found.")

        with schema_context(schema):
            sections = list(Section.objects.select_related("academic_class").order_by("academic_class__order", "name"))
            if not sections:
                raise CommandError(
                    f"No classes/sections found in schema '{schema}'. Run seed_school_demo_data first."
                )
            teachers = list(Teacher.objects.select_related("user").order_by("user__email"))
            students = list(
                Student.objects.select_related("user", "academic_class", "section")
                .filter(user__tenant=tenant, academic_class__isnull=False)
                .order_by("student_id")
            )
            admin_user = UserAccount.objects.filter(tenant=tenant, role="admin").order_by("email").first()
            year = ensure_current_academic_year()

            self._seed_timetable(sections, teachers, admin_user, year)
            self._seed_calendar(tenant, admin_user)
            self._seed_transport(tenant, students, rng)
            self._seed_hostel(tenant, students, rng)
            self._seed_communication(tenant, students, teachers, admin_user)
            self._seed_inventory(tenant, teachers, admin_user)

        self.stdout.write(self.style.SUCCESS(f"\nOperations demo data seeded into schema={schema}."))

    def _seed_timetable(self, sections, teachers, admin_user, year):
        created = 0
        for section in sections:
            cls = section.academic_class
            subjects = list(Subject.objects.filter(academic_class=cls).select_related("teacher__user"))
            room_number = f"Room {cls.order:02d}"
            cycle = 0
            for day in WEEKDAYS:
                for start_time, end_time, kind in DAY_SCHEDULE:
                    if kind == "assembly":
                        subject_name, teacher, room = "Morning Assembly", None, "School Ground"
                    elif kind == "break":
                        subject_name, teacher, room = "Lunch Break", None, "Dining Hall"
                    else:
                        if subjects:
                            subject = subjects[cycle % len(subjects)]
                            subject_name = subject.name
                            teacher = subject.teacher
                        else:
                            subject_name = FALLBACK_SUBJECTS[cycle % len(FALLBACK_SUBJECTS)]
                            teacher = teachers[cycle % len(teachers)] if teachers else None
                        room = room_number
                        cycle += 1

                    _, was_created = Timetable.objects.get_or_create(
                        academic_class=cls,
                        day_of_week=day,
                        start_time=start_time,
                        defaults={
                            "end_time": end_time,
                            "subject_name": subject_name,
                            "teacher": teacher,
                            "room_number": room,
                            "entry_type": "main",
                            "status": "approved",
                            "created_by": admin_user,
                            "academic_year": year,
                        },
                    )
                    if was_created:
                        created += 1
        self.stdout.write(self.style.SUCCESS(f"Timetable: {created} periods created across {len(sections)} sections."))

    def _seed_calendar(self, tenant, admin_user):
        year = ensure_current_academic_year()
        anchor = year.start_date if year else date.today()

        events = [
            ("Nepali New Year", "holiday", "all", 5, 1, True, ""),
            ("Staff Development Meeting", "meeting", "staff", 15, 1, False, "Staff Room"),
            ("Dashain Festival Holiday", "holiday", "all", 20, 15, True, ""),
            ("Parent-Teacher Meeting", "ptm", "parents", 60, 1, False, "Classrooms"),
            ("Tihar Festival Holiday", "holiday", "all", 45, 5, True, ""),
            ("First Terminal Examination", "exam", "students", 90, 7, False, "Examination Hall"),
            ("Annual Sports Day", "sports", "all", 110, 1, False, "School Ground"),
            ("Cultural Program - Founders Day", "cultural", "all", 130, 1, False, "School Auditorium"),
            ("Second Terminal Examination", "exam", "students", 200, 7, False, "Examination Hall"),
            ("Winter Break", "holiday", "all", 250, 10, True, ""),
        ]

        created = 0
        for title, event_type, audience, offset, duration, is_holiday, location in events:
            start_date = anchor + timedelta(days=offset)
            end_date = start_date + timedelta(days=duration - 1)
            _, was_created = SchoolEvent.objects.get_or_create(
                tenant=tenant,
                title=title,
                start_date=start_date,
                defaults={
                    "description": f"{title} ({event_type}).",
                    "event_type": event_type,
                    "audience": audience,
                    "end_date": end_date,
                    "is_all_day": True,
                    "is_holiday": is_holiday,
                    "created_by": admin_user,
                },
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Calendar: {created} school events created."))

    def _seed_transport(self, tenant, students, rng):
        routes = []
        for route_data in ROUTES_DATA:
            route, _ = Route.objects.get_or_create(
                tenant=tenant,
                name=route_data["name"],
                defaults={"description": route_data["description"], "stops": route_data["stops"]},
            )
            routes.append(route)

        vehicles = []
        for i, vehicle_data in enumerate(VEHICLES_DATA):
            vehicle, _ = Vehicle.objects.get_or_create(
                tenant=tenant,
                plate_number=vehicle_data["plate_number"],
                defaults={
                    "model": vehicle_data["model"],
                    "capacity": vehicle_data["capacity"],
                    "driver_name": vehicle_data["driver_name"],
                    "driver_phone": vehicle_data["driver_phone"],
                    "route": routes[i % len(routes)],
                },
            )
            vehicles.append(vehicle)

        assigned = 0
        eligible = [s for i, s in enumerate(students) if i % 4 == 0]
        for i, student in enumerate(eligible):
            route = routes[i % len(routes)]
            vehicle = vehicles[i % len(vehicles)]
            stop = route.stops[i % len(route.stops)]["name"] if route.stops else ""
            _, was_created = StudentTransportAssignment.objects.get_or_create(
                student=student,
                defaults={
                    "tenant": tenant,
                    "route": route,
                    "vehicle": vehicle,
                    "pickup_stop": stop,
                    "monthly_fee": Decimal("1500"),
                    "active_from": date.today() - timedelta(days=30),
                    "is_active": True,
                },
            )
            if was_created:
                assigned += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Transport: {len(routes)} routes, {len(vehicles)} vehicles, {assigned} student assignments created."
            )
        )

    def _seed_hostel(self, tenant, students, rng):
        blocks = []
        for block_data in HOSTEL_BLOCKS_DATA:
            block, _ = HostelBlock.objects.get_or_create(
                tenant=tenant,
                name=block_data["name"],
                defaults={
                    "gender": block_data["gender"],
                    "warden_name": block_data["warden_name"],
                    "warden_phone": block_data["warden_phone"],
                    "total_rooms": len(ROOM_SPECS),
                    "is_active": True,
                },
            )
            blocks.append(block)

        rooms_by_block = {}
        for block in blocks:
            rooms = []
            for room_number, room_type, capacity, monthly_fee, floor in ROOM_SPECS:
                room, _ = HostelRoom.objects.get_or_create(
                    tenant=tenant,
                    block=block,
                    room_number=room_number,
                    defaults={
                        "room_type": room_type,
                        "capacity": capacity,
                        "monthly_fee": monthly_fee,
                        "floor": floor,
                        "is_active": True,
                    },
                )
                rooms.append(room)
            rooms_by_block[block.pk] = rooms

        allotted = 0
        occupancy = {}  # room_id -> count assigned this run
        eligible = [s for i, s in enumerate(students) if i % 7 == 0]
        for i, student in enumerate(eligible):
            block = blocks[i % len(blocks)]
            rooms = rooms_by_block[block.pk]
            room = None
            for candidate in rooms:
                used = occupancy.get(candidate.pk, candidate.occupied_beds)
                if used < candidate.capacity:
                    room = candidate
                    occupancy[candidate.pk] = used + 1
                    break
            if room is None:
                continue
            _, was_created = HostelAllotment.objects.get_or_create(
                student=student,
                defaults={
                    "tenant": tenant,
                    "room": room,
                    "check_in_date": date.today() - timedelta(days=60),
                    "is_active": True,
                },
            )
            if was_created:
                allotted += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Hostel: {len(blocks)} blocks, {sum(len(r) for r in rooms_by_block.values())} rooms, "
                f"{allotted} student allotments created."
            )
        )

    def _seed_communication(self, tenant, students, teachers, admin_user):
        notices_created = 0
        first_section_students = [s for s in students if s.academic_class_id]
        sample_class = first_section_students[0].academic_class if first_section_students else None
        sample_student = students[0] if students else None

        notice_rows = [
            {
                "title": "Winter Vacation Notice",
                "content": "The school will remain closed for winter vacation. Classes resume as per the academic calendar.",
                "category": "Holiday",
                "priority": "high",
                "target_audience": "school",
            },
        ]
        if sample_class:
            notice_rows.append({
                "title": f"{sample_class.name} - Field Trip Permission Slip",
                "content": "Please submit the signed permission slip for the upcoming educational field trip.",
                "category": "Event",
                "priority": "normal",
                "target_audience": "class",
                "target_class": sample_class,
            })
        if sample_student:
            notice_rows.append({
                "title": "Fee Overdue Reminder",
                "content": "This is a reminder that your fee payment is overdue. Please clear dues at the earliest.",
                "category": "Finance",
                "priority": "high",
                "target_audience": "student",
                "target_student": sample_student,
            })
        for row in notice_rows:
            title = row.pop("title")
            _, was_created = Notice.objects.get_or_create(tenant=tenant, title=title, defaults=row)
            if was_created:
                notices_created += 1

        templates_created = 0
        for template_data in NOTIFICATION_TEMPLATES_DATA:
            _, was_created = NotificationTemplate.objects.get_or_create(
                tenant=tenant, name=template_data["name"], defaults=template_data
            )
            if was_created:
                templates_created += 1

        notifications_created = 0
        for student in students[:5]:
            _, was_created = Notification.objects.get_or_create(
                tenant=tenant,
                recipient=student.user,
                title="Fee Due Reminder",
                defaults={
                    "message": "Your tuition fee for this month is due soon. Please pay before the due date.",
                    "is_read": False,
                },
            )
            if was_created:
                notifications_created += 1
        for teacher in teachers[:2]:
            _, was_created = Notification.objects.get_or_create(
                tenant=tenant,
                recipient=teacher.user,
                title="Assignment Grading Pending",
                defaults={
                    "message": "You have pending assignments awaiting grading.",
                    "is_read": False,
                },
            )
            if was_created:
                notifications_created += 1

        conversations_created = 0
        messages_created = 0
        staff_participants = ([admin_user] if admin_user else []) + [t.user for t in teachers[:5]]
        if staff_participants:
            conv, was_created = Conversation.objects.get_or_create(
                tenant=tenant, type="group", title="Staff Room",
                defaults={"context_type": None, "metadata": {}},
            )
            if was_created:
                conversations_created += 1
            for user in staff_participants:
                ConversationParticipant.objects.get_or_create(conversation=conv, user=user)
            for sender, content in [
                (staff_participants[0], "Good morning everyone, quick reminder about the staff meeting today."),
                (staff_participants[-1], "Noted, thank you!"),
            ]:
                if not Message.objects.filter(conversation=conv, sender=sender, content=content).exists():
                    Message.objects.create(conversation=conv, sender=sender, content=content)
                    messages_created += 1

        if teachers and sample_student:
            teacher_user = teachers[0].user
            title = f"{teacher_user.get_full_name()} & {sample_student.user.get_full_name()}"
            conv, was_created = Conversation.objects.get_or_create(
                tenant=tenant, type="direct", title=title,
                defaults={"context_type": None, "metadata": {}},
            )
            if was_created:
                conversations_created += 1
            for user in (teacher_user, sample_student.user):
                ConversationParticipant.objects.get_or_create(conversation=conv, user=user)
            for sender, content in [
                (teacher_user, "Hi, just checking in on your homework progress."),
                (sample_student.user, "Hi sir, I'll submit it by tomorrow."),
            ]:
                if not Message.objects.filter(conversation=conv, sender=sender, content=content).exists():
                    Message.objects.create(conversation=conv, sender=sender, content=content)
                    messages_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Communication: {notices_created} notices, {templates_created} notification templates, "
                f"{notifications_created} notifications, {conversations_created} conversations, "
                f"{messages_created} messages created."
            )
        )

    def _seed_inventory(self, tenant, teachers, admin_user):
        assets = []
        assets_created = 0
        for i, asset_data in enumerate(ASSETS_DATA, start=1):
            asset, was_created = Asset.objects.get_or_create(
                tenant=tenant,
                name=asset_data["name"],
                defaults={
                    **asset_data,
                    "asset_tag": f"AST-{i:04d}",
                    "purchase_date": date.today() - timedelta(days=365),
                    "warranty_expiry": date.today() + timedelta(days=365),
                },
            )
            assets.append(asset)
            if was_created:
                assets_created += 1

        assignments_created = 0
        in_use_assets = [a for a in assets if a.status == "in_use"]
        for asset, teacher in zip(in_use_assets, teachers):
            _, was_created = AssetAssignment.objects.get_or_create(
                asset=asset,
                assigned_to_user=teacher.user,
                is_active=True,
                defaults={
                    "assigned_date": date.today() - timedelta(days=180),
                    "notes": "Assigned for classroom/office use.",
                },
            )
            if was_created:
                assignments_created += 1

        maintenance_created = 0
        maintenance_asset = next((a for a in assets if a.status == "maintenance"), None)
        if maintenance_asset:
            _, was_created = MaintenanceRequest.objects.get_or_create(
                tenant=tenant,
                asset=maintenance_asset,
                title=f"{maintenance_asset.name} not working",
                defaults={
                    "reported_by": admin_user,
                    "description": "Device is jamming frequently and needs servicing.",
                    "status": "open",
                    "priority": "medium",
                },
            )
            if was_created:
                maintenance_created += 1
        resolved_asset = next((a for a in assets if a.status == "available"), None)
        if resolved_asset:
            _, was_created = MaintenanceRequest.objects.get_or_create(
                tenant=tenant,
                asset=resolved_asset,
                title=f"{resolved_asset.name} annual servicing",
                defaults={
                    "reported_by": admin_user,
                    "description": "Routine annual servicing and calibration.",
                    "status": "resolved",
                    "priority": "low",
                    "resolution_notes": "Serviced and calibrated by vendor.",
                    "resolved_date": date.today() - timedelta(days=10),
                },
            )
            if was_created:
                maintenance_created += 1

        stock_created = 0
        for stock_data in CONSUMABLES_DATA:
            _, was_created = ConsumableStock.objects.get_or_create(
                tenant=tenant,
                name=stock_data["name"],
                defaults={**stock_data, "last_restocked": date.today() - timedelta(days=20)},
            )
            if was_created:
                stock_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Inventory: {assets_created} assets, {assignments_created} asset assignments, "
                f"{maintenance_created} maintenance requests, {stock_created} consumable stock items created."
            )
        )
