# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
import hashlib
import secrets
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from academic.models import Result
from academic.models.nepal_result import MarkEntry, NepalGradingProfile, StudentTermResult


NEPAL_2081_BANDS = [
    {"min": 90, "grade": "A+", "grade_point": 4.0, "description": "Outstanding"},
    {"min": 80, "grade": "A", "grade_point": 3.6, "description": "Excellent"},
    {"min": 70, "grade": "B+", "grade_point": 3.2, "description": "Very Good"},
    {"min": 60, "grade": "B", "grade_point": 2.8, "description": "Good"},
    {"min": 50, "grade": "C+", "grade_point": 2.4, "description": "Satisfactory"},
    {"min": 40, "grade": "C", "grade_point": 2.0, "description": "Acceptable"},
    {"min": 35, "grade": "D", "grade_point": 1.6, "description": "Basic"},
    {"min": 0, "grade": "NG", "grade_point": 0.0, "description": "Not Graded"},
]


def ensure_nepal_2081_profile(tenant=None):
    # `tenant` is unused now (single-tenant deployment); kept as an accepted
    # parameter because callers outside this sweep's file list still pass it
    # positionally (see academic/management/commands/seed_nepal_results_demo_data.py).
    profile, _ = NepalGradingProfile.objects.get_or_create(
        name="Nepal Letter Grading 2081",
        effective_from_bs="2081",
        defaults={
            "directive_name": "Letter Grading Directive 2078",
            "amendment": "Fourth Amendment 2081/03/16",
            "bands": NEPAL_2081_BANDS,
            "theory_pass_percent": Decimal("35"),
            "internal_pass_percent": Decimal("40"),
            "practical_pass_percent": Decimal("40"),
            "is_system_default": True,
        },
    )
    if not profile.bands:
        profile.bands = NEPAL_2081_BANDS
        profile.save(update_fields=["bands"])
    return profile


def paper_code_hash(raw_code):
    return hashlib.sha256(raw_code.strip().upper().encode("utf-8")).hexdigest()


def generate_paper_code(term, exam_subject):
    prefix = term.exam_type[:3].upper()
    class_part = str(exam_subject.section.academic_class.order or exam_subject.section.academic_class_id)
    subject_part = (exam_subject.subject.code or str(exam_subject.subject_id))[:5].upper()
    return f"{prefix}-{class_part}{exam_subject.section.name}-{subject_part}-{secrets.token_hex(4).upper()}"


def _percent(value, maximum):
    maximum = Decimal(str(maximum or 0))
    if maximum <= 0:
        return None
    return (Decimal(str(value or 0)) / maximum) * Decimal("100")


def calculate_subject_result(entry, profile):
    config = entry.paper.exam_subject
    if entry.attendance_status != "present":
        code = {"absent": "ABS", "withheld": "WH", "exempt": "EXM"}.get(entry.attendance_status, "NG")
        return {"status": code, "grade": code, "grade_point": 0.0, "percentage": 0.0}

    components = [
        ("theory", entry.theory_marks, config.theory_full_marks, profile.theory_pass_percent),
        ("internal", entry.internal_marks, config.internal_full_marks, profile.internal_pass_percent),
        ("practical", entry.practical_marks, config.practical_full_marks, profile.practical_pass_percent),
    ]
    component_rows = []
    component_failed = False
    for name, obtained, full, required in components:
        full = Decimal(str(full or 0))
        if full <= 0:
            continue
        pct = _percent(obtained, full)
        component_rows.append({
            "component": name,
            "obtained": float(obtained or 0),
            "full_marks": float(full),
            "percentage": round(float(pct or 0), 2),
        })
        if obtained is None or pct < Decimal(str(required)):
            component_failed = True

    total = Decimal(str(entry.total_obtained))
    full_total = Decimal(str(config.full_marks))
    overall_pct = _percent(total, full_total) or Decimal("0")
    band = next(
        (row for row in profile.bands if overall_pct >= Decimal(str(row["min"]))),
        {"grade": "NG", "grade_point": 0.0, "description": "Not Graded"},
    )
    if component_failed:
        band = {"grade": "NG", "grade_point": 0.0, "description": "Not Graded"}
    return {
        "status": "NG" if band["grade"] == "NG" else "GRD",
        "grade": band["grade"],
        "grade_point": float(band["grade_point"]),
        "description": band.get("description", ""),
        "percentage": round(float(overall_pct), profile.rounding_places),
        "obtained": float(total),
        "full_marks": float(full_total),
        "components": component_rows,
    }


def validate_mark_values(config, data):
    errors = {}
    for field, maximum in (
        ("theory_marks", config.theory_full_marks),
        ("internal_marks", config.internal_full_marks),
        ("practical_marks", config.practical_full_marks),
    ):
        value = data.get(field)
        if value in (None, ""):
            continue
        value = Decimal(str(value))
        if value < 0 or value > Decimal(str(maximum or 0)):
            errors[field] = f"Must be between 0 and {maximum}."
    if errors:
        raise ValidationError(errors)


@transaction.atomic
def publish_exam_term(term, user):
    from academic.models.nepal_result import ExamSubject

    term = type(term).objects.select_for_update().select_related("grading_profile").get(pk=term.pk)
    if term.status == "published":
        return list(term.student_results.all())
    configs = list(
        ExamSubject.objects.filter(term=term)
        .select_related("subject", "section", "assessment")
        .prefetch_related("papers__student__user", "papers__mark_entry")
    )
    if not configs:
        raise ValidationError({"detail": "No subjects are configured for this exam term."})
    unverified = [str(row.exam_subject_id) for row in configs if row.marking_status != "verified"]
    if unverified:
        raise ValidationError({"detail": "All subject mark batches must be verified before publication.", "unverified": unverified})

    by_student = {}
    for config in configs:
        for paper in config.papers.filter(is_void=False):
            try:
                entry = paper.mark_entry
            except MarkEntry.DoesNotExist:
                raise ValidationError({"detail": f"Missing marks for paper ending {paper.code_hint}."})
            calculated = calculate_subject_result(entry, term.grading_profile)
            row = {
                "subject_id": config.subject_id,
                "subject_code": config.subject.code or "",
                "subject_name": config.subject.name,
                "credit_hours": float(config.credit_hours),
                **calculated,
            }
            by_student.setdefault(paper.student_id, {"student": paper.student, "subjects": []})["subjects"].append(row)
            entry.status = "locked"
            entry.save(update_fields=["status"])
            if config.assessment_id:
                Result.objects.update_or_create(
                    assessment=config.assessment,
                    student=paper.student,
                    defaults={"score": int(round(float(entry.total_obtained))), "graded_by": user},
                )

    now = timezone.now()
    results = []
    for student_id, payload in by_student.items():
        rows = payload["subjects"]
        total_obtained = sum(Decimal(str(row.get("obtained", 0))) for row in rows)
        total_full = sum(Decimal(str(row.get("full_marks", 0))) for row in rows)
        graded = [row for row in rows if row["status"] == "GRD"]
        credits = sum(Decimal(str(row["credit_hours"])) for row in graded)
        weighted = sum(Decimal(str(row["grade_point"])) * Decimal(str(row["credit_hours"])) for row in graded)
        has_ng = any(row["status"] not in {"GRD", "EXM"} for row in rows)
        gpa = None if has_ng or credits == 0 else (weighted / credits).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        number = f"{term.academic_year.name.replace('/', '-')}-{str(term.term_id)[:6].upper()}-{str(student_id)[:8].upper()}"
        result, _ = StudentTermResult.objects.update_or_create(
            term=term,
            student=payload["student"],
            defaults={
                "marksheet_number": number,
                "total_obtained": total_obtained,
                "total_full_marks": total_full,
                "gpa": gpa,
                "result_status": "NG" if has_ng else "GRD",
                "snapshot": {
                    "regulation": {
                        "directive": term.grading_profile.directive_name,
                        "amendment": term.grading_profile.amendment,
                        "effective_from_bs": term.grading_profile.effective_from_bs,
                        "bands": term.grading_profile.bands,
                    },
                    "student": {
                        "student_id": str(payload["student"].student_id),
                        "name": payload["student"].user.get_full_name(),
                        "class": payload["student"].academic_class.name if payload["student"].academic_class else "",
                        "section": payload["student"].section.name if payload["student"].section else "",
                    },
                    "subjects": rows,
                },
                "published_at": now,
            },
        )
        results.append(result)
    term.status = "published"
    term.published_at = now
    term.published_by = user
    term.save(update_fields=["status", "published_at", "published_by", "updated_at"])
    if term.include_rank:
        ordered = sorted(
            (row for row in results if row.result_status == "GRD" and row.gpa is not None),
            key=lambda row: (row.gpa, row.total_obtained),
            reverse=True,
        )
        previous_score = None
        current_rank = 0
        for position, row in enumerate(ordered, start=1):
            score = (row.gpa, row.total_obtained)
            if score != previous_score:
                current_rank = position
                previous_score = score
            row.rank = current_rank
            row.save(update_fields=["rank"])
    return results
