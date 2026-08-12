# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Reconcile the operational finance tables (StudentFee, Payment, Expense)
against the canonical general ledger (JournalEntry/JournalLine), and
optionally backfill postings for records created before this ledger-posting
phase shipped.

Safe by default: with no flags this only PRINTS a discrepancy report and
touches nothing. Backfilling is opt-in and requires an explicit
confirmation flag — see nepal-school-accounting SKILL.md: "Do not backfill
or post production records without explicit authorization, an
accountant-approved mapping, a dry run, backups, and tenant-by-tenant
reconciliation."

Usage:
    python manage.py reconcile_ledger                      # dry-run report
    python manage.py reconcile_ledger --as-of 2082-01-01    # report as of a date
    python manage.py reconcile_ledger --apply --i-understand-this-affects-financial-records

Backfill approximations (documented, not hidden):
  * Fee assessments are backfilled using each StudentFee's CURRENT
    amount_due/discount_amount — the historical state immediately after
    creation (before any later discount changes) is not reconstructable
    from the data available, so the backfilled assessment reflects "what is
    true today," not "what was assessed on day one." Every subsequent void/
    discount-delta posting from this point forward is exact.
  * Voided (status=void) Payments/Expenses that have never been posted are
    skipped and reported separately — voiding something that was never on
    the ledger has no ledger effect to backfill.
"""

from __future__ import annotations

from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from billing.models_school import Expense, Payment, StudentFee
from billing_school.models_nas import ChartOfAccount, JournalEntry
from billing_school.services import expense_ledger, fee_ledger
from billing_school.services.posting import PostingError

RECEIVABLE_CODE = fee_ledger.RECEIVABLE_ACCOUNT
CASH_LIKE_CODES = ["1010", "1020", "1030", "1040"]


def _account_balance(code: str) -> Decimal:
    try:
        return ChartOfAccount.objects.get(account_code=code).balance
    except ChartOfAccount.DoesNotExist:
        return Decimal("0")


def _has_posted_assessment(fee: StudentFee) -> bool:
    return JournalEntry.objects.filter(
        source_type="billing.StudentFee",
        source_id=str(fee.student_fee_id),
        entry_type="fee_assessment",
    ).exists()


class Command(BaseCommand):
    help = (
        "Reconcile StudentFee/Payment/Expense against the canonical journal "
        "ledger; report discrepancies and (with --apply) backfill missing "
        "postings for pre-migration records."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually backfill missing postings (default: dry-run report only).",
        )
        parser.add_argument(
            "--i-understand-this-affects-financial-records",
            action="store_true",
            dest="confirmed",
            help=(
                "Required together with --apply. Explicit acknowledgement that "
                "this writes new, real journal entries against financial records."
            ),
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Backfill at most N records per source type (for staged rollout).",
        )

    def handle(self, *args, **options):
        apply_mode = options["apply"]
        if apply_mode and not options["confirmed"]:
            raise CommandError(
                "--apply requires --i-understand-this-affects-financial-records. "
                "Take a backup and run without --apply first to review the report."
            )
        limit = options["limit"]

        self.stdout.write(
            self.style.MIGRATE_HEADING("General-ledger reconciliation report")
        )
        self._report_control_accounts()
        unposted_fees = list(StudentFee.objects.all().order_by("created_at"))
        unposted_fees = [f for f in unposted_fees if not _has_posted_assessment(f)]
        unposted_payments = list(
            Payment.objects.filter(journal_entry__isnull=True).order_by("payment_date")
        )
        unposted_expenses = list(
            Expense.objects.filter(journal_entry__isnull=True).order_by("date")
        )

        self._report_unposted(
            "StudentFee assessments", unposted_fees, amount_attr="amount_due"
        )
        self._report_unposted(
            "Payments (fee receipts)",
            [p for p in unposted_payments if p.status == Payment.STATUS_COMPLETED],
            amount_attr="amount",
        )
        self._report_unposted(
            "Payments (VOID, never posted — no backfill needed)",
            [p for p in unposted_payments if p.status == Payment.STATUS_VOID],
            amount_attr="amount",
        )
        self._report_unposted(
            "Expenses",
            [e for e in unposted_expenses if e.status == Expense.STATUS_COMPLETED],
            amount_attr="amount",
        )
        self._report_unposted(
            "Expenses (VOID, never posted — no backfill needed)",
            [e for e in unposted_expenses if e.status == Expense.STATUS_VOID],
            amount_attr="amount",
        )

        if not apply_mode:
            self.stdout.write("")
            self.stdout.write(
                self.style.WARNING(
                    "Dry run only — nothing was written. Re-run with --apply "
                    "--i-understand-this-affects-financial-records to backfill."
                )
            )
            return

        def _capped(records):
            return records[:limit] if limit else records

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("Backfilling..."))
        self._backfill_fees(_capped(unposted_fees))
        self._backfill_payments(
            _capped(
                [p for p in unposted_payments if p.status == Payment.STATUS_COMPLETED]
            )
        )
        self._backfill_expenses(
            _capped(
                [e for e in unposted_expenses if e.status == Expense.STATUS_COMPLETED]
            )
        )
        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("Post-backfill control accounts"))
        self._report_control_accounts()

    # ── Reporting ────────────────────────────────────────────────────────

    def _report_control_accounts(self):
        receivable = _account_balance(RECEIVABLE_CODE)
        subledger_outstanding = sum(
            (
                (Decimal(str(f.amount_due or 0)) - Decimal(str(f.amount_paid or 0)))
                for f in StudentFee.objects.all()
            ),
            Decimal("0"),
        )
        self.stdout.write(
            f"  Fees Receivable ({RECEIVABLE_CODE}) ledger balance: {receivable}"
        )
        self.stdout.write(
            f"  StudentFee outstanding subledger total: {subledger_outstanding}"
        )
        diff = receivable - subledger_outstanding
        style = self.style.SUCCESS if diff == 0 else self.style.ERROR
        self.stdout.write(style(f"  Difference: {diff}"))

        for code in CASH_LIKE_CODES:
            bal = _account_balance(code)
            self.stdout.write(f"  Account {code} ledger balance: {bal}")

    def _report_unposted(self, label, records, *, amount_attr):
        total = sum(
            (Decimal(str(getattr(r, amount_attr) or 0)) for r in records), Decimal("0")
        )
        self.stdout.write("")
        self.stdout.write(f"  {label}: {len(records)} record(s), total {total}")
        for r in records[:10]:
            pk = getattr(r, "pk", None)
            self.stdout.write(f"    - {pk}: {getattr(r, amount_attr)}")
        if len(records) > 10:
            self.stdout.write(f"    ... and {len(records) - 10} more")

    # ── Backfill ─────────────────────────────────────────────────────────

    def _backfill_fees(self, fees):
        for fee in fees:
            try:
                with transaction.atomic():
                    entry = fee_ledger.post_fee_assessment(fee)
                if entry:
                    self.stdout.write(
                        f"    fee_assessment posted: {fee.pk} -> {entry.entry_number}"
                    )
                else:
                    self.stdout.write(
                        f"    fee_assessment skipped (zero amount): {fee.pk}"
                    )
            except PostingError as exc:
                self.stdout.write(self.style.ERROR(f"    FAILED {fee.pk}: {exc}"))

    def _backfill_payments(self, payments):
        for payment in payments:
            try:
                with transaction.atomic():
                    entry = fee_ledger.post_fee_receipt(payment)
                    payment.journal_entry = entry
                    payment.save(update_fields=["journal_entry"])
                self.stdout.write(
                    f"    fee_receipt posted: {payment.pk} -> {entry.entry_number}"
                )
            except PostingError as exc:
                self.stdout.write(self.style.ERROR(f"    FAILED {payment.pk}: {exc}"))

    def _backfill_expenses(self, expenses):
        for expense in expenses:
            try:
                with transaction.atomic():
                    entry = expense_ledger.post_expense_payment(expense)
                    expense.journal_entry = entry
                    expense.save(update_fields=["journal_entry"])
                self.stdout.write(
                    f"    expense posted: {expense.pk} -> {entry.entry_number}"
                )
            except PostingError as exc:
                self.stdout.write(self.style.ERROR(f"    FAILED {expense.pk}: {exc}"))
