# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Tests for the canonical-ledger posting service and its wiring into fee
assessment, fee receipts, expenses, and their void/reversal workflows.

Covers the invariants from
.agents/skills/nepal-school-accounting/references/test-matrix.md:
double entry, source linkage/idempotency, immutability, correction via
reversal, and reconciliation.
"""

from decimal import Decimal
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db.models import Sum
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Student
from billing.models_school import FeeStructure, Payment, StudentFee
from billing_school.models_nas import ChartOfAccount, JournalEntry
from billing_school.services import fee_ledger
from billing_school.services.posting import (
    PostingError,
    PostingLine,
    post_journal_entry,
    void_journal_entry,
)
from billing_school.views_nas import _seed_default_coa

User = get_user_model()


class PostingServiceTests(TestCase):
    """Unit tests for the generic post/void primitives."""

    def setUp(self):
        _seed_default_coa()

    def test_balanced_entry_posts(self):
        entry = post_journal_entry(
            entry_type="manual",
            date_ad="2026-08-01",
            description="Test balanced entry",
            lines=[
                PostingLine(account_code="1010", debit=Decimal("100")),
                PostingLine(account_code="4100", credit=Decimal("100")),
            ],
        )
        self.assertTrue(entry.is_posted)
        self.assertEqual(
            entry.lines.aggregate(d=Sum("debit"))["d"],
            entry.lines.aggregate(c=Sum("credit"))["c"],
        )

    def test_unbalanced_entry_rejected(self):
        with self.assertRaises(PostingError):
            post_journal_entry(
                entry_type="manual",
                date_ad="2026-08-01",
                description="Unbalanced",
                lines=[
                    PostingLine(account_code="1010", debit=Decimal("100")),
                    PostingLine(account_code="4100", credit=Decimal("50")),
                ],
            )

    def test_zero_zero_line_rejected(self):
        with self.assertRaises(PostingError):
            post_journal_entry(
                entry_type="manual",
                date_ad="2026-08-01",
                description="Zero line",
                lines=[
                    PostingLine(
                        account_code="1010", debit=Decimal("0"), credit=Decimal("0")
                    ),
                    PostingLine(account_code="4100", credit=Decimal("100")),
                ],
            )

    def test_dual_sided_line_rejected(self):
        with self.assertRaises(PostingError):
            post_journal_entry(
                entry_type="manual",
                date_ad="2026-08-01",
                description="Dual sided",
                lines=[
                    PostingLine(
                        account_code="1010", debit=Decimal("50"), credit=Decimal("50")
                    ),
                    PostingLine(account_code="4100", credit=Decimal("100")),
                ],
            )

    def test_single_line_rejected(self):
        with self.assertRaises(PostingError):
            post_journal_entry(
                entry_type="manual",
                date_ad="2026-08-01",
                description="One line",
                lines=[PostingLine(account_code="1010", debit=Decimal("100"))],
            )

    def test_missing_account_fails_closed(self):
        with self.assertRaises(PostingError):
            post_journal_entry(
                entry_type="manual",
                date_ad="2026-08-01",
                description="Bad account",
                lines=[
                    PostingLine(account_code="9999", debit=Decimal("100")),
                    PostingLine(account_code="4100", credit=Decimal("100")),
                ],
            )

    def test_idempotent_retry_returns_same_entry(self):
        kwargs = dict(
            entry_type="fee_receipt",
            date_ad="2026-08-01",
            description="Retry me",
            lines=[
                PostingLine(account_code="1010", debit=Decimal("500")),
                PostingLine(account_code="1050", credit=Decimal("500")),
            ],
            source_type="billing.Payment",
            source_id="abc-123",
        )
        first = post_journal_entry(**kwargs)
        second = post_journal_entry(**kwargs)
        self.assertEqual(first.entry_id, second.entry_id)
        self.assertEqual(JournalEntry.objects.filter(source_id="abc-123").count(), 1)

    def test_void_creates_linked_reversal_and_flags_original(self):
        entry = post_journal_entry(
            entry_type="manual",
            date_ad="2026-08-01",
            description="To be reversed",
            lines=[
                PostingLine(account_code="1010", debit=Decimal("100")),
                PostingLine(account_code="4100", credit=Decimal("100")),
            ],
        )
        user = User.objects.create_user(
            username="voider", email="v@example.com", password="x", role="admin"
        )
        reversal = void_journal_entry(entry, user=user, reason="Test correction")
        entry.refresh_from_db()
        self.assertTrue(entry.is_void)
        self.assertEqual(reversal.reverses_id, entry.entry_id)
        self.assertEqual(
            reversal.lines.get(account__account_code="1010").credit, Decimal("100")
        )
        self.assertEqual(
            reversal.lines.get(account__account_code="4100").debit, Decimal("100")
        )

    def test_void_twice_rejected(self):
        entry = post_journal_entry(
            entry_type="manual",
            date_ad="2026-08-01",
            description="Double void",
            lines=[
                PostingLine(account_code="1010", debit=Decimal("100")),
                PostingLine(account_code="4100", credit=Decimal("100")),
            ],
        )
        user = User.objects.create_user(
            username="voider2", email="v2@example.com", password="x", role="admin"
        )
        void_journal_entry(entry, user=user, reason="First")
        with self.assertRaises(PostingError):
            void_journal_entry(entry, user=user, reason="Second")

    def test_void_requires_reason(self):
        entry = post_journal_entry(
            entry_type="manual",
            date_ad="2026-08-01",
            description="No reason",
            lines=[
                PostingLine(account_code="1010", debit=Decimal("100")),
                PostingLine(account_code="4100", credit=Decimal("100")),
            ],
        )
        user = User.objects.create_user(
            username="voider3", email="v3@example.com", password="x", role="admin"
        )
        with self.assertRaises(PostingError):
            void_journal_entry(entry, user=user, reason="   ")


class FinancePostingAPITests(TestCase):
    """API-level tests: fee assessment, receipt, expense posting + void."""

    def setUp(self):
        _seed_default_coa()
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="finance_admin",
            email="finance_admin@example.com",
            password="Admin@1234",
            role="admin",
        )
        self.client.force_authenticate(user=self.admin)
        self.grade = AcademicClass.objects.create(name="Grade 5", order=5)
        self.student_user = User.objects.create_user(
            username="student_a",
            email="student_a@example.com",
            password="x",
            role="student",
        )
        self.student = Student.objects.create(
            user=self.student_user, academic_class=self.grade
        )
        self.fee_structure = FeeStructure.objects.create(
            name="Tuition Q1", amount=Decimal("5000")
        )

    def _receivable_balance(self):
        return ChartOfAccount.objects.get(account_code="1050").balance

    def test_student_fee_creation_posts_assessment(self):
        resp = self.client.post(
            "/api/billing/school/student-fees/",
            {
                "student": str(self.student.pk),
                "fee_structure": str(self.fee_structure.pk),
                "amount_due": "5000.00",
                "due_date": "2026-08-15",
            },
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        entry = JournalEntry.objects.get(
            source_type="billing.StudentFee", source_id=resp.data["student_fee_id"]
        )
        self.assertTrue(entry.is_posted)
        self.assertEqual(self._receivable_balance(), Decimal("5000.00"))

    def test_payment_posts_receipt_and_clears_receivable(self):
        fee = StudentFee.objects.create(
            student=self.student,
            fee_structure=self.fee_structure,
            amount_due=Decimal("5000"),
            due_date="2026-08-15",
        )
        fee_ledger.post_fee_assessment(fee)
        self.assertEqual(self._receivable_balance(), Decimal("5000"))

        resp = self.client.post(
            "/api/billing/school/payments/",
            {
                "student": str(self.student.pk),
                "student_fee": str(fee.pk),
                "amount": "2000.00",
                "method": "cash",
            },
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        self.assertIsNotNone(resp.data["journal_entry"])
        self.assertEqual(self._receivable_balance(), Decimal("3000"))
        self.assertEqual(
            ChartOfAccount.objects.get(account_code="1010").balance, Decimal("2000")
        )

        fee.refresh_from_db()
        self.assertEqual(fee.status, "partial")

    def test_completed_payment_cannot_be_edited_or_deleted(self):
        fee = StudentFee.objects.create(
            student=self.student,
            fee_structure=self.fee_structure,
            amount_due=Decimal("1000"),
            due_date="2026-08-15",
        )
        fee_ledger.post_fee_assessment(fee)
        payment = Payment.objects.create(
            student=self.student, student_fee=fee, amount=Decimal("500"), method="cash"
        )
        payment.journal_entry = fee_ledger.post_fee_receipt(payment)
        payment.save(update_fields=["journal_entry"])

        edit_resp = self.client.patch(
            f"/api/billing/school/payments/{payment.pk}/", {"amount": "999.00"}
        )
        self.assertEqual(edit_resp.status_code, status.HTTP_403_FORBIDDEN)

        delete_resp = self.client.delete(f"/api/billing/school/payments/{payment.pk}/")
        self.assertEqual(delete_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_void_payment_reverses_journal_and_restores_receivable(self):
        fee = StudentFee.objects.create(
            student=self.student,
            fee_structure=self.fee_structure,
            amount_due=Decimal("1000"),
            due_date="2026-08-15",
        )
        fee_ledger.post_fee_assessment(fee)
        payment = Payment.objects.create(
            student=self.student, student_fee=fee, amount=Decimal("1000"), method="cash"
        )
        payment.journal_entry = fee_ledger.post_fee_receipt(payment)
        payment.save(update_fields=["journal_entry"])
        fee.amount_paid = Decimal("1000")
        fee.status = "paid"
        fee.save()

        self.assertEqual(self._receivable_balance(), Decimal("0"))

        resp = self.client.post(
            f"/api/billing/school/payments/{payment.pk}/void/",
            {"reason": "Recorded in error"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)

        payment.refresh_from_db()
        fee.refresh_from_db()
        self.assertEqual(payment.status, Payment.STATUS_VOID)
        self.assertEqual(fee.amount_paid, Decimal("0"))
        self.assertEqual(fee.status, "pending")
        self.assertEqual(self._receivable_balance(), Decimal("1000"))

        # Voiding twice is rejected.
        resp2 = self.client.post(
            f"/api/billing/school/payments/{payment.pk}/void/", {"reason": "Again"}
        )
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expense_posts_and_voids(self):
        resp = self.client.post(
            "/api/billing/school/expenses/",
            {
                "title": "Electricity bill",
                "amount": "1500.00",
                "category": "utilities",
                "payment_method": "bank_transfer",
                "date": "2026-08-15",
            },
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        expense_id = resp.data["expense_id"]
        self.assertEqual(
            ChartOfAccount.objects.get(account_code="5320").balance, Decimal("1500")
        )
        self.assertEqual(
            ChartOfAccount.objects.get(account_code="1020").balance, Decimal("-1500")
        )

        edit_resp = self.client.patch(
            f"/api/billing/school/expenses/{expense_id}/", {"amount": "1.00"}
        )
        self.assertEqual(edit_resp.status_code, status.HTTP_403_FORBIDDEN)

        void_resp = self.client.post(
            f"/api/billing/school/expenses/{expense_id}/void/",
            {"reason": "Duplicate entry"},
        )
        self.assertEqual(void_resp.status_code, status.HTTP_200_OK, void_resp.content)
        self.assertEqual(
            ChartOfAccount.objects.get(account_code="5320").balance, Decimal("0")
        )
        self.assertEqual(
            ChartOfAccount.objects.get(account_code="1020").balance, Decimal("0")
        )

    def test_discount_apply_posts_adjustment_and_reduces_receivable(self):
        from billing.models_school import FeeDiscount

        fee = StudentFee.objects.create(
            student=self.student,
            fee_structure=self.fee_structure,
            amount_due=Decimal("5000"),
            due_date="2026-08-15",
        )
        fee_ledger.post_fee_assessment(fee)
        self.assertEqual(self._receivable_balance(), Decimal("5000"))

        discount = FeeDiscount.objects.create(
            name="Sibling Discount", discount_type="percentage", value=Decimal("10")
        )
        resp = self.client.post(
            f"/api/billing/school/discounts/{discount.pk}/apply/{fee.pk}/"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual(self._receivable_balance(), Decimal("4500"))
        self.assertEqual(
            ChartOfAccount.objects.get(account_code="5600").balance, Decimal("500")
        )

        # Re-applying the same discount is idempotent (net effect unchanged).
        resp2 = self.client.post(
            f"/api/billing/school/discounts/{discount.pk}/apply/{fee.pk}/"
        )
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(self._receivable_balance(), Decimal("4500"))


class ReconcileLedgerCommandTests(TestCase):
    def setUp(self):
        _seed_default_coa()
        self.grade = AcademicClass.objects.create(name="Grade 6", order=6)
        self.student_user = User.objects.create_user(
            username="legacy_student",
            email="legacy@example.com",
            password="x",
            role="student",
        )
        self.student = Student.objects.create(
            user=self.student_user, academic_class=self.grade
        )
        self.fee_structure = FeeStructure.objects.create(
            name="Legacy Fee", amount=Decimal("2000")
        )

    def test_dry_run_reports_discrepancy_without_writing(self):
        StudentFee.objects.create(
            student=self.student,
            fee_structure=self.fee_structure,
            amount_due=Decimal("2000"),
            due_date="2026-08-15",
        )
        out = StringIO()
        call_command("reconcile_ledger", stdout=out)
        output = out.getvalue()
        self.assertIn("StudentFee assessments: 1 record(s)", output)
        self.assertIn("Dry run only", output)
        self.assertEqual(JournalEntry.objects.count(), 0)

    def test_apply_backfills_and_reconciles(self):
        fee = StudentFee.objects.create(
            student=self.student,
            fee_structure=self.fee_structure,
            amount_due=Decimal("2000"),
            due_date="2026-08-15",
        )
        legacy_payment = Payment.objects.create(
            student=self.student, student_fee=fee, amount=Decimal("2000"), method="cash"
        )
        fee.amount_paid = Decimal("2000")
        fee.status = "paid"
        fee.save()

        out = StringIO()
        call_command(
            "reconcile_ledger",
            "--apply",
            "--i-understand-this-affects-financial-records",
            stdout=out,
        )
        legacy_payment.refresh_from_db()
        self.assertIsNotNone(legacy_payment.journal_entry_id)
        self.assertEqual(
            ChartOfAccount.objects.get(account_code="1050").balance, Decimal("0")
        )
        self.assertEqual(
            ChartOfAccount.objects.get(account_code="1010").balance, Decimal("2000")
        )

    def test_apply_without_confirmation_flag_errors(self):
        from django.core.management.base import CommandError

        with self.assertRaises(CommandError):
            call_command("reconcile_ledger", "--apply", stdout=StringIO())
