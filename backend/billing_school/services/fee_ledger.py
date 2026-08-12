# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Posting rules for the student-fee lifecycle: assessment, discount/scholarship
adjustments, receipts, and receipt void/refund.

Account mapping (see nepal-school-accounting SKILL posting matrix):

    Fee assessment   Dr Fees Receivable (1050)          Cr Fee Income (by head)
    Scholarship       Dr Scholarship Expense (5600)      Cr Fees Receivable (1050)
    Fee receipt      Dr Cash/Bank/Gateway clearing       Cr Fees Receivable (1050)
    Receipt void      (reversal of the receipt entry — see void_journal_entry)

These account CODES are an internal chart-of-accounts mapping, not a Nepal
statutory rate; they are resolved from ``ChartOfAccount`` by code (see
``posting.get_account``) so a school can repoint them without a code change.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from billing_school.models_nas import JournalEntry
from billing_school.services.posting import (
    PostingError,
    PostingLine,
    post_journal_entry,
    void_journal_entry,
)

RECEIVABLE_ACCOUNT = "1050"
DEFAULT_FEE_INCOME_ACCOUNT = "4100"
SCHOLARSHIP_EXPENSE_ACCOUNT = "5600"

# Payment.method -> ChartOfAccount code that receives the cash/bank leg of a
# fee receipt. Gateway-specific wallet accounts are used only for the two
# gateways the school already tracks a wallet balance for (eSewa/Khalti);
# everything else settles to the bank clearing account.
_GATEWAY_WALLET_ACCOUNT = {
    "esewa": "1030",
    "khalti": "1040",
    "connectips": "1020",
}
# NOTE: Payment.method's declared choices are cash/bank_transfer/cheque/
# online/card, but the payment-gateway callback flow (views_payment_gateway.
# _record_payment) actually stores the gateway slug ("esewa"/"khalti"/
# "connectips") in that same field — a pre-existing inconsistency, flagged
# separately rather than fixed here since it touches serializer/display
# contracts beyond this phase's scope. This mapping is written to be
# correct for either value.
METHOD_TO_ACCOUNT = {
    "cash": "1010",
    "bank_transfer": "1020",
    "cheque": "1020",
    "online": "1020",
    "card": "1020",
}


def receipt_cash_account(method: str, gateway: str = "") -> str:
    lookup_key = gateway or method
    if lookup_key in _GATEWAY_WALLET_ACCOUNT:
        return _GATEWAY_WALLET_ACCOUNT[lookup_key]
    # Unknown/unmapped methods default to the bank clearing account rather
    # than cash-in-hand — a digital/unrecognised method is far more likely
    # to be a bank/gateway receipt than physical cash.
    return METHOD_TO_ACCOUNT.get(method, "1020")


def _income_lines_for_fee(fee, gross_amount: Decimal) -> list[PostingLine]:
    """Split gross_amount across the fee structure's heads' income accounts,
    weighted by each head's listed amount. Falls back to one line on the
    default fee-income account when there are no usable heads.
    """
    heads = []
    if fee.fee_structure_id:
        heads = [h for h in fee.fee_structure.heads.all() if h.amount and h.amount > 0]
    total_weight = sum((Decimal(str(h.amount)) for h in heads), Decimal("0"))
    if not heads or total_weight <= 0:
        label = fee.fee_structure.name if fee.fee_structure_id else "Fee income"
        return [
            PostingLine(
                account_code=DEFAULT_FEE_INCOME_ACCOUNT,
                credit=gross_amount,
                narration=label,
            )
        ]

    lines: list[PostingLine] = []
    allocated = Decimal("0")
    for idx, head in enumerate(heads):
        code = (
            head.coa_account.account_code
            if head.coa_account_id
            else DEFAULT_FEE_INCOME_ACCOUNT
        )
        if idx == len(heads) - 1:
            amount = gross_amount - allocated  # last head absorbs rounding remainder
        else:
            weight = Decimal(str(head.amount))
            amount = (gross_amount * weight / total_weight).quantize(Decimal("0.01"))
            allocated += amount
        if amount != 0:
            lines.append(
                PostingLine(account_code=code, credit=amount, narration=head.name)
            )
    return lines or [
        PostingLine(account_code=DEFAULT_FEE_INCOME_ACCOUNT, credit=gross_amount)
    ]


def post_fee_assessment(fee, *, user=None, request=None) -> JournalEntry | None:
    """Post the assessment entry for a newly-created StudentFee.

    Dr Fees Receivable for the net amount owed, Dr Scholarship Expense for
    any discount already applied at creation time, Cr Fee Income (by head)
    for the gross fee. No-op for a zero/negative gross assessment.
    """
    amount_due = Decimal(str(fee.amount_due or 0))
    discount_amount = Decimal(str(fee.discount_amount or 0))
    gross = amount_due + discount_amount
    if gross <= 0:
        return None

    debit_lines = []
    if amount_due > 0:
        debit_lines.append(
            PostingLine(
                account_code=RECEIVABLE_ACCOUNT,
                debit=amount_due,
                narration="Fee assessed",
            )
        )
    if discount_amount > 0:
        debit_lines.append(
            PostingLine(
                account_code=SCHOLARSHIP_EXPENSE_ACCOUNT,
                debit=discount_amount,
                narration=(
                    fee.discount.name if fee.discount_id else "Scholarship/concession"
                ),
            )
        )
    credit_lines = _income_lines_for_fee(fee, gross)

    return post_journal_entry(
        entry_type="fee_assessment",
        date_ad=fee.due_date or fee.created_at.date(),
        description=f"Fee assessed: {fee.fee_structure.name if fee.fee_structure_id else 'Fee'}",
        lines=[*debit_lines, *credit_lines],
        created_by=user,
        source_type="billing.StudentFee",
        source_id=str(fee.student_fee_id),
        reference=str(fee.student_fee_id)[:8],
        request=request,
        audit_action="billing.fee_assessment_posted",
    )


def post_discount_adjustment(
    fee, *, delta_amount: Decimal, user=None, request=None
) -> JournalEntry | None:
    """Post an adjusting entry when a discount is applied/changed/removed on
    an already-assessed fee, for the *incremental* discount delta:

      delta > 0 (more discount applied)   Dr Scholarship Expense / Cr Receivable
      delta < 0 (discount reduced/removed) Dr Receivable / Cr Scholarship Expense

    No-op for a zero delta.
    """
    # Quantize here, at the ledger-posting boundary: FeeDiscount.compute_discount()
    # can return more than 2 decimal places (e.g. a percentage division), and
    # this is the single point where that raw value becomes a posted amount.
    delta = Decimal(str(delta_amount or 0)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    if delta == 0:
        return None

    label = fee.discount.name if fee.discount_id else "Discount adjustment"
    amount = abs(delta)
    if delta > 0:
        lines = [
            PostingLine(
                account_code=SCHOLARSHIP_EXPENSE_ACCOUNT, debit=amount, narration=label
            ),
            PostingLine(
                account_code=RECEIVABLE_ACCOUNT,
                credit=amount,
                narration="Discount applied",
            ),
        ]
    else:
        lines = [
            PostingLine(
                account_code=RECEIVABLE_ACCOUNT,
                debit=amount,
                narration="Discount reduced",
            ),
            PostingLine(
                account_code=SCHOLARSHIP_EXPENSE_ACCOUNT, credit=amount, narration=label
            ),
        ]

    return post_journal_entry(
        entry_type="scholarship_discount",
        date_ad=fee.updated_at.date() if fee.updated_at else fee.due_date,
        description=f"Scholarship/discount adjustment: {label}".strip(),
        lines=lines,
        created_by=user,
        # No source_id dedup key: each discount application is a distinct
        # user-initiated adjustment for the incremental delta computed at
        # request time, not a retryable idempotent event.
        request=request,
        audit_action="billing.fee_discount_adjustment_posted",
    )


def post_fee_receipt(
    payment, *, user=None, request=None, gateway: str = ""
) -> JournalEntry:
    """Post Dr Cash/Bank/Gateway clearing / Cr Fees Receivable for a Payment."""
    account_code = receipt_cash_account(payment.method, gateway)
    amount = Decimal(str(payment.amount))
    return post_journal_entry(
        entry_type="fee_receipt",
        date_ad=payment.payment_date.date(),
        description=f"Fee receipt {payment.bill_number or str(payment.payment_id)[:8]}",
        lines=[
            PostingLine(
                account_code=account_code, debit=amount, narration="Fee received"
            ),
            PostingLine(
                account_code=RECEIVABLE_ACCOUNT,
                credit=amount,
                narration="Fee receivable cleared",
            ),
        ],
        created_by=user,
        source_type="billing.Payment",
        source_id=str(payment.payment_id),
        reference=payment.bill_number,
        request=request,
        audit_action="billing.fee_receipt_posted",
    )


def void_fee_receipt(payment, *, user, reason: str, request=None) -> JournalEntry:
    """Reverse the posted receipt journal entry for a voided/refunded Payment."""
    if not payment.journal_entry_id:
        raise PostingError(
            "This payment has no linked journal entry (pre-migration record). "
            "Run the reconcile_ledger backfill before voiding it."
        )
    return void_journal_entry(
        payment.journal_entry,
        user=user,
        reason=reason,
        request=request,
        audit_action="billing.fee_receipt_voided",
    )
