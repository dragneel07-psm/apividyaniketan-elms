# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Posting rules for operational expenses.

    Expense payment   Dr Expense account (by category)   Cr Cash/Bank (by payment_method)
    Expense void       (reversal of the expense entry — see void_journal_entry)

This models a direct cash/bank expense payment (the school's current
"Log Expense" flow), not the full purchase-requisition -> PO -> goods-receipt
-> vendor-bill -> TDS -> payment vendor lifecycle described in the
nepal-school-accounting posting matrix. A full accounts-payable/vendor
subledger with its own TDS-on-bill posting is Phase 2 scope.
"""

from __future__ import annotations

from decimal import Decimal

from billing_school.models_nas import JournalEntry
from billing_school.services.posting import (
    PostingError,
    PostingLine,
    post_journal_entry,
    void_journal_entry,
)

CATEGORY_TO_ACCOUNT = {
    "salary": "5100",
    "maintenance": "5340",
    "utilities": "5320",
    "supplies": "5310",
    "events": "5230",
    "transport": "5350",
    "other": "5900",
}
METHOD_TO_ACCOUNT = {
    "cash": "1010",
    "bank_transfer": "1020",
    "cheque": "1020",
}


def post_expense_payment(expense, *, user=None, request=None) -> JournalEntry:
    """Post Dr Expense (by category) / Cr Cash/Bank (by payment_method)."""
    amount = Decimal(str(expense.amount))
    expense_account = CATEGORY_TO_ACCOUNT.get(expense.category, "5900")
    cash_account = METHOD_TO_ACCOUNT.get(expense.payment_method, "1010")
    return post_journal_entry(
        entry_type="expense",
        date_ad=expense.date,
        description=f"Expense: {expense.title}",
        lines=[
            PostingLine(
                account_code=expense_account, debit=amount, narration=expense.title
            ),
            PostingLine(
                account_code=cash_account, credit=amount, narration="Expense paid"
            ),
        ],
        created_by=user,
        source_type="billing.Expense",
        source_id=str(expense.expense_id),
        request=request,
        audit_action="billing.expense_posted",
    )


def void_expense_payment(expense, *, user, reason: str, request=None) -> JournalEntry:
    """Reverse the posted expense journal entry for a voided expense."""
    if not expense.journal_entry_id:
        raise PostingError(
            "This expense has no linked journal entry (pre-migration record). "
            "Run the reconcile_ledger backfill before voiding it."
        )
    return void_journal_entry(
        expense.journal_entry,
        user=user,
        reason=reason,
        request=request,
        audit_action="billing.expense_voided",
    )
