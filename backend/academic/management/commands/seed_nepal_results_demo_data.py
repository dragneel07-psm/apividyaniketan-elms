# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Seeds a fully processed Nepal-standard exam term for the school: grading
profile, exam term, per-section/subject configuration, anonymized
answer-paper codes, mark entries, and a published StudentTermResult
(marksheet) for every student — exercising the whole secure
exam-processing pipeline (see academic/services/nepal_result_service.py)
end to end. Idempotent (get_or_create throughout, safe to re-run).

Assumes seed_school_demo_data has already been run — this reads its
Sections/Subjects/Students/Teachers rather than creating its own.

Usage:
  python manage.py seed_nepal_results_demo_data
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from academic.models import Section, Student, Subject
from academic.models.nepal_result import AnswerPaperCode, ExamSubject, ExamTerm, MarkEntry
from academic.services.academic_year_service import ensure_current_academic_year
from academic.services.nepal_result_service import (
    ensure_nepal_2081_profile,
    generate_paper_code,
    paper_code_hash,
    publish_exam_term,
)
from users.models import UserAccount

# Subjects that carry a practical component under the Nepal basic/secondary
# marking scheme (theory 50 + internal 25 + practical 25, vs. theory 75 +
# internal 25 for everything else).
PRACTICAL_SUBJECTS = {"Science", "Computer Science"}
TERM_NAME = "First Terminal Examination"
ABSENT_RATE = 0.03


class Command(BaseCommand):
    help = (
        "Seed a fully processed Nepal-standard exam term (grading profile, "
        "coded papers, marks, and published marksheets). Run "
        "seed_school_demo_data first."
    )

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducible marks.")

    def handle(self, *args, **options):
        rng = random.Random(int(options["seed"]))

        year = ensure_current_academic_year()
        if not year:
            raise CommandError("No academic year found. Run seed_school_demo_data first.")
        sections = list(
            Section.objects.select_related("academic_class")
            .order_by("academic_class__order", "name")
        )
        if not sections:
            raise CommandError("No classes/sections found. Run seed_school_demo_data first.")
        admin_user = UserAccount.objects.filter(role="admin").order_by("email").first()

        profile = ensure_nepal_2081_profile()
        term = self._seed_exam_term(year, profile, admin_user)
        configs_created, papers_created, marks_created = self._seed_exam_subjects_and_marks(
            term, sections, rng, admin_user
        )
        results = publish_exam_term(term, admin_user)

        self.stdout.write(
            self.style.SUCCESS(
                f"\nResult processing demo data seeded: "
                f"term={term.name!r}, {configs_created} exam-subject batches created, "
                f"{papers_created} answer papers created, {marks_created} mark entries created, "
                f"{len(results)} published student marksheets."
            )
        )

    def _seed_exam_term(self, year, profile, admin_user):
        term, created = ExamTerm.objects.get_or_create(
            academic_year=year,
            name=TERM_NAME,
            defaults={
                "grading_profile": profile,
                "exam_type": "first_terminal",
                "start_date": year.start_date + timedelta(days=90),
                "end_date": year.start_date + timedelta(days=97),
                "status": "draft",
                "include_rank": True,
                "created_by": admin_user,
            },
        )
        self.stdout.write(
            self.style.SUCCESS(f"Exam term: {'created' if created else 'reused'} {term.name!r} (status={term.status}).")
        )
        return term

    def _seed_exam_subjects_and_marks(self, term, sections, rng, admin_user):
        configs_created = 0
        papers_created = 0
        marks_created = 0

        for section in sections:
            cls = section.academic_class
            subjects = list(
                Subject.objects.filter(academic_class=cls, academic_year=term.academic_year)
                .select_related("teacher__user")
            )
            students = list(
                Student.objects.filter(academic_class=cls, section=section).select_related("user")
            )
            if not subjects or not students:
                continue

            for subject in subjects:
                has_practical = subject.name in PRACTICAL_SUBJECTS
                config, was_created = ExamSubject.objects.get_or_create(
                    term=term,
                    subject=subject,
                    section=section,
                    defaults={
                        "examiner": subject.teacher,
                        "theory_full_marks": Decimal("50") if has_practical else Decimal("75"),
                        "internal_full_marks": Decimal("25"),
                        "practical_full_marks": Decimal("25") if has_practical else Decimal("0"),
                        "credit_hours": subject.credits or Decimal("1"),
                    },
                )
                if was_created:
                    configs_created += 1

                examiner_user = subject.teacher.user if subject.teacher else admin_user
                config_papers, config_marks = self._seed_papers_and_marks(config, students, rng, examiner_user)
                papers_created += config_papers
                marks_created += config_marks

                if config.marking_status == "draft":
                    now = timezone.now()
                    MarkEntry.objects.filter(paper__exam_subject=config).update(status="submitted")
                    config.marking_status = "submitted"
                    config.submitted_at = now
                    config.save(update_fields=["marking_status", "submitted_at"])

                    MarkEntry.objects.filter(paper__exam_subject=config).update(status="verified")
                    config.marking_status = "verified"
                    config.verified_at = now
                    config.verified_by = admin_user
                    config.save(update_fields=["marking_status", "verified_at", "verified_by"])

        return configs_created, papers_created, marks_created

    def _seed_papers_and_marks(self, config, students, rng, examiner_user):
        papers_created = 0
        marks_created = 0
        for student in students:
            paper = AnswerPaperCode.objects.filter(exam_subject=config, student=student).first()
            if not paper:
                digest = None
                for _ in range(10):
                    raw = generate_paper_code(config.term, config)
                    digest = paper_code_hash(raw)
                    if not AnswerPaperCode.objects.filter(code_hash=digest).exists():
                        break
                paper = AnswerPaperCode.objects.create(
                    exam_subject=config, student=student, code_hash=digest, code_hint=raw[-8:]
                )
                papers_created += 1

            _, entry_created = MarkEntry.objects.get_or_create(
                paper=paper,
                defaults=self._generate_marks(config, rng, examiner_user),
            )
            if entry_created:
                marks_created += 1
        return papers_created, marks_created

    def _generate_marks(self, config, rng, examiner_user):
        if rng.random() < ABSENT_RATE:
            return {"attendance_status": "absent", "status": "draft", "entered_by": examiner_user}

        def obtained(full_marks):
            full_marks = Decimal(str(full_marks or 0))
            if full_marks <= 0:
                return None
            pct = Decimal(str(max(0.05, min(0.99, rng.gauss(0.72, 0.16)))))
            return (full_marks * pct).quantize(Decimal("0.01"))

        return {
            "theory_marks": obtained(config.theory_full_marks),
            "internal_marks": obtained(config.internal_full_marks),
            "practical_marks": obtained(config.practical_full_marks),
            "attendance_status": "present",
            "status": "draft",
            "entered_by": examiner_user,
        }
