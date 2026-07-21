# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
NAS (Nepal Accounting Standards) for NPOs 2018 — API views.

Provides:
  - ChartOfAccount CRUD + seed defaults
  - JournalEntry CRUD + post action
  - FundAccount CRUD
  - TDSEntry CRUD + summary
  - InventoryItem CRUD + depreciation schedule
  - MerchantServiceFee list
  - Financial Statements (NAS-compliant Income & Expenditure, Balance Sheet,
    Cash Flow, Changes in Reserves)
  - ConnectIPS payment gateway initiation + callback
"""

import logging
import re as _re
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Max, Q, Sum
from django.db.models.deletion import ProtectedError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.models_school import Expense, Payment, StudentFee
from billing.permissions import IsSchoolFinanceManager
from billing_school.models_nas import (
    ChartOfAccount,
    FundAccount,
    InventoryItem,
    JournalEntry,
    JournalLine,
    MerchantServiceFee,
    TDSEntry,
)
from billing_school.payment_gateways import ConnectIPSGateway
from billing_school.utils_bs_calendar import (
    BS_MONTH_NAMES_EN,
    ad_to_bs,
    bs_date_display,
    bs_date_str,
    fiscal_year_bs,
    today_bs,
)
from billing_school.utils_tds import calculate_msf, calculate_tds
from core.utils.audit import record_audit_event

logger = logging.getLogger(__name__)


def _tenant(request):
    return getattr(request.user, "tenant", None)


# ─────────────────────────────────────────────────────────────────────────────
# Serialisation helpers (lightweight, no separate serializers file needed)
# ─────────────────────────────────────────────────────────────────────────────


def _coa_data(coa: ChartOfAccount) -> dict:
    return {
        "account_id": str(coa.account_id),
        "account_code": coa.account_code,
        "name": coa.name,
        "name_np": coa.name_np,
        "account_type": coa.account_type,
        "sub_type": coa.sub_type,
        "parent_id": str(coa.parent_id) if coa.parent_id else None,
        "is_system": coa.is_system,
        "is_active": coa.is_active,
        "balance": float(coa.balance),
    }


def _je_data(je: JournalEntry) -> dict:
    return {
        "entry_id": str(je.entry_id),
        "entry_number": je.entry_number,
        "date_ad": str(je.date_ad),
        "date_bs": je.date_bs,
        "fiscal_year": je.fiscal_year,
        "description": je.description,
        "entry_type": je.entry_type,
        "reference": je.reference,
        "is_posted": je.is_posted,
        "narration": je.narration,
        "created_by": je.created_by.get_full_name() if je.created_by else "",
        "lines": [
            {
                "line_id": str(ln.line_id),
                "account_id": str(ln.account_id),
                "account_code": ln.account.account_code,
                "account_name": ln.account.name,
                "debit": float(ln.debit),
                "credit": float(ln.credit),
                "narration": ln.narration,
            }
            for ln in je.lines.select_related("account").all()
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Chart of Accounts
# ─────────────────────────────────────────────────────────────────────────────


class ChartOfAccountViewSet(viewsets.ViewSet):
    permission_classes = [IsSchoolFinanceManager]

    def list(self, request):
        tenant = _tenant(request)
        qs = ChartOfAccount.objects.filter(
            tenant=tenant, is_active=True
        ).select_related("parent")
        account_type = request.query_params.get("account_type")
        if account_type:
            qs = qs.filter(account_type=account_type)
        return Response([_coa_data(a) for a in qs])

    def retrieve(self, request, pk=None):
        try:
            obj = ChartOfAccount.objects.get(pk=pk, tenant=_tenant(request))
        except ChartOfAccount.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        return Response(_coa_data(obj))

    def create(self, request):
        tenant = _tenant(request)
        data = request.data
        obj = ChartOfAccount.objects.create(
            tenant=tenant,
            account_code=data["account_code"],
            name=data["name"],
            name_np=data.get("name_np", ""),
            account_type=data["account_type"],
            sub_type=data.get("sub_type", ""),
            description=data.get("description", ""),
        )
        record_audit_event(
            "billing.coa_created",
            request.user,
            request,
            {"account_code": obj.account_code},
        )
        return Response(_coa_data(obj), status=201)

    def update(self, request, pk=None):
        try:
            obj = ChartOfAccount.objects.get(pk=pk, tenant=_tenant(request))
        except ChartOfAccount.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        if obj.is_system and request.data.get("account_code"):
            return Response(
                {"error": "System accounts cannot have their code changed."}, status=400
            )
        for field in ("name", "name_np", "sub_type", "description", "is_active"):
            if field in request.data:
                setattr(obj, field, request.data[field])
        obj.save()
        return Response(_coa_data(obj))

    def destroy(self, request, pk=None):
        try:
            obj = ChartOfAccount.objects.get(pk=pk, tenant=_tenant(request))
        except ChartOfAccount.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        if obj.is_system:
            return Response({"error": "System accounts cannot be deleted."}, status=400)
        try:
            obj.delete()
        except ProtectedError:
            return Response(
                {
                    "error": "Cannot delete: this account has journal entries. Deactivate it instead."
                },
                status=400,
            )
        return Response(status=204)

    @action(detail=False, methods=["post"], url_path="seed-defaults")
    def seed_defaults(self, request):
        """Seed NAS-compliant Chart of Accounts for a Nepali school."""
        tenant = _tenant(request)
        created = _seed_default_coa(tenant)
        return Response({"created": created, "message": f"{created} accounts seeded."})


def _seed_default_coa(tenant) -> int:
    """Create default NAS chart of accounts. Idempotent (skips existing codes)."""
    defaults = [
        # ASSETS
        ("1000", "Assets", "asset", "current_asset", True),
        ("1010", "Cash in Hand", "asset", "cash_equivalent", True),
        ("1020", "Bank Balance", "asset", "cash_equivalent", True),
        ("1030", "eSewa Wallet Balance", "asset", "cash_equivalent", True),
        ("1040", "Khalti Wallet Balance", "asset", "cash_equivalent", True),
        ("1050", "Fees Receivable", "asset", "receivable", True),
        ("1060", "TDS Receivable", "asset", "receivable", True),
        ("1070", "Prepaid Expenses", "asset", "current_asset", True),
        ("1500", "Fixed Assets", "asset", "fixed_asset", True),
        ("1510", "Land", "asset", "fixed_asset", True),
        ("1520", "Building", "asset", "fixed_asset", True),
        ("1530", "Furniture & Fixtures", "asset", "fixed_asset", True),
        ("1540", "Equipment & Computers", "asset", "fixed_asset", True),
        ("1550", "Vehicles", "asset", "fixed_asset", True),
        ("1590", "Less: Accumulated Depreciation", "asset", "fixed_asset", True),
        # LIABILITIES
        ("2000", "Liabilities", "liability", "current_liability", True),
        ("2010", "Sundry Creditors", "liability", "current_liability", True),
        ("2020", "TDS Payable to IRD", "liability", "tds_payable", True),
        ("2030", "VAT Payable", "liability", "current_liability", True),
        ("2040", "Salary Payable", "liability", "current_liability", True),
        ("2050", "Advance from Students", "liability", "current_liability", True),
        ("2060", "Loans & Borrowings", "liability", "long_term_liability", True),
        # ACCUMULATED FUND / EQUITY
        ("3000", "Accumulated Fund", "equity", "accumulated_fund", True),
        ("3100", "General / Unrestricted Fund", "equity", "unrestricted_fund", True),
        ("3200", "Scholarship Fund (Restricted)", "equity", "restricted_fund", True),
        ("3300", "Building Construction Fund", "equity", "restricted_fund", True),
        ("3400", "Capital Grant Fund", "equity", "restricted_fund", True),
        # INCOME
        ("4000", "Income", "income", "fee_income", True),
        ("4100", "Tuition Fee Income", "income", "fee_income", True),
        ("4110", "Admission Fee", "income", "fee_income", True),
        ("4120", "Examination Fee", "income", "fee_income", True),
        ("4130", "Transport Fee", "income", "fee_income", True),
        ("4140", "Hostel Fee", "income", "fee_income", True),
        ("4200", "Government Grant", "income", "grant_income", True),
        ("4300", "Donor Grants", "income", "grant_income", True),
        ("4400", "Donations Received", "income", "donation_income", True),
        ("4500", "Interest Income", "income", "other_income", True),
        ("4900", "Other Income", "income", "other_income", True),
        # EXPENDITURE
        ("5000", "Expenditure", "expenditure", "admin_expense", True),
        ("5100", "Teaching Staff Salary", "expenditure", "staff_expense", True),
        ("5110", "Non-Teaching Staff Salary", "expenditure", "staff_expense", True),
        ("5120", "Staff Provident Fund", "expenditure", "staff_expense", True),
        (
            "5200",
            "Academic / Programme Expense",
            "expenditure",
            "program_expense",
            True,
        ),
        ("5210", "Library & Books", "expenditure", "program_expense", True),
        ("5220", "Laboratory Supplies", "expenditure", "program_expense", True),
        ("5230", "Sports & Activities", "expenditure", "program_expense", True),
        ("5300", "Administrative Expense", "expenditure", "admin_expense", True),
        ("5310", "Office Supplies & Stationery", "expenditure", "admin_expense", True),
        ("5320", "Utilities (Electricity/Water)", "expenditure", "admin_expense", True),
        ("5330", "Telephone & Internet", "expenditure", "admin_expense", True),
        ("5340", "Repairs & Maintenance", "expenditure", "admin_expense", True),
        ("5350", "Transport / Vehicle Expense", "expenditure", "admin_expense", True),
        ("5360", "Rent", "expenditure", "admin_expense", True),
        ("5400", "Bank Charges & MSF", "expenditure", "bank_charge", True),
        ("5410", "eSewa MSF", "expenditure", "bank_charge", True),
        ("5420", "Khalti MSF", "expenditure", "bank_charge", True),
        ("5430", "ConnectIPS MSF", "expenditure", "bank_charge", True),
        ("5500", "Depreciation", "expenditure", "depreciation", True),
        ("5600", "Scholarship Expense", "expenditure", "program_expense", True),
        ("5700", "Audit & Legal Fee", "expenditure", "admin_expense", True),
        ("5900", "Other Expenditure", "expenditure", "other_expense", True),
    ]
    existing = set(
        ChartOfAccount.objects.filter(tenant=tenant).values_list(
            "account_code", flat=True
        )
    )
    created = 0
    for code, name, atype, stype, is_sys in defaults:
        if code not in existing:
            ChartOfAccount.objects.create(
                tenant=tenant,
                account_code=code,
                name=name,
                account_type=atype,
                sub_type=stype,
                is_system=is_sys,
            )
            created += 1
    return created


# ─────────────────────────────────────────────────────────────────────────────
# Journal Entry
# ─────────────────────────────────────────────────────────────────────────────


class JournalEntryViewSet(viewsets.ViewSet):
    permission_classes = [IsSchoolFinanceManager]

    def list(self, request):
        tenant = _tenant(request)
        qs = JournalEntry.objects.filter(tenant=tenant).select_related("created_by")
        entry_type = request.query_params.get("entry_type")
        fiscal_year = request.query_params.get("fiscal_year")
        from_date = request.query_params.get("from_date")
        to_date = request.query_params.get("to_date")
        if entry_type:
            qs = qs.filter(entry_type=entry_type)
        if fiscal_year:
            qs = qs.filter(fiscal_year=fiscal_year)
        if from_date:
            qs = qs.filter(date_ad__gte=from_date)
        if to_date:
            qs = qs.filter(date_ad__lte=to_date)

        # H4: proper pagination — default 50 entries per page
        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(200, max(1, int(request.query_params.get("page_size", 50))))
        except ValueError:
            page, page_size = 1, 50
        total = qs.count()
        offset = (page - 1) * page_size
        items = qs[offset : offset + page_size]
        return Response(
            {
                "count": total,
                "page": page,
                "page_size": page_size,
                "results": [_je_data(je) for je in items],
            }
        )

    def retrieve(self, request, pk=None):
        try:
            je = JournalEntry.objects.get(pk=pk, tenant=_tenant(request))
        except JournalEntry.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        return Response(_je_data(je))

    def create(self, request):
        tenant = _tenant(request)
        data = request.data
        lines_data = data.get("lines", [])
        if len(lines_data) < 2:
            return Response(
                {"error": "At least two journal lines required."}, status=400
            )

        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            with transaction.atomic():
                # C1: serialize voucher number generation — lock existing entries to get
                # the true maximum, then increment.  select_for_update() prevents any
                # concurrent transaction from inserting until this one commits.
                max_num = (
                    JournalEntry.objects.select_for_update()
                    .filter(tenant=tenant)
                    .aggregate(m=Max("entry_number"))["m"]
                )
                seq = 1
                if max_num:
                    m_obj = _re.search(r"-(\d+)$", max_num)
                    if m_obj:
                        seq = int(m_obj.group(1)) + 1

                y, _, _ = ad_to_bs(date.fromisoformat(data["date_ad"]))
                entry_number = f"JV-{y}-{seq:05d}"

                je = JournalEntry.objects.create(
                    tenant=tenant,
                    entry_number=entry_number,
                    date_ad=data["date_ad"],
                    description=data["description"],
                    entry_type=data.get("entry_type", "manual"),
                    reference=data.get("reference", ""),
                    narration=data.get("narration", ""),
                    created_by=request.user,
                )

                for ln in lines_data:
                    try:
                        account = ChartOfAccount.objects.get(
                            pk=ln["account_id"], tenant=tenant
                        )
                    except ChartOfAccount.DoesNotExist:
                        raise ValueError(f"Account {ln['account_id']} not found.")
                    # C2: call full_clean() so debit/credit validation in JournalLine.clean()
                    # is enforced before saving (Django does NOT call clean() automatically).
                    line = JournalLine(
                        entry=je,
                        account=account,
                        debit=Decimal(str(ln.get("debit", "0"))),
                        credit=Decimal(str(ln.get("credit", "0"))),
                        narration=ln.get("narration", ""),
                    )
                    line.full_clean()
                    line.save()
        except ValueError as exc:
            return Response({"error": str(exc)}, status=400)
        except DjangoValidationError as exc:
            msgs = (
                exc.message_dict
                if hasattr(exc, "message_dict")
                else {"__all__": exc.messages}
            )
            return Response({"error": msgs}, status=400)

        record_audit_event(
            "billing.journal_entry_created",
            request.user,
            request,
            {"entry_id": str(je.entry_id), "entry_number": je.entry_number},
        )
        return Response(_je_data(je), status=201)

    @action(detail=True, methods=["post"])
    def post_entry(self, request, pk=None):
        """Post a journal entry (locks it for editing)."""
        try:
            je = JournalEntry.objects.get(pk=pk, tenant=_tenant(request))
        except JournalEntry.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        if je.is_posted:
            return Response({"error": "Already posted."}, status=400)
        try:
            je.post()
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
        record_audit_event(
            "billing.journal_entry_posted",
            request.user,
            request,
            {"entry_id": str(je.entry_id)},
        )
        return Response({"status": "posted", "entry_id": str(je.entry_id)})

    @action(detail=True, methods=["post"])
    def reverse(self, request, pk=None):
        """H1: Create a reversal journal entry (equal-and-opposite lines).

        NAS compliance: corrections must be made via reversal, not deletion.
        The original entry stays posted and immutable; a new 'reversal' entry
        is created with all debit/credit amounts swapped.
        """
        from django.core.exceptions import ValidationError as DjangoValidationError

        tenant = _tenant(request)
        try:
            original = JournalEntry.objects.get(pk=pk, tenant=tenant)
        except JournalEntry.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        if not original.is_posted:
            return Response(
                {"error": "Only posted entries can be reversed."}, status=400
            )

        reversal_date = request.data.get("date_ad") or str(date.today())
        reversal_desc = (
            request.data.get("description") or f"Reversal of {original.entry_number}"
        )

        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            with transaction.atomic():
                max_num = (
                    JournalEntry.objects.select_for_update()
                    .filter(tenant=tenant)
                    .aggregate(m=Max("entry_number"))["m"]
                )
                seq = 1
                if max_num:
                    m_obj = _re.search(r"-(\d+)$", max_num)
                    if m_obj:
                        seq = int(m_obj.group(1)) + 1

                y, _, _ = ad_to_bs(date.fromisoformat(reversal_date))
                rev = JournalEntry.objects.create(
                    tenant=tenant,
                    entry_number=f"JV-{y}-{seq:05d}",
                    date_ad=reversal_date,
                    description=reversal_desc,
                    entry_type="manual",
                    reference=original.entry_number,
                    narration=f"Auto-reversal of {original.entry_number}",
                    created_by=request.user,
                )
                for orig_line in original.lines.all():
                    line = JournalLine(
                        entry=rev,
                        account=orig_line.account,
                        debit=orig_line.credit,  # swap
                        credit=orig_line.debit,  # swap
                        narration=f"Reversal: {orig_line.narration}",
                    )
                    line.full_clean()
                    line.save()
                rev.post()
        except DjangoValidationError as exc:
            msgs = (
                exc.message_dict
                if hasattr(exc, "message_dict")
                else {"__all__": exc.messages}
            )
            return Response({"error": msgs}, status=400)

        record_audit_event(
            "billing.journal_entry_reversed",
            request.user,
            request,
            {"original_id": str(original.entry_id), "reversal_id": str(rev.entry_id)},
        )
        return Response(_je_data(rev), status=201)


# ─────────────────────────────────────────────────────────────────────────────
# Fund Account
# ─────────────────────────────────────────────────────────────────────────────


class FundAccountViewSet(viewsets.ViewSet):
    # Custom list/create only (like the sibling NAS viewsets) — not a generic
    # ModelViewSet. As a ModelViewSet it had no serializer_class, which both
    # left phantom retrieve/update/destroy routes broken and crashed OpenAPI
    # schema generation (get_serializer_class assertion).
    permission_classes = [IsSchoolFinanceManager]

    def get_queryset(self):
        return FundAccount.objects.filter(tenant=_tenant(self.request))

    def list(self, request):
        qs = self.get_queryset()
        return Response(
            [
                {
                    "fund_id": str(f.fund_id),
                    "name": f.name,
                    "name_np": f.name_np,
                    "fund_type": f.fund_type,
                    "fund_type_display": f.get_fund_type_display(),
                    "purpose": f.purpose,
                    "donor": f.donor,
                    "opening_balance": float(f.opening_balance),
                    "current_balance": float(f.current_balance),
                    "is_active": f.is_active,
                }
                for f in qs
            ]
        )

    def create(self, request):
        tenant = _tenant(request)
        d = request.data
        obj = FundAccount.objects.create(
            tenant=tenant,
            name=d["name"],
            name_np=d.get("name_np", ""),
            fund_type=d.get("fund_type", "unrestricted"),
            purpose=d.get("purpose", ""),
            donor=d.get("donor", ""),
            opening_balance=Decimal(str(d.get("opening_balance", "0"))),
        )
        return Response({"fund_id": str(obj.fund_id), "name": obj.name}, status=201)


# ─────────────────────────────────────────────────────────────────────────────
# TDS Entry
# ─────────────────────────────────────────────────────────────────────────────


class TDSEntryViewSet(viewsets.ViewSet):
    permission_classes = [IsSchoolFinanceManager]

    def list(self, request):
        tenant = _tenant(request)
        qs = TDSEntry.objects.filter(tenant=tenant).select_related("recorded_by")
        fy = request.query_params.get("fiscal_year")
        deposited = request.query_params.get("is_deposited")
        if fy:
            qs = qs.filter(fiscal_year=fy)
        if deposited is not None:
            qs = qs.filter(is_deposited=deposited.lower() == "true")
        return Response(
            [
                {
                    "tds_id": str(t.tds_id),
                    "vendor_name": t.vendor_name,
                    "pan_number": t.pan_number,
                    "payment_type": t.payment_type,
                    "payment_date": str(t.payment_date),
                    "date_bs": t.date_bs,
                    "fiscal_year": t.fiscal_year,
                    "gross_amount": float(t.gross_amount),
                    "tds_rate": float(t.tds_rate),
                    "tds_amount": float(t.tds_amount),
                    "net_amount": float(t.net_amount),
                    "tds_section": t.tds_section,
                    "is_deposited": t.is_deposited,
                    "deposit_date": str(t.deposit_date) if t.deposit_date else None,
                    "deposit_ref": t.deposit_ref,
                }
                for t in qs
            ]
        )

    def create(self, request):
        tenant = _tenant(request)
        d = request.data
        gross = Decimal(str(d["gross_amount"]))
        ptype = d["payment_type"]
        # C4: look up prior payments to this vendor in the current fiscal year
        # so the cumulative threshold is applied correctly (not per-transaction).
        from billing_school.utils_bs_calendar import fiscal_year_bs

        fy_now = fiscal_year_bs(
            date.fromisoformat(d.get("payment_date", str(date.today())))
        )
        prior_fy = TDSEntry.objects.filter(
            tenant=tenant,
            vendor_name=d["vendor_name"],
            payment_type=ptype,
            fiscal_year=fy_now,
        ).aggregate(s=Sum("gross_amount"))["s"] or Decimal("0")
        calc = calculate_tds(gross, ptype, prior_payments_fy=prior_fy)
        obj = TDSEntry.objects.create(
            tenant=tenant,
            vendor_name=d["vendor_name"],
            pan_number=d.get("pan_number", ""),
            payment_type=ptype,
            payment_date=d["payment_date"],
            gross_amount=gross,
            tds_rate=calc["rate"] or Decimal("0"),
            tds_amount=calc["tds_amount"],
            net_amount=calc["net_amount"],
            tds_section=calc.get("section", ""),
            recorded_by=request.user,
        )
        record_audit_event(
            "billing.tds_entry_created",
            request.user,
            request,
            {"tds_id": str(obj.tds_id), "vendor": obj.vendor_name},
        )
        return Response(
            {
                "tds_id": str(obj.tds_id),
                "tds_amount": float(obj.tds_amount),
                "net_amount": float(obj.net_amount),
            },
            status=201,
        )

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """TDS register summary for a fiscal year."""
        tenant = _tenant(request)
        fy = request.query_params.get("fiscal_year", fiscal_year_bs())
        qs = TDSEntry.objects.filter(tenant=tenant, fiscal_year=fy)
        total_tds = qs.aggregate(s=Sum("tds_amount"))["s"] or Decimal("0")
        deposited_tds = qs.filter(is_deposited=True).aggregate(s=Sum("tds_amount"))[
            "s"
        ] or Decimal("0")
        pending_tds = total_tds - deposited_tds
        by_type = {}
        for row in qs.values("payment_type").annotate(
            total=Sum("tds_amount"), count=Count("tds_id")
        ):
            by_type[row["payment_type"]] = {
                "total": float(row["total"] or 0),
                "count": row["count"],
            }
        return Response(
            {
                "fiscal_year": fy,
                "total_tds": float(total_tds),
                "deposited_tds": float(deposited_tds),
                "pending_tds": float(pending_tds),
                "by_payment_type": by_type,
            }
        )

    @action(detail=False, methods=["post"], url_path="calculate")
    def calculate(self, request):
        """Calculate TDS for a given amount and payment type (no save)."""
        gross = Decimal(str(request.data.get("gross_amount", "0")))
        ptype = request.data.get("payment_type", "vendor_supply")
        result = calculate_tds(gross, ptype)
        return Response(
            {
                "gross_amount": float(gross),
                "applicable": result["applicable"],
                "rate": float(result["rate"]) if result["rate"] else None,
                "tds_amount": float(result["tds_amount"]),
                "net_amount": float(result["net_amount"]),
                "section": result["section"],
                "description": result["description"],
            }
        )

    @action(detail=True, methods=["post"], url_path="mark-deposited")
    def mark_deposited(self, request, pk=None):
        try:
            obj = TDSEntry.objects.get(pk=pk, tenant=_tenant(request))
        except TDSEntry.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        obj.is_deposited = True
        obj.deposit_date = request.data.get("deposit_date") or date.today()
        obj.deposit_ref = request.data.get("deposit_ref", "")
        obj.save()
        # L4: audit log — TDS deposit to IRD is a compliance-sensitive write
        record_audit_event(
            "billing.tds_marked_deposited",
            request.user,
            request,
            {
                "tds_id": str(obj.tds_id),
                "deposit_date": str(obj.deposit_date),
                "deposit_ref": obj.deposit_ref,
                "tds_amount": float(obj.tds_amount),
            },
        )
        return Response({"status": "deposited", "deposit_date": str(obj.deposit_date)})


# ─────────────────────────────────────────────────────────────────────────────
# Inventory / Jinshi
# ─────────────────────────────────────────────────────────────────────────────


class InventoryItemViewSet(viewsets.ViewSet):
    permission_classes = [IsSchoolFinanceManager]

    def _qs(self, request):
        return InventoryItem.objects.filter(tenant=_tenant(request))

    def list(self, request):
        qs = self._qs(request)
        form_type = request.query_params.get("form_type")
        category = request.query_params.get("category")
        condition = request.query_params.get("condition")
        if form_type:
            qs = qs.filter(form_type=form_type)
        if category:
            qs = qs.filter(category=category)
        if condition:
            qs = qs.filter(condition=condition)
        return Response([self._serialize(i) for i in qs])

    def create(self, request):
        tenant = _tenant(request)
        d = request.data
        obj = InventoryItem.objects.create(
            tenant=tenant,
            item_code=d.get("item_code", ""),
            name=d["name"],
            name_np=d.get("name_np", ""),
            category=d["category"],
            form_type=d.get("form_type", "401"),
            quantity=int(d.get("quantity", 1)),
            unit=d.get("unit", "pcs"),
            purchase_date=d["purchase_date"],
            purchase_price=Decimal(str(d["purchase_price"])),
            supplier=d.get("supplier", ""),
            depreciation_method=d.get("depreciation_method", "straight_line"),
            useful_life_years=int(d.get("useful_life_years", 5)),
            nepali_dep_rate=Decimal(str(d.get("nepali_dep_rate", "20.00"))),
            location=d.get("location", ""),
            custodian=d.get("custodian", ""),
            condition=d.get("condition", "good"),
        )
        record_audit_event(
            "billing.inventory_created",
            request.user,
            request,
            {"item_id": str(obj.item_id), "name": obj.name},
        )
        return Response(self._serialize(obj), status=201)

    def update(self, request, pk=None):
        try:
            obj = self._qs(request).get(pk=pk)
        except InventoryItem.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        for field in (
            "condition",
            "location",
            "custodian",
            "accumulated_depreciation",
            "disposal_date",
            "disposal_reason",
            "form_type",
        ):
            if field in request.data:
                setattr(obj, field, request.data[field])
        obj.save()
        return Response(self._serialize(obj))

    def destroy(self, request, pk=None):
        try:
            obj = self._qs(request).get(pk=pk)
        except InventoryItem.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        obj.delete()
        return Response(status=204)

    @action(detail=False, methods=["get"], url_path="depreciation-schedule")
    def depreciation_schedule(self, request):
        """Annual depreciation schedule for all active capital assets."""
        qs = self._qs(request).filter(
            form_type="401", condition__in=["good", "fair", "poor"]
        )
        schedule = []
        for item in qs:
            schedule.append(
                {
                    "item_id": str(item.item_id),
                    "name": item.name,
                    "category": item.category,
                    "purchase_price": float(item.purchase_price * item.quantity),
                    "accumulated_dep": float(item.accumulated_depreciation),
                    "book_value": float(item.current_book_value),
                    "dep_method": item.depreciation_method,
                    "dep_rate": float(item.nepali_dep_rate),
                    "annual_dep": float(item.annual_depreciation()),
                    "useful_life": item.useful_life_years,
                    "purchase_date_bs": item.purchase_date_bs,
                }
            )
        total_annual_dep = sum(s["annual_dep"] for s in schedule)
        return Response(
            {
                "items": schedule,
                "total_annual_dep": total_annual_dep,
            }
        )

    @staticmethod
    def _serialize(item: InventoryItem) -> dict:
        return {
            "item_id": str(item.item_id),
            "item_code": item.item_code,
            "name": item.name,
            "name_np": item.name_np,
            "category": item.category,
            "form_type": item.form_type,
            "form_type_display": item.get_form_type_display(),
            "quantity": item.quantity,
            "unit": item.unit,
            "purchase_date": str(item.purchase_date),
            "purchase_date_bs": item.purchase_date_bs,
            "purchase_price": float(item.purchase_price),
            "supplier": item.supplier,
            "depreciation_method": item.depreciation_method,
            "nepali_dep_rate": float(item.nepali_dep_rate),
            "useful_life_years": item.useful_life_years,
            "accumulated_dep": float(item.accumulated_depreciation),
            "book_value": float(item.current_book_value),
            "annual_dep": float(item.annual_depreciation()),
            "location": item.location,
            "custodian": item.custodian,
            "condition": item.condition,
            "disposal_date": str(item.disposal_date) if item.disposal_date else None,
        }


# ─────────────────────────────────────────────────────────────────────────────
# NAS Financial Statements
# ─────────────────────────────────────────────────────────────────────────────


class NASFinancialStatementsView(APIView):
    """
    GET /nas/financial-statements/
    Query params:
      - statement: income_expenditure | balance_sheet | cash_flow | changes_in_reserves
      - from_date / to_date (AD format YYYY-MM-DD)
      - fiscal_year (e.g. 2080/2081)
    Returns NAS-compliant structured data with BS dates.
    """

    permission_classes = [IsSchoolFinanceManager]

    def get(self, request):
        tenant = _tenant(request)
        stmt = request.query_params.get("statement", "income_expenditure")
        from_d = request.query_params.get("from_date")
        to_d = request.query_params.get("to_date") or str(date.today())
        fy = request.query_params.get("fiscal_year", fiscal_year_bs())

        if stmt == "income_expenditure":
            data = self._income_expenditure(tenant, from_d, to_d, fy)
        elif stmt == "balance_sheet":
            data = self._balance_sheet(tenant, to_d)
        elif stmt == "cash_flow":
            data = self._cash_flow(tenant, from_d, to_d, fy)
        elif stmt == "changes_in_reserves":
            data = self._changes_in_reserves(tenant, fy)
        else:
            return Response({"error": f"Unknown statement: {stmt}"}, status=400)

        return Response(
            {
                "statement": stmt,
                "fiscal_year": fy,
                "from_date": from_d,
                "to_date": to_d,
                "to_date_bs": bs_date_display(date.fromisoformat(to_d)) if to_d else "",
                "data": data,
            }
        )

    # ── Income & Expenditure ───────────────────────────────────────────────

    def _income_expenditure(self, tenant, from_d, to_d, fy):
        """Statement of Income & Expenditure (NAS NPO 2018 Section 5).

        C3 / M4 fix: now sourced from posted JournalLine records so that
        grant income, donations, and all manually-journalized entries are
        captured — not just the raw Payment/Expense tables.
        """
        je_qs = JournalEntry.objects.filter(tenant=tenant, is_posted=True)
        if from_d:
            je_qs = je_qs.filter(date_ad__gte=from_d)
        if to_d:
            je_qs = je_qs.filter(date_ad__lte=to_d)

        rows = (
            JournalLine.objects.filter(
                entry__in=je_qs, account__account_type__in=["income", "expenditure"]
            )
            .values("account__account_type", "account__sub_type")
            .annotate(total_debit=Sum("debit"), total_credit=Sum("credit"))
        )

        income_by_sub: dict[str, Decimal] = {}
        exp_by_sub: dict[str, Decimal] = {}

        for row in rows:
            d = row["total_debit"] or Decimal("0")
            c = row["total_credit"] or Decimal("0")
            sub = row["account__sub_type"] or "other"
            if row["account__account_type"] == "income":
                # Income is credit-normal
                income_by_sub[sub] = income_by_sub.get(sub, Decimal("0")) + (c - d)
            else:
                # Expenditure is debit-normal
                exp_by_sub[sub] = exp_by_sub.get(sub, Decimal("0")) + (d - c)

        def _f(v: Decimal) -> float:
            return float(max(Decimal("0"), v).quantize(Decimal("0.01")))

        fee_income = income_by_sub.get("fee_income", Decimal("0"))
        grant_income = income_by_sub.get("grant_income", Decimal("0"))
        donations = income_by_sub.get("donation_income", Decimal("0"))
        other_inc = sum(
            v
            for k, v in income_by_sub.items()
            if k not in ("fee_income", "grant_income", "donation_income")
        )
        total_income = sum(income_by_sub.values(), Decimal("0"))

        staff_exp = exp_by_sub.get("staff_expense", Decimal("0"))
        prog_exp = exp_by_sub.get("program_expense", Decimal("0"))
        admin_exp = exp_by_sub.get("admin_expense", Decimal("0"))
        bank_charge = exp_by_sub.get("bank_charge", Decimal("0"))
        dep_exp = exp_by_sub.get("depreciation", Decimal("0"))
        tax_exp = exp_by_sub.get("tax_expense", Decimal("0"))
        other_exp = sum(
            v
            for k, v in exp_by_sub.items()
            if k
            not in (
                "staff_expense",
                "program_expense",
                "admin_expense",
                "bank_charge",
                "depreciation",
                "tax_expense",
            )
        )
        total_exp = sum(exp_by_sub.values(), Decimal("0"))
        surplus = total_income - total_exp

        return {
            "income": {
                "fee_income": _f(fee_income),
                "government_grant": _f(grant_income),
                "donations": _f(donations),
                "other_income": _f(other_inc),
                "total": _f(total_income),
            },
            "expenditure": {
                "staff_salary": _f(staff_exp),
                "programme": _f(prog_exp),
                "administration": _f(admin_exp),
                "bank_charges_msf": _f(bank_charge),
                "depreciation": _f(dep_exp),
                "tax_expense": _f(tax_exp),
                "other": _f(other_exp),
                "total": _f(total_exp),
            },
            "surplus_deficit": _f(surplus) if surplus >= 0 else -_f(-surplus),
            "label_surplus": "Surplus" if surplus >= 0 else "Deficit",
            "source": "journal_entries",
        }

    # ── Balance Sheet ──────────────────────────────────────────────────────

    def _balance_sheet(self, tenant, to_d):
        """Statement of Financial Position (NAS NPO 2018 Section 4).

        C3 fix: derived from posted JournalLine aggregates per ChartOfAccount
        sub_type — consistent with the double-entry ledger.
        """
        je_qs = JournalEntry.objects.filter(tenant=tenant, is_posted=True)
        if to_d:
            je_qs = je_qs.filter(date_ad__lte=to_d)

        rows = (
            JournalLine.objects.filter(entry__in=je_qs)
            .values("account__account_type", "account__sub_type")
            .annotate(total_debit=Sum("debit"), total_credit=Sum("credit"))
        )

        balances: dict[tuple, Decimal] = {}
        for row in rows:
            d = row["total_debit"] or Decimal("0")
            c = row["total_credit"] or Decimal("0")
            atype = row["account__account_type"]
            sub = row["account__sub_type"] or ""
            net = (d - c) if atype in ("asset", "expenditure") else (c - d)
            key = (atype, sub)
            balances[key] = balances.get(key, Decimal("0")) + net

        def _sub(*keys) -> Decimal:
            return sum(balances.get(k, Decimal("0")) for k in keys)

        def _f(v: Decimal) -> float:
            return float(v.quantize(Decimal("0.01")))

        cash_and_bank = _sub(("asset", "cash_equivalent"))
        receivables = _sub(("asset", "receivable"))
        other_current = _sub(("asset", "current_asset"))
        total_current = cash_and_bank + receivables + other_current

        fixed_gross = _sub(("asset", "fixed_asset"))
        fixed_net = max(Decimal("0"), fixed_gross)

        total_assets = total_current + fixed_net

        tds_payable = _sub(("liability", "tds_payable"))
        other_curr_lib = _sub(("liability", "current_liability"))
        total_curr_lib = tds_payable + other_curr_lib
        long_term_lib = _sub(("liability", "long_term_liability"))
        total_liab = total_curr_lib + long_term_lib

        total_equity = sum(v for (atype, _), v in balances.items() if atype == "equity")
        total_fund = total_equity
        check_sum = total_liab + total_fund

        fund_accounts = FundAccount.objects.filter(tenant=tenant, is_active=True)

        return {
            "assets": {
                "current_assets": {
                    "cash_and_bank": _f(cash_and_bank),
                    "fees_receivable": _f(receivables),
                    "other_current": _f(other_current),
                    "total_current": _f(total_current),
                },
                "non_current_assets": {
                    "fixed_assets_net": _f(fixed_net),
                },
                "total_assets": _f(total_assets),
            },
            "liabilities": {
                "current_liabilities": {
                    "tds_payable": _f(tds_payable),
                    "other_current": _f(other_curr_lib),
                    "total_current": _f(total_curr_lib),
                },
                "long_term_liabilities": _f(long_term_lib),
                "total_liabilities": _f(total_liab),
            },
            "accumulated_fund": {
                "total": _f(total_fund),
                "restricted_funds": [
                    {
                        "name": f.name,
                        "balance": _f(Decimal(str(f.current_balance))),
                        "type": f.fund_type,
                    }
                    for f in fund_accounts
                    if f.fund_type in ("restricted", "endowment")
                ],
            },
            "total_liabilities_and_fund": _f(check_sum),
            "balanced": abs(total_assets - check_sum) < Decimal("0.01"),
            "source": "journal_entries",
        }

    # ── Cash Flow (Direct Method) ──────────────────────────────────────────

    def _cash_flow(self, tenant, from_d, to_d, fy):
        """Statement of Cash Flows — Direct Method (NAS NPO 2018 Section 6)."""
        pq = Payment.objects.filter(tenant=tenant)
        eq = Expense.objects.filter(tenant=tenant)
        if from_d:
            pq = pq.filter(payment_date__date__gte=from_d)
            eq = eq.filter(date__gte=from_d)
        if to_d:
            pq = pq.filter(payment_date__date__lte=to_d)
            eq = eq.filter(date__lte=to_d)

        receipts_from_fees = float(pq.aggregate(s=Sum("amount"))["s"] or 0)
        payments_to_vendors = float(
            eq.filter(
                category__in=["supplies", "maintenance", "events", "other"]
            ).aggregate(s=Sum("amount"))["s"]
            or 0
        )
        payments_to_staff = float(
            eq.filter(category="salary").aggregate(s=Sum("amount"))["s"] or 0
        )
        payments_utilities = float(
            eq.filter(category="utilities").aggregate(s=Sum("amount"))["s"] or 0
        )
        msf_qs = MerchantServiceFee.objects.filter(tenant=tenant)
        if from_d:
            msf_qs = msf_qs.filter(payment__payment_date__date__gte=from_d)
        if to_d:
            msf_qs = msf_qs.filter(payment__payment_date__date__lte=to_d)
        msf_paid = float(msf_qs.aggregate(s=Sum("msf_amount"))["s"] or 0)

        tds_deposited = float(
            TDSEntry.objects.filter(
                tenant=tenant, is_deposited=True, fiscal_year=fy
            ).aggregate(s=Sum("tds_amount"))["s"]
            or 0
        )

        op_inflow = receipts_from_fees
        op_outflow = (
            payments_to_vendors
            + payments_to_staff
            + payments_utilities
            + msf_paid
            + tds_deposited
        )
        net_op_cf = op_inflow - op_outflow

        # H6: date-filter asset purchases so cash flow reflects the requested period
        inv_qs = InventoryItem.objects.filter(tenant=tenant)
        if from_d:
            inv_qs = inv_qs.filter(purchase_date__gte=from_d)
        if to_d:
            inv_qs = inv_qs.filter(purchase_date__lte=to_d)
        asset_purchases = float(inv_qs.aggregate(s=Sum("purchase_price"))["s"] or 0)
        net_inv_cf = -asset_purchases

        return {
            "operating_activities": {
                "inflows": {
                    "receipts_from_fees": receipts_from_fees,
                },
                "outflows": {
                    "payments_to_staff": payments_to_staff,
                    "payments_to_vendors": payments_to_vendors,
                    "utilities": payments_utilities,
                    "bank_charges_msf": msf_paid,
                    "tds_deposited_ird": tds_deposited,
                },
                "net_cash_from_operations": net_op_cf,
            },
            "investing_activities": {
                "purchase_of_assets": asset_purchases,
                "net_cash_from_investing": net_inv_cf,
            },
            "financing_activities": {
                "grants_received": 0,
                "loan_repayments": 0,
                "net_cash_from_financing": 0,
            },
            "net_increase_decrease": net_op_cf + net_inv_cf,
        }

    # ── Changes in Reserves ────────────────────────────────────────────────

    def _changes_in_reserves(self, tenant, fy):
        """Statement of Changes in Reserves — Restricted vs Unrestricted.

        M1 fix: calculates real additions/utilised amounts from posted journal
        entries tagged to the fund's linked ChartOfAccount, and derives the
        surplus/deficit for the fiscal year from I&E journal lines.
        """
        funds = FundAccount.objects.filter(
            tenant=tenant, is_active=True
        ).select_related("linked_account")
        restricted = [f for f in funds if f.fund_type == "restricted"]
        unrestricted = [f for f in funds if f.fund_type == "unrestricted"]

        je_qs_fy = JournalEntry.objects.filter(
            tenant=tenant, is_posted=True, fiscal_year=fy
        )

        # Surplus / deficit for the year from I&E journal lines
        ie_agg = JournalLine.objects.filter(
            entry__in=je_qs_fy,
            account__account_type__in=["income", "expenditure"],
        ).aggregate(
            income_cr=Sum("credit", filter=Q(account__account_type="income")),
            income_dr=Sum("debit", filter=Q(account__account_type="income")),
            exp_dr=Sum("debit", filter=Q(account__account_type="expenditure")),
            exp_cr=Sum("credit", filter=Q(account__account_type="expenditure")),
        )
        total_income = (ie_agg["income_cr"] or Decimal("0")) - (
            ie_agg["income_dr"] or Decimal("0")
        )
        total_exp = (ie_agg["exp_dr"] or Decimal("0")) - (
            ie_agg["exp_cr"] or Decimal("0")
        )
        surplus_fy = total_income - total_exp

        def _fund_movements(fund: FundAccount) -> tuple[Decimal, Decimal]:
            """Return (additions, utilised) for a fund from its linked account's journal lines."""
            if not fund.linked_account:
                return Decimal("0"), Decimal("0")
            agg = JournalLine.objects.filter(
                entry__in=je_qs_fy,
                account=fund.linked_account,
            ).aggregate(dr=Sum("debit"), cr=Sum("credit"))
            # Equity account is credit-normal: credits = additions, debits = utilised
            additions = agg["cr"] or Decimal("0")
            utilised = agg["dr"] or Decimal("0")
            return additions, utilised

        def _f(v: Decimal) -> float:
            return float(v.quantize(Decimal("0.01")))

        restricted_rows = []
        for f in restricted:
            adds, used = _fund_movements(f)
            restricted_rows.append(
                {
                    "name": f.name,
                    "opening_balance": _f(f.opening_balance),
                    "additions": _f(adds),
                    "utilised": _f(used),
                    "closing_balance": _f(Decimal(str(f.current_balance))),
                }
            )

        unrestricted_rows = []
        for f in unrestricted:
            unrestricted_rows.append(
                {
                    "name": f.name,
                    "opening_balance": _f(f.opening_balance),
                    "surplus_for_year": _f(surplus_fy),
                    "closing_balance": _f(Decimal(str(f.current_balance))),
                }
            )

        return {
            "fiscal_year": fy,
            "restricted_funds": restricted_rows,
            "unrestricted_funds": unrestricted_rows,
            "total_restricted": _f(
                sum(Decimal(str(f.current_balance)) for f in restricted)
            ),
            "total_unrestricted": _f(
                sum(Decimal(str(f.current_balance)) for f in unrestricted)
            ),
            "surplus_deficit_fy": _f(surplus_fy),
        }


# ─────────────────────────────────────────────────────────────────────────────
# BS Calendar Utility endpoint
# ─────────────────────────────────────────────────────────────────────────────


class BSCalendarView(APIView):
    """Utility endpoints for Bikram Sambat calendar conversion."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        action_type = request.query_params.get("action", "today")
        if action_type == "today":
            y, m, d = today_bs()
            return Response(
                {
                    "bs_year": y,
                    "bs_month": m,
                    "bs_day": d,
                    "bs_date_str": f"{y}-{m:02d}-{d:02d}",
                    "bs_display_en": bs_date_display(date.today(), "en"),
                    "bs_display_np": bs_date_display(date.today(), "np"),
                    "fiscal_year": fiscal_year_bs(),
                    "ad_date": str(date.today()),
                }
            )
        elif action_type == "ad_to_bs":
            ad_str = request.query_params.get("date")
            if not ad_str:
                return Response({"error": "date param required"}, status=400)
            try:
                ad = date.fromisoformat(ad_str)
                y, m, d = ad_to_bs(ad)
                return Response(
                    {
                        "ad_date": ad_str,
                        "bs_year": y,
                        "bs_month": m,
                        "bs_day": d,
                        "bs_date_str": f"{y}-{m:02d}-{d:02d}",
                        "bs_month_name_en": BS_MONTH_NAMES_EN[m],
                        "fiscal_year": fiscal_year_bs(ad),
                    }
                )
            except ValueError as e:
                return Response({"error": str(e)}, status=400)
        return Response({"error": "Unknown action"}, status=400)


# ─────────────────────────────────────────────────────────────────────────────
# ConnectIPS Payment Gateway
# ─────────────────────────────────────────────────────────────────────────────


class ConnectIPSInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        fee_id = request.data.get("student_fee_id")
        if not fee_id:
            return Response({"error": "student_fee_id is required."}, status=400)
        try:
            fee = StudentFee.objects.get(pk=fee_id, tenant=request.user.tenant)
        except StudentFee.DoesNotExist:
            return Response({"error": "Fee not found."}, status=404)

        balance_npr = float(fee.amount_due - (fee.amount_paid or 0))
        if balance_npr <= 0:
            return Response({"error": "No outstanding balance."}, status=400)

        frontend_url = request.headers.get("Origin", "http://localhost:3000")
        return_url = f"{frontend_url}/student/fees/payment-result?gateway=connectips"
        fee_name = getattr(fee.fee_structure, "name", "School Fee")

        result = ConnectIPSGateway.initiate(
            amount_paisa=int(balance_npr * 100),
            purchase_order_id=str(fee_id),
            return_url=return_url,
            remarks=fee_name,
        )
        return Response(result)


class ConnectIPSCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        txn_id = request.query_params.get("txnId") or request.query_params.get("TXNID")
        ref_id = request.query_params.get("referenceId") or request.query_params.get(
            "REFERENCEID"
        )
        txn_amt = request.query_params.get("txnAmt")  # in paisa

        if not txn_id or not ref_id:
            return Response({"error": "Missing txnId or referenceId"}, status=400)

        result = ConnectIPSGateway.verify(txn_id, ref_id)
        if result.get("status") not in ("SUCCESS", "FULL"):
            logger.warning("ConnectIPS payment not successful: %s", result)
            return Response(
                {"error": "Payment not successful.", "detail": result}, status=400
            )

        try:
            fee = StudentFee.objects.get(pk=ref_id)
        except StudentFee.DoesNotExist:
            return Response({"error": "Fee not found."}, status=404)

        # The amount is taken from a client-controlled query param, so it must
        # be validated against the authoritative fee balance before crediting.
        # Initiation always charges the full outstanding balance, so a claimed
        # amount exceeding it signals tampering (an inflated amount could mark a
        # fee "paid" without real payment). Equal/partial amounts stay allowed.
        amount_npr = Decimal(str(txn_amt or 0)) / Decimal("100")
        outstanding = Decimal(str(fee.amount_due)) - Decimal(str(fee.amount_paid or 0))
        if amount_npr <= 0 or amount_npr > outstanding:
            logger.warning(
                "ConnectIPS amount rejected: claimed=%s outstanding=%s ref=%s",
                amount_npr,
                outstanding,
                ref_id,
            )
            return Response(
                {"error": "Reported amount does not match the outstanding balance."},
                status=400,
            )

        from billing_school.views_payment_gateway import _record_payment

        payment = _record_payment(fee, amount_npr, "connectips", txn_id, request)

        # Auto-post MSF
        msf_data = calculate_msf(Decimal(str(amount_npr)), "connectips")
        MerchantServiceFee.objects.get_or_create(
            payment=payment,
            defaults={
                "tenant": fee.tenant,
                "gateway": "connectips",
                "gross_amount": msf_data["gross_amount"],
                "msf_rate": msf_data["msf_rate"],
                "msf_amount": msf_data["msf_amount"],
                "net_amount": msf_data["net_amount"],
            },
        )
        return Response({"status": "success", "payment_id": str(payment.pk)})
