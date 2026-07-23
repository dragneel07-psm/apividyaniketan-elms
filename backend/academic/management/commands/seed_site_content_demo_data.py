# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Seeds demo content — and a generated on-brand photo for each entry — for
every admin-managed marketing-site content type in models/site_content.py:
News, Gallery, Testimonials, Programs, Core Values, History, Student Life
Activities, Field Trips, Wellbeing Support, and Admission FAQs.

No real school photography exists yet, so each entry gets a generated
placeholder image (solid brand color + label, drawn with Pillow) rather
than a fabricated photo of real-looking people or places — same
"add a photo here" spirit as components/school/PlaceholderPhoto.tsx,
just persisted so the upload pipeline has real files to serve.

Idempotent (get_or_create on each model's natural key), safe to re-run.
Never touches entries this command didn't create.

Usage:
  python manage.py seed_site_content_demo_data
"""

from __future__ import annotations

import io
from datetime import date, timedelta

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from academic.models.site_content import (
    AdmissionFaq,
    CoreValue,
    FieldTrip,
    GalleryItem,
    HistoryMilestone,
    NewsArticle,
    Program,
    StudentLifeActivity,
    Testimonial,
    WellbeingSupport,
)

# Brand palette (frontend/app/globals.css) — rotated per generated image so
# the seeded set reads as one cohesive, on-brand collection.
BRAND_COLORS = [
    "#1f4b3f",  # school-forest
    "#16362d",  # school-forest-dark
    "#e8a33d",  # school-marigold
    "#c98424",  # school-marigold-dark
    "#b85c38",  # school-terracotta
]
TEXT_COLOR = "#fbf7ef"  # school-cream


def _make_image_file(label: str, color: str, size: tuple[int, int] = (800, 600)) -> ContentFile:
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", size, color)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("Arial.ttf", 42)
    except OSError:
        font = ImageFont.load_default()

    # Wrap label across lines that fit the canvas width.
    words = label.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] > size[0] - 80 and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)

    line_height = 52
    total_height = line_height * len(lines)
    y = (size[1] - total_height) // 2
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        x = (size[0] - (bbox[2] - bbox[0])) // 2
        draw.text((x, y), line, fill=TEXT_COLOR, font=font)
        y += line_height

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    return ContentFile(buffer.getvalue(), name=f"{slugify(label)}.jpg")


class Command(BaseCommand):
    help = "Seeds demo marketing-site content (with generated photos) for every school-site content type."

    def handle(self, *args, **options):
        counts: dict[str, int] = {}
        color_cycle = iter(BRAND_COLORS * 20)

        def next_color() -> str:
            return next(color_cycle)

        counts["news_articles"] = self._seed_news_articles(next_color)
        counts["gallery_items"] = self._seed_gallery_items(next_color)
        counts["testimonials"] = self._seed_testimonials(next_color)
        counts["programs"] = self._seed_programs(next_color)
        counts["core_values"] = self._seed_core_values(next_color)
        counts["history_milestones"] = self._seed_history_milestones(next_color)
        counts["student_life_activities"] = self._seed_student_life_activities(next_color)
        counts["field_trips"] = self._seed_field_trips(next_color)
        counts["wellbeing_support"] = self._seed_wellbeing_support(next_color)
        counts["admission_faqs"] = self._seed_admission_faqs(next_color)

        self.stdout.write(self.style.SUCCESS("\nSite content demo data seeded:"))
        for key, created in counts.items():
            self.stdout.write(f"  {key}: {created} created")

    def _create_with_image(self, model, lookup: dict, defaults: dict, image_label: str, color: str) -> bool:
        obj, created = model.objects.get_or_create(**lookup, defaults=defaults)
        if created and not obj.image:
            obj.image.save(f"{slugify(image_label)}.jpg", _make_image_file(image_label, color), save=True)
        return created

    def _seed_news_articles(self, next_color) -> int:
        rows = [
            {
                "title": "Annual Sports Week Concludes with Inter-House Championship",
                "excerpt": "Four houses competed across athletics, football, and volleyball over five days of school spirit.",
                "body": (
                    "Our Annual Sports Week brought the whole school together for five days of athletics, "
                    "football, volleyball, and relay races. Every grade took part, and the closing ceremony "
                    "saw the Falcon House lift the inter-house championship trophy after a closely fought "
                    "final. Thank you to every teacher, parent volunteer, and student who made the week "
                    "such a success."
                ),
                "category": "events",
                "published_date": date.today() - timedelta(days=10),
            },
            {
                "title": "Grade 8 Science Fair Winners Announced",
                "excerpt": "Twelve student projects were showcased, with a water-filtration model taking first place.",
                "body": (
                    "This year's Science Fair featured twelve student-led projects spanning biology, "
                    "chemistry, and environmental science. The winning project, a low-cost water-filtration "
                    "model built from locally available materials, will represent our school at the district "
                    "science exhibition next month."
                ),
                "category": "academics",
                "published_date": date.today() - timedelta(days=25),
            },
            {
                "title": "New Library Wing Now Open to Students",
                "excerpt": "The expanded library adds 40 new seats, a reading corner for early years, and 500 new titles.",
                "body": (
                    "We're excited to announce that our newly expanded library wing is now open. The space "
                    "adds 40 additional seats, a dedicated reading corner for Nursery through Grade 2, and "
                    "over 500 new titles across fiction, reference, and early-reader collections."
                ),
                "category": "community",
                "published_date": date.today() - timedelta(days=40),
            },
            {
                "title": "Grade 6 Student Wins District Math Olympiad",
                "excerpt": "Congratulations to our Grade 6 representative for placing first in the district-level Math Olympiad.",
                "body": (
                    "We are proud to share that one of our Grade 6 students placed first in this year's "
                    "district-level Math Olympiad, competing against students from over twenty schools. "
                    "The whole school congratulates this remarkable achievement."
                ),
                "category": "achievements",
                "published_date": date.today() - timedelta(days=55),
            },
        ]
        created_count = 0
        for i, row in enumerate(rows):
            defaults = {**row, "slug": slugify(row["title"]), "order": i}
            obj, created = NewsArticle.objects.get_or_create(title=row["title"], defaults=defaults)
            if created:
                if not obj.image:
                    obj.image.save(
                        f"{obj.slug}.jpg", _make_image_file(row["title"], next_color()), save=True
                    )
                created_count += 1
        return created_count

    def _seed_gallery_items(self, next_color) -> int:
        rows = [
            ("Morning assembly in the courtyard", "campus"),
            ("Grade 3 classroom during a mathematics lesson", "academics"),
            ("Annual inter-house sports day", "sports"),
            ("Dashain cultural program on stage", "culture"),
            ("Science fair project presentations", "academics"),
            ("Football team practice after school", "sports"),
            ("Library reading corner for early years", "campus"),
            ("Teachers' Day celebration", "events"),
        ]
        created_count = 0
        for i, (caption, category) in enumerate(rows):
            created = self._create_with_image(
                GalleryItem,
                {"caption": caption},
                {"category": category, "order": i},
                caption,
                next_color(),
            )
            created_count += int(created)
        return created_count

    def _seed_testimonials(self, next_color) -> int:
        rows = [
            (
                "My daughter has grown so much in confidence since joining. Her teachers know her by "
                "name and genuinely care about how she's doing, not just her grades.",
                "Sunita Chaudhary",
                "Parent, Grade 4",
            ),
            (
                "The small class sizes mean my son actually gets help when he's stuck, instead of "
                "getting lost in a crowd. It's made a real difference in his reading.",
                "Ramesh Bohara",
                "Parent, Grade 2",
            ),
            (
                "I loved being part of the debate club and student council here — it taught me how to "
                "speak up and organize things, skills I still use in college.",
                "Prakash Joshi",
                "Alumnus, Class of 2023",
            ),
            (
                "Coming from a small village school, I was nervous, but my teachers made sure I never "
                "felt behind. Now I help tutor younger students in maths.",
                "Anita Rawal",
                "Student, Grade 8",
            ),
        ]
        created_count = 0
        for i, (quote, name, role) in enumerate(rows):
            created = self._create_with_image(
                Testimonial,
                {"name": name, "role": role},
                {"quote": quote, "order": i},
                name,
                next_color(),
            )
            created_count += int(created)
        return created_count

    def _seed_programs(self, next_color) -> int:
        rows = [
            (
                "Academic Excellence",
                "A strong K-8 curriculum built around literacy, numeracy, and critical thinking, "
                "with small classes so every student gets individual attention.",
                "book",
            ),
            (
                "STEM & Science Lab",
                "Hands-on experiments and a dedicated science lab let students explore biology, "
                "chemistry, and physics well before secondary school.",
                "flask",
            ),
            (
                "Arts & Music",
                "Weekly sessions in music, dance, art, and craft give every student room to "
                "explore creative expression alongside academics.",
                "palette",
            ),
            (
                "Sports & Athletics",
                "Team practice, an annual inter-house sports week, and coaching in football, "
                "volleyball, and athletics build teamwork and fitness.",
                "trophy",
            ),
        ]
        created_count = 0
        for i, (title, description, icon) in enumerate(rows):
            created = self._create_with_image(
                Program, {"title": title}, {"description": description, "icon": icon, "order": i}, title, next_color()
            )
            created_count += int(created)
        return created_count

    def _seed_core_values(self, next_color) -> int:
        rows = [
            ("Integrity", "We do the right thing, even when no one is watching."),
            ("Respect", "We treat every student, family, and colleague with dignity and kindness."),
            ("Curiosity", "We encourage students to ask questions and explore ideas beyond the textbook."),
            ("Community", "We believe education is a partnership between school, family, and neighborhood."),
            ("Resilience", "We help students learn from setbacks and keep trying with confidence."),
        ]
        created_count = 0
        for i, (title, description) in enumerate(rows):
            created = self._create_with_image(
                CoreValue, {"title": title}, {"description": description, "order": i}, title, next_color()
            )
            created_count += int(created)
        return created_count

    def _seed_history_milestones(self, next_color) -> int:
        rows = [
            ("2058 B.S.", "School Founded", "Started as a small primary school serving a handful of local families in Dhangadhi."),
            ("2065 B.S.", "Expanded to Lower Secondary", "Grew to include Grades 6-8 as demand from families in the community increased."),
            ("2075 B.S.", "New Campus Building", "Moved into a larger, purpose-built campus with dedicated science and computer labs."),
            ("2078 B.S.", "Government Accreditation Renewed", "Received renewed registration under the Ministry of Education, Science and Technology."),
            ("Today", "A Full K-8 Institution", "Serving hundreds of students from Nursery through Grade 8 with a growing teaching staff."),
        ]
        created_count = 0
        for i, (year, title, description) in enumerate(rows):
            created = self._create_with_image(
                HistoryMilestone, {"title": title}, {"year": year, "description": description, "order": i}, title, next_color()
            )
            created_count += int(created)
        return created_count

    def _seed_student_life_activities(self, next_color) -> int:
        rows = [
            ("Science Club", "Weekly hands-on experiments and preparation for the annual science fair.", "clubs"),
            ("Debate Society", "Students practice public speaking and argue both sides of current topics.", "clubs"),
            ("Football Team", "After-school practice and friendly matches against nearby schools.", "sports"),
            ("Athletics Club", "Training for track and field events ahead of the annual sports week.", "sports"),
            ("Music Ensemble", "Weekly group practice on traditional and modern instruments.", "arts"),
            ("Art & Craft Circle", "Creative sessions in painting, drawing, and handicrafts.", "arts"),
            ("Student Council", "Elected student representatives who help organize school events.", "leadership"),
            ("Peer Mentors", "Older students supporting younger ones with study habits and settling in.", "leadership"),
        ]
        created_count = 0
        for i, (name, description, category) in enumerate(rows):
            created = self._create_with_image(
                StudentLifeActivity,
                {"name": name},
                {"description": description, "category": category, "order": i},
                name,
                next_color(),
            )
            created_count += int(created)
        return created_count

    def _seed_field_trips(self, next_color) -> int:
        rows = [
            ("Local Farm Visit", "Students learn where food comes from with a hands-on visit to a nearby farm.", "Nursery - Grade 2"),
            ("Science Museum Expo", "A day exploring interactive science exhibits at the district science expo.", "Grade 3 - Grade 5"),
            ("Historical Sites Tour", "Visiting nearby historical and cultural landmarks as part of the social studies unit.", "Grade 6 - Grade 8"),
        ]
        created_count = 0
        for i, (title, description, grade_band) in enumerate(rows):
            created = self._create_with_image(
                FieldTrip, {"title": title}, {"description": description, "grade_band": grade_band, "order": i}, title, next_color()
            )
            created_count += int(created)
        return created_count

    def _seed_wellbeing_support(self, next_color) -> int:
        rows = [
            ("School Counseling", "A trained counselor available for students who need someone to talk to."),
            ("Peer Support Program", "Older students trained to support classmates through difficult moments."),
            ("Health & Nutrition Checks", "Regular health screenings and nutrition guidance for all grades."),
        ]
        created_count = 0
        for i, (title, description) in enumerate(rows):
            created = self._create_with_image(
                WellbeingSupport, {"title": title}, {"description": description, "order": i}, title, next_color()
            )
            created_count += int(created)
        return created_count

    def _seed_admission_faqs(self, next_color) -> int:
        rows = [
            ("What documents do I need for admission?", "You'll need a birth certificate, the previous school's transcript (if applicable), and two passport-sized photos."),
            ("What is the minimum age for Nursery admission?", "Children must be at least 3 years old by the start of the academic year to be eligible for Nursery."),
            ("Is transport available for students?", "Yes — we operate several bus routes covering most areas of Dhangadhi. Contact the Finance Office for route details and fees."),
            ("When does the admission process open each year?", "Admissions typically open two months before the new academic year begins; exact dates are announced on the News & Events page."),
            ("Are scholarships available?", "Need-based and merit-based scholarships are available for a limited number of students each year — ask the admissions office for the application form."),
        ]
        created_count = 0
        for i, (question, answer) in enumerate(rows):
            created = self._create_with_image(
                AdmissionFaq, {"question": question}, {"answer": answer, "order": i}, question, next_color()
            )
            created_count += int(created)
        return created_count
