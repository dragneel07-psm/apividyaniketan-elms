# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Cross-tenant isolation across the high-value academic resources.

Academic models are schema-scoped (no tenant FK; one schema per school), so a
school-A credential querying its own schema must never surface school-B's
students, results, submissions, or attendance. This suite seeds a full
academic chain in school B and asserts a school-A admin can neither list nor
fetch/mutate any of it (S1 — exposes minors' records and grades).

Breadth companion to core/tests_tenant_isolation_writes.py (which proves the
write contract on a single resource).
"""

from __future__ import annotations

from django_tenants.utils import tenant_context

from core.tenant_isolation_base import TwoTenantAPITestCase


class AcademicBreadthIsolationTests(TwoTenantAPITestCase):
    STUDENTS_URL = "/api/academic/students/"
    RESULTS_URL = "/api/academic/results/"
    SUBMISSIONS_URL = "/api/academic/submissions/"
    ATTENDANCE_URL = "/api/academic/attendance/"

    def _seed_academics(self, tenant, owner_label):
        """Create class→subject→assessment→student→result/submission/attendance
        inside ``tenant``'s schema. Returns the created objects."""
        from academic.models import (
            AcademicClass,
            Assessment,
            Attendance,
            Result,
            Student,
            Subject,
            Submission,
        )

        student_user = self.create_user_in(tenant, "student", f"stud_{owner_label}")
        with tenant_context(tenant):
            klass = AcademicClass.objects.create(name=f"Grade {owner_label}", order=8)
            subject = Subject.objects.create(
                name="Mathematics",
                code=f"MATH-{owner_label}",
                academic_class=klass,
                is_active=True,
            )
            assessment = Assessment.objects.create(
                subject=subject, title=f"{owner_label} Exam", total_marks=100
            )
            student = Student.objects.create(
                user=student_user, academic_class=klass
            )
            result = Result.objects.create(
                assessment=assessment, student=student, score=88
            )
            submission = Submission.objects.create(
                assessment=assessment,
                student=student,
                content=f"{owner_label} answer",
                status="submitted",
            )
            attendance = Attendance.objects.create(
                student=student,
                subject=subject,
                date="2026-03-01",
                status="present",
            )
        return {
            "student": student,
            "result": result,
            "submission": submission,
            "attendance": attendance,
        }

    @staticmethod
    def _items(response):
        data = response.data
        return data.get("results", data) if isinstance(data, dict) else data

    # ── students ─────────────────────────────────────────────────────────

    def test_students_list_scoped(self):
        b = self._seed_academics(self.tenant_b, "B")

        client_a = self.authed(self.client_a, self.user_a)
        resp = client_a.get(self.STUDENTS_URL)
        self.assertEqual(resp.status_code, 200, getattr(resp, "data", None))
        ids = [
            str(item.get("student_id") or item.get("id"))
            for item in self._items(resp)
        ]
        self.assertNotIn(str(b["student"].pk), ids)

        client_b = self.authed(self.client_b, self.user_b)
        resp_b = client_b.get(self.STUDENTS_URL)
        ids_b = [
            str(item.get("student_id") or item.get("id"))
            for item in self._items(resp_b)
        ]
        self.assertIn(str(b["student"].pk), ids_b)

    # ── results ──────────────────────────────────────────────────────────

    def test_results_detail_cross_tenant_404(self):
        b = self._seed_academics(self.tenant_b, "B")
        client_a = self.authed(self.client_a, self.user_a)
        resp = client_a.get(f"{self.RESULTS_URL}{b['result'].pk}/")
        self.assertEqual(resp.status_code, 404)

    # ── submissions ──────────────────────────────────────────────────────

    def test_submission_detail_cross_tenant_404(self):
        b = self._seed_academics(self.tenant_b, "B")
        client_a = self.authed(self.client_a, self.user_a)
        resp = client_a.get(f"{self.SUBMISSIONS_URL}{b['submission'].pk}/")
        self.assertEqual(resp.status_code, 404)

    # ── attendance (write) ───────────────────────────────────────────────

    def test_attendance_write_cross_tenant_404(self):
        b = self._seed_academics(self.tenant_b, "B")
        client_a = self.authed(self.client_a, self.user_a)
        resp = client_a.patch(
            f"{self.ATTENDANCE_URL}{b['attendance'].pk}/", {"status": "absent"}
        )
        self.assertEqual(resp.status_code, 404)

        # B's attendance row is unchanged in its own schema.
        from academic.models import Attendance

        with tenant_context(self.tenant_b):
            self.assertEqual(
                Attendance.objects.get(pk=b["attendance"].pk).status, "present"
            )
