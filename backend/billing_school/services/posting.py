# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Canonical general-ledger posting service.

``billing_school.JournalEntry`` + ``JournalLine`` is the single source of
accounting truth for this school (see
``.agents/skills/nepal-school-accounting/SKILL.md``). Every completed
financial event — fee assessment, fee receipt, expense payment, payroll,
TDS deposit, gateway fee, depreciation — is posted through this module, in
the same DB transaction as its source-document write, with:

  * an immutable link back to the source document (``source_type`` /
    ``source_id``);
  * a retry-safe idempotency key, so a duplicate request/retry never posts
    twice;
  * enforced double-entry invariants (>=2 lines, debits == credits, each
    line exactly one side positive/nonzero);
  * immutability once posted — corrections go through :func:`void_journal_entry`
    (an equal-and-opposite reversal), never edits or deletes.

Callers build the domain-specific account mapping and pass plain
:class:`PostingLine` values; this module only knows about balanced, source-
linked, idempotent posting mechanics.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date as date_cls
from decimal import Decimal
from typing import Sequence

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from billing_school.models_nas import ChartOfAccount, JournalEntry, JournalLine
from billing_school.utils_bs_calendar import ad_to_bs
from core.utils.audit import record_audit_event


class PostingError(Exception):
    """Raised when a journal entry cannot be posted (validation / config)."""


@dataclass(frozen=True)
class PostingLine:
    account_code: str
    debit: Decimal = field(default=Decimal("0"))
    credit: Decimal = field(default=Decimal("0"))
    narration: str = ""


def get_account(account_code: str) -> ChartOfAccount:
    """Look up a chart-of-accounts row by code, failing closed.

    Account codes are an internal bookkeeping mapping (resolved from the
    ChartOfAccount table so they stay editable/configurable), not a Nepal
    statutory rate. A missing code is a hard stop: silently dropping a leg
    of a posting would unbalance the ledger, so we never fall back to a
    guessed account — *except* the one-time bootstrap below.

    Bootstrap: if the Chart of Accounts is completely empty (a school that
    has never seeded it, e.g. because deploying this posting phase predates
    them clicking "Seed Defaults"), seed the standard NAS chart once and
    retry. A COA that already has *some* rows but is missing this one code
    is a real configuration gap and still fails closed — we never touch an
    admin's already-customized chart of accounts.
    """
    try:
        return ChartOfAccount.objects.get(account_code=account_code)
    except ChartOfAccount.DoesNotExist as exc:
        if not ChartOfAccount.objects.exists():
            from billing_school.views_nas import (  # local: avoid import cycle
                _seed_default_coa,
            )

            _seed_default_coa()
            try:
                return ChartOfAccount.objects.get(account_code=account_code)
            except ChartOfAccount.DoesNotExist:
                pass
        raise PostingError(
            f"Chart of Accounts is missing required account '{account_code}'. "
            "Seed defaults (POST /nas/chart-of-accounts/seed-defaults/) or "
            "create the account before this event can be posted."
        ) from exc


def next_entry_number(date_ad) -> str:
    """Allocate the next sequential voucher number, e.g. JV-2081-00042.

    Locks the JournalEntry table (``select_for_update``) so concurrent
    posts cannot race on the same suffix — must be called inside the same
    atomic block that will insert the row. Continues the single, continuous
    per-BS-year sequence the pre-existing manual-journal endpoint used, so
    automated and manual postings share one numbering series.
    """
    max_num = JournalEntry.objects.select_for_update().aggregate(m=Max("entry_number"))[
        "m"
    ]
    seq = 1
    if max_num:
        match = re.search(r"-(\d+)$", max_num)
        if match:
            seq = int(match.group(1)) + 1
    if isinstance(date_ad, date_cls):
        as_date = date_ad
    else:
        as_date = date_cls.fromisoformat(str(date_ad))
    year, _, _ = ad_to_bs(as_date)
    return f"JV-{year}-{seq:05d}"


def default_idempotency_key(entry_type: str, source_type: str, source_id: str) -> str:
    if source_type and source_id:
        return f"{source_type}:{source_id}:{entry_type}"
    return ""


def post_journal_entry(
    *,
    entry_type: str,
    date_ad,
    description: str,
    lines: Sequence[PostingLine],
    created_by=None,
    source_type: str = "",
    source_id: str = "",
    idempotency_key: str = "",
    reference: str = "",
    narration: str = "",
    request=None,
    audit_action: str = "",
) -> JournalEntry:
    """Post a balanced journal entry atomically. Idempotent by key.

    If an entry already exists for ``idempotency_key`` (explicit, or the
    default derived from ``source_type``/``source_id``/``entry_type``), that
    existing entry is returned unchanged instead of posting a duplicate —
    the defining "retry a create call, get the same result" invariant.
    """
    key = idempotency_key or default_idempotency_key(entry_type, source_type, source_id)

    # Normalize to a real `date` up front: JournalEntry.save() unconditionally
    # derives date_bs/fiscal_year from date_ad, and breaks if it's still a
    # string (e.g. a raw JSON request body value) rather than a date object.
    if isinstance(date_ad, date_cls):
        date_ad = date_ad
    else:
        try:
            date_ad = date_cls.fromisoformat(str(date_ad))
        except ValueError as exc:
            raise PostingError(f"Invalid date_ad: {date_ad!r}") from exc

    if len(lines) < 2:
        raise PostingError("At least two journal lines are required.")

    total_debit = sum((ln.debit for ln in lines), Decimal("0"))
    total_credit = sum((ln.credit for ln in lines), Decimal("0"))
    if total_debit != total_credit:
        raise PostingError(
            f"Journal entry is not balanced: debits={total_debit} credits={total_credit}."
        )
    for ln in lines:
        if ln.debit < 0 or ln.credit < 0:
            raise PostingError("Journal line amounts must be non-negative.")
        if ln.debit > 0 and ln.credit > 0:
            raise PostingError("A journal line cannot have both a debit and a credit.")
        if ln.debit == 0 and ln.credit == 0:
            raise PostingError("A journal line must have a nonzero debit or credit.")

    with transaction.atomic():
        if key:
            existing = (
                JournalEntry.objects.select_for_update()
                .filter(idempotency_key=key)
                .first()
            )
            if existing is not None:
                return existing

        entry_number = next_entry_number(date_ad)
        entry = JournalEntry.objects.create(
            entry_number=entry_number,
            date_ad=date_ad,
            description=(description or "")[:300],
            entry_type=entry_type,
            reference=reference,
            narration=narration,
            source_type=source_type,
            source_id=str(source_id) if source_id else "",
            idempotency_key=key,
            created_by=created_by,
        )
        for ln in lines:
            account = get_account(ln.account_code)
            line = JournalLine(
                entry=entry,
                account=account,
                debit=ln.debit,
                credit=ln.credit,
                narration=ln.narration,
            )
            try:
                line.full_clean()
            except DjangoValidationError as exc:
                raise PostingError(str(exc)) from exc
            line.save()

        entry.post()

    record_audit_event(
        action=audit_action or f"billing.ledger_posted.{entry_type}",
        user=created_by,
        request=request,
        details={
            "entry_id": str(entry.entry_id),
            "entry_number": entry.entry_number,
            "entry_type": entry_type,
            "source_type": source_type,
            "source_id": str(source_id) if source_id else "",
            "debit_total": str(total_debit),
        },
    )
    return entry


def void_journal_entry(
    entry: JournalEntry,
    *,
    user,
    reason: str,
    date_ad=None,
    request=None,
    audit_action: str = "billing.ledger_voided",
) -> JournalEntry:
    """Reverse a posted entry with an equal-and-opposite entry.

    NAS-compliant correction path: the original stays posted and immutable
    forever; a new entry with swapped debit/credit lines is created and
    linked back via ``reverses``. Returns the new reversal entry.
    """
    if not entry.is_posted:
        raise PostingError("Only posted entries can be voided/reversed.")
    if not reason or not reason.strip():
        raise PostingError("A reason is required to void a journal entry.")

    reversal_date = date_ad or entry.date_ad
    if not isinstance(reversal_date, date_cls):
        try:
            reversal_date = date_cls.fromisoformat(str(reversal_date))
        except ValueError as exc:
            raise PostingError(f"Invalid date_ad: {reversal_date!r}") from exc

    with transaction.atomic():
        entry_locked = JournalEntry.objects.select_for_update().get(pk=entry.pk)
        if entry_locked.is_void or entry_locked.reversed_by_entries.exists():
            raise PostingError("This entry has already been reversed.")

        entry_number = next_entry_number(reversal_date)
        reversal = JournalEntry.objects.create(
            entry_number=entry_number,
            date_ad=reversal_date,
            description=f"Reversal of {entry_locked.entry_number}: {reason}"[:300],
            entry_type=entry_locked.entry_type,
            reference=entry_locked.entry_number,
            narration=f"Auto-reversal of {entry_locked.entry_number}. Reason: {reason}",
            reverses=entry_locked,
            created_by=user,
        )
        for orig_line in entry_locked.lines.all():
            line = JournalLine(
                entry=reversal,
                account=orig_line.account,
                debit=orig_line.credit,
                credit=orig_line.debit,
                narration=f"Reversal: {orig_line.narration}",
            )
            try:
                line.full_clean()
            except DjangoValidationError as exc:
                raise PostingError(str(exc)) from exc
            line.save()
        reversal.post()

        entry_locked.is_void = True
        entry_locked.voided_at = timezone.now()
        entry_locked.voided_by = user
        entry_locked.void_reason = reason
        entry_locked.save(
            update_fields=["is_void", "voided_at", "voided_by", "void_reason"]
        )

    record_audit_event(
        action=audit_action,
        user=user,
        request=request,
        details={
            "original_entry_id": str(entry_locked.entry_id),
            "reversal_entry_id": str(reversal.entry_id),
            "reason": reason,
        },
    )
    return reversal
