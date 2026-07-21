# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import models
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from billing.models_school import Payment, StudentFee
from billing.permissions import IsSchoolFinanceManager
from billing.shared_views import BillingSchemaGuardMixin
from core.reports import generate_excel_response, generate_pdf_response
from core.utils.audit import record_audit_event


class BillingReportViewSet(BillingSchemaGuardMixin, viewsets.ViewSet):
    """
    ViewSet for generating billing and finance reports.
    """

    require_tenant_schema = True
    permission_classes = [IsSchoolFinanceManager]

    def _tenant(self, request):
        return getattr(request.user, "tenant", None) or getattr(request, "tenant", None)

    def _log_export(
        self, request, *, report_type: str, fmt: str, details: dict | None = None
    ):
        record_audit_event(
            action="billing.report_exported",
            user=getattr(request, "user", None),
            request=request,
            details={
                "report_type": report_type,
                "format": fmt,
                **(details or {}),
            },
        )

    @action(detail=False, methods=["get"], url_path="fee-collection")
    def fee_collection_pdf(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        tenant = self._tenant(request)

        payments = (
            Payment.objects.filter(tenant=tenant)
            .select_related("student__user", "student_fee__fee_structure")
            .order_by("-payment_date")
        )

        if start_date:
            payments = payments.filter(payment_date__date__gte=start_date)
        if end_date:
            payments = payments.filter(payment_date__date__lte=end_date)

        total_amount = payments.aggregate(total=Sum("amount"))["total"] or 0

        for payment in payments:
            payment.fee_name = (
                payment.student_fee.fee_structure.name
                if payment.student_fee
                else "General Payment"
            )

        context = {
            "payments": payments,
            "total_amount": total_amount,
            "transaction_count": payments.count(),
            "currency": "USD",
            "school_name": tenant.name if tenant else "Our School",
            "date": timezone.now().strftime("%B %d, %Y"),
            "start_date": start_date or "All Time",
            "end_date": timezone.now().strftime("%Y-%m-%d"),
        }

        filename = f"fee_collection_report_{timezone.now().strftime('%Y%m%d')}.pdf"
        response = generate_pdf_response(
            "reports/fee_collection.html", context, filename
        )

        if response:
            self._log_export(
                request,
                report_type="fee_collection",
                fmt="pdf",
                details={
                    "rows": payments.count(),
                    "start_date": start_date,
                    "end_date": end_date,
                },
            )
            return response
        return Response(
            {"error": "Failed to generate report"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=False, methods=["get"], url_path="fee-collection-excel")
    def fee_collection_excel(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        tenant = self._tenant(request)

        payments = (
            Payment.objects.filter(tenant=tenant)
            .select_related("student__user", "student_fee__fee_structure")
            .order_by("-payment_date")
        )

        if start_date:
            payments = payments.filter(payment_date__date__gte=start_date)
        if end_date:
            payments = payments.filter(payment_date__date__lte=end_date)

        data = []
        for payment in payments:
            data.append(
                {
                    "Date": payment.payment_date.strftime("%Y-%m-%d"),
                    "Student": payment.student.user.get_full_name(),
                    "Fee Type": (
                        payment.student_fee.fee_structure.name
                        if payment.student_fee
                        else "General Payment"
                    ),
                    "Method": payment.get_method_display(),
                    "Transaction ID": payment.transaction_id or "N/A",
                    "Amount": float(payment.amount),
                }
            )

        columns = ["Date", "Student", "Fee Type", "Method", "Transaction ID", "Amount"]
        filename = f"fee_collection_report_{timezone.now().strftime('%Y%m%d')}.xlsx"
        self._log_export(
            request,
            report_type="fee_collection",
            fmt="xlsx",
            details={"rows": len(data), "start_date": start_date, "end_date": end_date},
        )
        return generate_excel_response(data, columns, filename)

    @action(detail=False, methods=["get"], url_path="pending-fees")
    def pending_fees_pdf(self, request):
        tenant = self._tenant(request)
        pending_fees = (
            StudentFee.objects.filter(
                tenant=tenant,
                status__in=["pending", "partial", "overdue"],
            )
            .select_related("student__user", "fee_structure")
            .order_by("due_date")
        )

        total_due = (
            pending_fees.aggregate(
                total=Sum(models.F("amount_due") - models.F("amount_paid"))
            )["total"]
            or 0
        )

        context = {
            "pending_fees": pending_fees,
            "total_due": total_due,
            "count": pending_fees.count(),
            "school_name": tenant.name if tenant else "Our School",
            "date": timezone.now().strftime("%B %d, %Y"),
        }

        filename = f"pending_fees_report_{timezone.now().strftime('%Y%m%d')}.pdf"
        response = generate_pdf_response("reports/pending_fees.html", context, filename)

        if response:
            self._log_export(
                request,
                report_type="pending_fees",
                fmt="pdf",
                details={"rows": pending_fees.count()},
            )
            return response
        return Response(
            {"error": "Failed to generate report"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=False, methods=["get"], url_path="pending-fees-excel")
    def pending_fees_excel(self, request):
        tenant = self._tenant(request)
        pending_fees = (
            StudentFee.objects.filter(
                tenant=tenant,
                status__in=["pending", "partial", "overdue"],
            )
            .select_related("student__user", "fee_structure")
            .order_by("due_date")
        )

        data = []
        for fee in pending_fees:
            data.append(
                {
                    "Student": fee.student.user.get_full_name(),
                    "Fee Type": fee.fee_structure.name,
                    "Due Date": fee.due_date.strftime("%Y-%m-%d"),
                    "Status": fee.get_status_display(),
                    "Amount Due": float(fee.amount_due),
                    "Amount Paid": float(fee.amount_paid),
                    "Balance": float(fee.amount_due - fee.amount_paid),
                }
            )

        columns = [
            "Student",
            "Fee Type",
            "Due Date",
            "Status",
            "Amount Due",
            "Amount Paid",
            "Balance",
        ]
        filename = f"pending_fees_report_{timezone.now().strftime('%Y%m%d')}.xlsx"
        self._log_export(
            request,
            report_type="pending_fees",
            fmt="xlsx",
            details={"rows": len(data)},
        )
        return generate_excel_response(data, columns, filename)

    # ─────────────────────────────────────────────────────────────────────
    # Phase B: Day Book / Cash Book / Bank Book / Student Ledger / Aging /
    #         Trial Balance — JSON for on-screen view, frontend prints.
    # ─────────────────────────────────────────────────────────────────────

    def _date_range(self, request):
        """Resolve start/end date params, defaulting to today only."""
        from datetime import date as _date

        from django.utils.dateparse import parse_date

        today = timezone.now().date()
        start = parse_date(request.query_params.get("from") or "") or today
        end = parse_date(request.query_params.get("to") or "") or today
        if start > end:
            start, end = end, start
        return start, end

    def _payments_in_range(self, tenant, start, end):
        from billing.models_school import Payment

        return (
            Payment.objects.filter(
                tenant=tenant,
                payment_date__date__gte=start,
                payment_date__date__lte=end,
            )
            .select_related(
                "student__user", "student_fee__fee_structure", "recorded_by"
            )
            .order_by("payment_date")
        )

    def _expenses_in_range(self, tenant, start, end):
        from billing.models_school import Expense

        return (
            Expense.objects.filter(tenant=tenant, date__gte=start, date__lte=end)
            .select_related("recorded_by")
            .order_by("date")
        )

    @action(detail=False, methods=["get"], url_path="day-book")
    def day_book(self, request):
        """
        Daily transactions register: every Payment (Dr) + Expense (Cr) for
        the requested date range, in chronological order, with day totals.
        """
        from decimal import Decimal

        tenant = self._tenant(request)
        start, end = self._date_range(request)

        rows = []
        in_total = Decimal("0")
        out_total = Decimal("0")

        for p in self._payments_in_range(tenant, start, end):
            try:
                student_name = (
                    p.student.user.get_full_name()
                    if p.student and p.student.user
                    else "—"
                )
            except Exception:
                student_name = "—"
            fee_label = (
                p.student_fee.fee_structure.name
                if p.student_fee and p.student_fee.fee_structure
                else "General"
            )
            rows.append(
                {
                    "date": p.payment_date.isoformat(),
                    "type": "receipt",
                    "particulars": f"{student_name} — {fee_label}",
                    "method": p.method,
                    "reference": p.bill_number or p.transaction_id or "",
                    "in": str(p.amount),
                    "out": "0.00",
                }
            )
            in_total += p.amount

        for e in self._expenses_in_range(tenant, start, end):
            rows.append(
                {
                    "date": e.date.isoformat(),
                    "type": "expense",
                    "particulars": f"{e.title} — {e.category}",
                    "method": "",
                    "reference": "",
                    "in": "0.00",
                    "out": str(e.amount),
                }
            )
            out_total += e.amount

        rows.sort(key=lambda r: r["date"])

        return Response(
            {
                "from": start.isoformat(),
                "to": end.isoformat(),
                "rows": rows,
                "totals": {
                    "in": str(in_total),
                    "out": str(out_total),
                    "net": str(in_total - out_total),
                },
            }
        )

    @action(detail=False, methods=["get"], url_path="cash-book")
    def cash_book(self, request):
        """Day Book filtered to cash payments only."""
        from decimal import Decimal

        tenant = self._tenant(request)
        start, end = self._date_range(request)

        rows = []
        total_in = Decimal("0")
        for p in self._payments_in_range(tenant, start, end).filter(method="cash"):
            try:
                student_name = (
                    p.student.user.get_full_name()
                    if p.student and p.student.user
                    else "—"
                )
            except Exception:
                student_name = "—"
            fee_label = (
                p.student_fee.fee_structure.name
                if p.student_fee and p.student_fee.fee_structure
                else "General"
            )
            rows.append(
                {
                    "date": p.payment_date.isoformat(),
                    "particulars": f"{student_name} — {fee_label}",
                    "reference": p.bill_number or p.transaction_id or "",
                    "amount": str(p.amount),
                }
            )
            total_in += p.amount

        return Response(
            {
                "from": start.isoformat(),
                "to": end.isoformat(),
                "rows": rows,
                "total": str(total_in),
            }
        )

    @action(detail=False, methods=["get"], url_path="bank-book")
    def bank_book(self, request):
        """Payments via non-cash methods (bank_transfer, cheque, online, card)."""
        from decimal import Decimal

        tenant = self._tenant(request)
        start, end = self._date_range(request)

        rows = []
        total = Decimal("0")
        non_cash = ("bank_transfer", "cheque", "online", "card")
        for p in self._payments_in_range(tenant, start, end).filter(
            method__in=non_cash
        ):
            try:
                student_name = (
                    p.student.user.get_full_name()
                    if p.student and p.student.user
                    else "—"
                )
            except Exception:
                student_name = "—"
            fee_label = (
                p.student_fee.fee_structure.name
                if p.student_fee and p.student_fee.fee_structure
                else "General"
            )
            rows.append(
                {
                    "date": p.payment_date.isoformat(),
                    "method": p.method,
                    "particulars": f"{student_name} — {fee_label}",
                    "reference": p.transaction_id or p.bill_number or "",
                    "amount": str(p.amount),
                }
            )
            total += p.amount

        return Response(
            {
                "from": start.isoformat(),
                "to": end.isoformat(),
                "rows": rows,
                "total": str(total),
            }
        )

    @action(detail=False, methods=["get"], url_path="student-ledger")
    def student_ledger(self, request):
        """
        T-format ledger for a single student: every fee charge (Dr) + every
        payment received (Cr) with running balance.
        """
        from decimal import Decimal

        from billing.models_school import Payment, StudentFee

        student_id = request.query_params.get("student")
        if not student_id:
            return Response(
                {"detail": "student query param is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant = self._tenant(request)
        from academic.models import Student

        try:
            student = Student.objects.select_related("user").get(student_id=student_id)
        except Student.DoesNotExist:
            return Response(
                {"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND
            )

        fees = (
            StudentFee.objects.filter(tenant=tenant, student=student)
            .select_related("fee_structure")
            .order_by("due_date")
        )
        payments = (
            Payment.objects.filter(tenant=tenant, student=student)
            .select_related("student_fee__fee_structure")
            .order_by("payment_date")
        )

        # Build chronological event list, then compute running balance.
        events = []
        for f in fees:
            events.append(
                {
                    "ts": f.created_at,
                    "date": f.due_date.isoformat(),
                    "particulars": f.fee_structure.name if f.fee_structure else "Fee",
                    "reference": "",
                    "debit": str(f.amount_due),
                    "credit": "0.00",
                }
            )
        for p in payments:
            events.append(
                {
                    "ts": p.payment_date,
                    "date": p.payment_date.date().isoformat(),
                    "particulars": (
                        p.student_fee.fee_structure.name
                        if p.student_fee and p.student_fee.fee_structure
                        else "Payment received"
                    ),
                    "reference": p.bill_number or p.transaction_id or "",
                    "debit": "0.00",
                    "credit": str(p.amount),
                }
            )

        events.sort(key=lambda e: e["ts"])

        running = Decimal("0")
        rows = []
        total_dr = Decimal("0")
        total_cr = Decimal("0")
        for e in events:
            d = Decimal(e["debit"])
            c = Decimal(e["credit"])
            total_dr += d
            total_cr += c
            running += d - c
            rows.append(
                {
                    "date": e["date"],
                    "particulars": e["particulars"],
                    "reference": e["reference"],
                    "debit": e["debit"],
                    "credit": e["credit"],
                    "balance": str(running),
                }
            )

        try:
            student_name = student.user.get_full_name() if student.user else ""
        except Exception:
            student_name = ""

        return Response(
            {
                "student": {
                    "id": str(student.student_id),
                    "name": student_name,
                    "class": (
                        str(student.academic_class)
                        if getattr(student, "academic_class", None)
                        else ""
                    ),
                },
                "rows": rows,
                "totals": {
                    "debit": str(total_dr),
                    "credit": str(total_cr),
                    "balance": str(running),
                },
            }
        )

    @action(detail=False, methods=["get"], url_path="aging")
    def aging_report(self, request):
        """
        Outstanding StudentFee bucketed by overdue age:
            current (not yet due) | 1–30 | 31–60 | 61–90 | 90+
        """
        from datetime import timedelta
        from decimal import Decimal

        from django.db.models import F

        tenant = self._tenant(request)
        as_of = self._date_range(request)[1]  # use 'to' as as_of

        outstanding = (
            StudentFee.objects.filter(tenant=tenant)
            .exclude(status__in=["paid", "waived"])
            .annotate(balance=F("amount_due") - F("amount_paid"))
            .filter(balance__gt=0)
            .select_related("student__user", "fee_structure")
            .order_by("due_date")
        )

        buckets = {"current": [], "0-30": [], "31-60": [], "61-90": [], "90+": []}
        bucket_totals = {k: Decimal("0") for k in buckets}

        for f in outstanding:
            try:
                student_name = (
                    f.student.user.get_full_name()
                    if f.student and f.student.user
                    else "—"
                )
            except Exception:
                student_name = "—"
            balance = Decimal(str(f.balance))
            days_overdue = (as_of - f.due_date).days

            if days_overdue < 0:
                key = "current"
            elif days_overdue <= 30:
                key = "0-30"
            elif days_overdue <= 60:
                key = "31-60"
            elif days_overdue <= 90:
                key = "61-90"
            else:
                key = "90+"

            buckets[key].append(
                {
                    "student_id": str(f.student.student_id) if f.student else "",
                    "student_name": student_name,
                    "fee_name": f.fee_structure.name if f.fee_structure else "Fee",
                    "due_date": f.due_date.isoformat(),
                    "days_overdue": max(0, days_overdue),
                    "balance": str(balance),
                }
            )
            bucket_totals[key] += balance

        return Response(
            {
                "as_of": as_of.isoformat(),
                "buckets": buckets,
                "totals": {k: str(v) for k, v in bucket_totals.items()},
                "grand_total": str(sum(bucket_totals.values())),
            }
        )

    @action(detail=False, methods=["get"], url_path="scholarship-register")
    def scholarship_register(self, request):
        """
        Phase E (Tier 3): Government Scholarship Register.

        Aggregates every StudentFee whose discount has a scholarship_category
        set, grouped by (category, source) for the requested fiscal year.
        IRD / SSDP / EGRP auditors expect this register annually.
        """
        from decimal import Decimal

        from billing.models_school import FeeDiscount, StudentFee

        tenant = self._tenant(request)
        fy = (request.query_params.get("fy") or "").strip()

        qs = (
            StudentFee.objects.filter(tenant=tenant)
            .exclude(discount__isnull=True)
            .exclude(discount__scholarship_category="")
            .select_related("student__user", "fee_structure", "discount")
        )

        # Optional FY filter: due_date inside the BS fiscal year window.
        # We don't have an indexed fiscal_year column on StudentFee, so we
        # filter in Python after a lightweight created_at-based AD heuristic.
        if fy:
            from billing_school.utils_bs_calendar import fiscal_year_bs

            rows = [
                f for f in qs if fiscal_year_bs(f.due_date).startswith(fy.split("/")[0])
            ]
        else:
            rows = list(qs)

        cat_map = dict(FeeDiscount.SCHOLARSHIP_CATEGORY_CHOICES)
        src_map = dict(FeeDiscount.SCHOLARSHIP_SOURCE_CHOICES)

        # Group: category -> source -> { count, amount, awards: [...] }
        groups: dict = {}
        grand_count = 0
        grand_amount = Decimal("0")

        for f in rows:
            disc = f.discount
            cat = disc.scholarship_category or "other"
            src = disc.scholarship_source or "other"
            award_amount = Decimal(str(f.discount_amount or 0))

            try:
                student_name = (
                    f.student.user.get_full_name()
                    if f.student and f.student.user
                    else "—"
                )
            except Exception:
                student_name = "—"
            class_name = (
                str(f.student.academic_class)
                if getattr(f.student, "academic_class", None)
                else ""
            )

            g = groups.setdefault(cat, {})
            s = g.setdefault(src, {"count": 0, "amount": Decimal("0"), "awards": []})
            s["count"] += 1
            s["amount"] += award_amount
            s["awards"].append(
                {
                    "student_id": str(f.student.student_id) if f.student else "",
                    "student_name": student_name,
                    "class": class_name,
                    "fee_name": f.fee_structure.name if f.fee_structure else "",
                    "discount_name": disc.name,
                    "amount": str(award_amount),
                    "due_date": f.due_date.isoformat(),
                }
            )
            grand_count += 1
            grand_amount += award_amount

        # Flatten for JSON serialization.
        rendered = []
        for cat_key, sources in groups.items():
            for src_key, payload in sources.items():
                rendered.append(
                    {
                        "category_key": cat_key,
                        "category_label": cat_map.get(cat_key, cat_key.title()),
                        "source_key": src_key,
                        "source_label": src_map.get(src_key, src_key.title()),
                        "count": payload["count"],
                        "amount": str(payload["amount"]),
                        "awards": payload["awards"],
                    }
                )

        # Stable sort: category, then source.
        rendered.sort(key=lambda r: (r["category_label"], r["source_label"]))

        return Response(
            {
                "fiscal_year_bs": fy,
                "grand_count": grand_count,
                "grand_amount": str(grand_amount),
                "groups": rendered,
            }
        )

    @action(detail=False, methods=["get"], url_path="scholarship-register-pdf")
    def scholarship_register_pdf(self, request):
        """PDF version of the scholarship register — for audit binder."""
        from decimal import Decimal

        json_data = self.scholarship_register(request).data
        tenant = self._tenant(request)

        logo_url = ""
        try:
            if tenant and tenant.logo:
                logo_url = tenant.logo.url
        except Exception:
            logo_url = ""

        context = {
            **json_data,
            "school_name": tenant.name if tenant else "",
            "school_pan": getattr(tenant, "pan_number", "") or "",
            "school_address": getattr(tenant, "address", "") or "",
            "school_logo": logo_url,
            "principal_name": getattr(tenant, "principal_name", "") or "",
            "accountant_name": getattr(tenant, "accountant_name", "") or "",
            "currency": getattr(tenant, "currency_symbol", "Rs.") or "Rs.",
            "generated_on": timezone.now().strftime("%d %b %Y %H:%M"),
        }
        filename = (
            f"scholarship_register_{json_data.get('fiscal_year_bs') or 'all'}.pdf"
        )
        response = generate_pdf_response(
            "reports/scholarship_register.html", context, filename
        )
        if response:
            self._log_export(
                request,
                report_type="scholarship_register",
                fmt="pdf",
                details={
                    "groups": len(json_data.get("groups", [])),
                    "grand_count": json_data.get("grand_count"),
                },
            )
            return response
        return Response(
            {"error": "Failed to generate report"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=False, methods=["get"], url_path="trial-balance")
    def trial_balance(self, request):
        """
        Trial Balance from posted Journal Entries (NAS COA).

        Note: only reflects accounts where journal lines have been posted.
        Phase C will auto-post receipts/expenses so this fills automatically.
        """
        from decimal import Decimal

        from django.db.models import Sum

        from billing_school.models_nas import ChartOfAccount

        tenant = self._tenant(request)
        as_of = self._date_range(request)[1]

        accounts = ChartOfAccount.objects.filter(
            tenant=tenant, is_active=True
        ).order_by("account_code")

        rows = []
        total_dr = Decimal("0")
        total_cr = Decimal("0")
        for acc in accounts:
            agg = acc.journal_lines.filter(
                entry__is_posted=True,
                entry__date_ad__lte=as_of,
            ).aggregate(d=Sum("debit"), c=Sum("credit"))
            debits = agg["d"] or Decimal("0")
            credits = agg["c"] or Decimal("0")
            net = debits - credits
            if acc.account_type in ("asset", "expenditure"):
                # Debit-normal: positive net stays in Dr column
                dr_col, cr_col = (net if net > 0 else Decimal("0")), (
                    -net if net < 0 else Decimal("0")
                )
            else:
                # Credit-normal: positive net stays in Cr column
                dr_col, cr_col = (-net if net < 0 else Decimal("0")), (
                    net if net > 0 else Decimal("0")
                )
            if dr_col == 0 and cr_col == 0:
                continue
            rows.append(
                {
                    "account_code": acc.account_code,
                    "account_name": acc.name,
                    "account_type": acc.account_type,
                    "debit": str(dr_col),
                    "credit": str(cr_col),
                }
            )
            total_dr += dr_col
            total_cr += cr_col

        return Response(
            {
                "as_of": as_of.isoformat(),
                "rows": rows,
                "totals": {"debit": str(total_dr), "credit": str(total_cr)},
                "balanced": total_dr == total_cr,
            }
        )


__all__ = ["BillingReportViewSet"]
