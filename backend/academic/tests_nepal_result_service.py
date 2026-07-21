from decimal import Decimal
from types import SimpleNamespace

from django.test import SimpleTestCase

from academic.services.nepal_result_service import calculate_subject_result, validate_mark_values


def make_entry(theory, internal=Decimal("0"), practical=Decimal("0"), attendance="present"):
    config = SimpleNamespace(
        theory_full_marks=Decimal("75"), internal_full_marks=Decimal("25"),
        practical_full_marks=Decimal("0"), full_marks=Decimal("100"),
    )
    paper = SimpleNamespace(exam_subject=config)
    return SimpleNamespace(
        paper=paper, theory_marks=theory, internal_marks=internal,
        practical_marks=practical, attendance_status=attendance,
        total_obtained=(theory or 0) + (internal or 0) + (practical or 0),
    ), config


class NepalResultCalculationTests(SimpleTestCase):
    profile = SimpleNamespace(
        theory_pass_percent=Decimal("35"), internal_pass_percent=Decimal("40"),
        practical_pass_percent=Decimal("40"), rounding_places=2,
        bands=[
            {"min": 90, "grade": "A+", "grade_point": 4.0},
            {"min": 80, "grade": "A", "grade_point": 3.6},
            {"min": 35, "grade": "D", "grade_point": 1.6},
            {"min": 0, "grade": "NG", "grade_point": 0.0},
        ],
    )

    def test_grade_uses_nepal_letter_band(self):
        entry, _ = make_entry(Decimal("68"), Decimal("22"))
        result = calculate_subject_result(entry, self.profile)
        self.assertEqual(result["grade"], "A+")
        self.assertEqual(result["grade_point"], 4.0)

    def test_component_failure_results_in_ng_even_when_total_passes(self):
        entry, _ = make_entry(Decimal("25"), Decimal("25"))
        result = calculate_subject_result(entry, self.profile)
        self.assertEqual(result["status"], "NG")

    def test_absent_student_is_recorded_as_abs(self):
        entry, _ = make_entry(None, attendance="absent")
        self.assertEqual(calculate_subject_result(entry, self.profile)["status"], "ABS")

    def test_marks_above_full_marks_are_rejected(self):
        _, config = make_entry(Decimal("0"))
        with self.assertRaises(Exception):
            validate_mark_values(config, {"theory_marks": 76})
