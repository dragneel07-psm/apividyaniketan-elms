# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from datetime import date, timedelta

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from billing.models_school import Expense, FeeStructure, Payment, StudentFee
from billing.permissions import IsSchoolFinanceManager
from billing.serializers import (
    ExpenseSerializer,
    FeeStructureSerializer,
    PaymentSerializer,
    StudentFeeSerializer,
)
from billing.shared_views import BillingIdempotencyMixin, BillingSchemaGuardMixin
from core.mixins import TenantScopedQuerysetMixin
from core.reports import generate_pdf_response
from core.utils.audit import record_audit_event


class FeeStructureViewSet(
    BillingSchemaGuardMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet
):
    require_tenant_schema = True
    allow_unscoped_for_saas = False
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    permission_classes = [IsSchoolFinanceManager]

    def perform_create(self, serializer):
        item = serializer.save(tenant=self.request.user.tenant)
        record_audit_event(
            action="billing.fee_structure_created",
            user=self.request.user,
            request=self.request,
            details={
                "fee_id": str(item.fee_id),
                "name": item.name,
                "amount": str(item.amount),
                "frequency": item.frequency,
                "academic_class_id": item.academic_class_id,
            },
        )

    def perform_update(self, serializer):
        before = serializer.instance
        before_snapshot = {
            "name": before.name,
            "amount": str(before.amount),
            "frequency": before.frequency,
            "academic_class_id": before.academic_class_id,
        }
        item = serializer.save()
        record_audit_event(
            action="billing.fee_structure_updated",
            user=self.request.user,
            request=self.request,
            details={
                "fee_id": str(item.fee_id),
                "before": before_snapshot,
                "after": {
                    "name": item.name,
                    "amount": str(item.amount),
                    "frequency": item.frequency,
                    "academic_class_id": item.academic_class_id,
                },
            },
        )

    def perform_destroy(self, instance):
        payload = {
            "fee_id": str(instance.fee_id),
            "name": instance.name,
            "amount": str(instance.amount),
            "frequency": instance.frequency,
            "academic_class_id": instance.academic_class_id,
        }
        super().perform_destroy(instance)
        record_audit_event(
            action="billing.fee_structure_deleted",
            user=self.request.user,
            request=self.request,
            details=payload,
        )


class FeeHeadViewSet(
    BillingSchemaGuardMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet
):
    """
    Phase C: CRUD for fee heads (line items under a FeeStructure).

    Frontend posts ?fee_structure=<uuid> to filter the list when editing one
    structure's heads. The viewset auto-scopes tenant on writes.
    """

    require_tenant_schema = True
    allow_unscoped_for_saas = False
    serializer_class = None  # bound in __init__ to avoid import cycle on module load
    permission_classes = [IsSchoolFinanceManager]

    def __init__(self, *args, **kwargs):
        from billing.models_school import FeeHead
        from billing.serializers import FeeHeadSerializer

        self.serializer_class = FeeHeadSerializer
        self.queryset = FeeHead.objects.all()
        super().__init__(*args, **kwargs)

    def get_queryset(self):
        qs = super().get_queryset()
        structure_id = self.request.query_params.get("fee_structure")
        if structure_id:
            qs = qs.filter(fee_structure_id=structure_id)
        return qs.order_by("sort_order", "name")

    def perform_create(self, serializer):
        from billing.models_school import FeeStructure

        tenant = self.request.user.tenant
        # Enforce the fee_structure belongs to this tenant.
        structure = serializer.validated_data.get("fee_structure")
        if structure and getattr(structure, "tenant_id", None) != tenant.id:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Fee structure does not belong to your tenant.")
        head = serializer.save(tenant=tenant)
        record_audit_event(
            action="billing.fee_head_created",
            user=self.request.user,
            request=self.request,
            details={
                "head_id": str(head.head_id),
                "fee_structure_id": str(head.fee_structure_id),
                "name": head.name,
                "amount": str(head.amount),
            },
        )

    def perform_update(self, serializer):
        head = serializer.save()
        record_audit_event(
            action="billing.fee_head_updated",
            user=self.request.user,
            request=self.request,
            details={
                "head_id": str(head.head_id),
                "name": head.name,
                "amount": str(head.amount),
            },
        )

    def perform_destroy(self, instance):
        payload = {
            "head_id": str(instance.head_id),
            "name": instance.name,
            "amount": str(instance.amount),
        }
        super().perform_destroy(instance)
        record_audit_event(
            action="billing.fee_head_deleted",
            user=self.request.user,
            request=self.request,
            details=payload,
        )


class StudentFeeViewSet(
    BillingIdempotencyMixin,
    BillingSchemaGuardMixin,
    TenantScopedQuerysetMixin,
    viewsets.ModelViewSet,
):
    require_tenant_schema = True
    allow_unscoped_for_saas = False
    queryset = StudentFee.objects.all()
    serializer_class = StudentFeeSerializer
    permission_classes = [IsSchoolFinanceManager]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.select_related("student__user", "fee_structure")

    def create(self, request, *args, **kwargs):
        def _execute():
            return super(StudentFeeViewSet, self).create(request, *args, **kwargs)

        return self._idempotent_execute(
            request,
            endpoint="billing.student_fees.create",
            resource_type="student_fee",
            resource_id_field="student_fee_id",
            execute=_execute,
        )

    def perform_create(self, serializer):
        item = serializer.save(tenant=self.request.user.tenant)
        record_audit_event(
            action="billing.student_fee_created",
            user=self.request.user,
            request=self.request,
            details={
                "student_fee_id": str(item.student_fee_id),
                "student_id": str(item.student_id),
                "fee_id": str(item.fee_structure_id),
                "amount_due": str(item.amount_due),
                "due_date": item.due_date,
                "status": item.status,
            },
        )

    def perform_update(self, serializer):
        before = serializer.instance
        before_snapshot = {
            "amount_due": str(before.amount_due),
            "amount_paid": str(before.amount_paid),
            "due_date": before.due_date,
            "status": before.status,
        }
        item = serializer.save()
        record_audit_event(
            action="billing.student_fee_updated",
            user=self.request.user,
            request=self.request,
            details={
                "student_fee_id": str(item.student_fee_id),
                "student_id": str(item.student_id),
                "fee_id": str(item.fee_structure_id),
                "before": before_snapshot,
                "after": {
                    "amount_due": str(item.amount_due),
                    "amount_paid": str(item.amount_paid),
                    "due_date": item.due_date,
                    "status": item.status,
                },
            },
        )

    def perform_destroy(self, instance):
        payload = {
            "student_fee_id": str(instance.student_fee_id),
            "student_id": str(instance.student_id),
            "fee_id": str(instance.fee_structure_id),
            "amount_due": str(instance.amount_due),
            "amount_paid": str(instance.amount_paid),
            "status": instance.status,
        }
        super().perform_destroy(instance)
        record_audit_event(
            action="billing.student_fee_deleted",
            user=self.request.user,
            request=self.request,
            details=payload,
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my_fees(self, request):
        """
        GET /api/billing/school/student-fees/my-fees/
        Returns the authenticated student's own fee records and payment history.
        """
        from academic.models import Student
        from billing.models_school import Payment

        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response(
                {"detail": "No student profile found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        fees = (
            StudentFee.objects.filter(student=student)
            .select_related("fee_structure")
            .order_by("-due_date")
        )
        payments = Payment.objects.filter(student=student).order_by("-payment_date")

        from decimal import Decimal as D

        total_due = sum(D(str(f.amount_due or 0)) for f in fees)
        total_paid = sum(D(str(f.amount_paid or 0)) for f in fees)

        return Response(
            {
                "fees": StudentFeeSerializer(fees, many=True).data,
                "payments": PaymentSerializer(payments, many=True).data,
                "summary": {
                    "total_due": float(total_due),
                    "total_paid": float(total_paid),
                    "outstanding": float(total_due - total_paid),
                },
            }
        )

    @action(detail=True, methods=["post"])
    def send_invoice(self, request, pk=None):
        """
        POST /api/billing/school/student-fees/{id}/send-invoice/
        Sends an in-app notification to the student about their fee.
        """
        fee = self.get_object()
        try:
            from notifications.services import NotificationService

            NotificationService.create_notification(
                recipient=fee.student.user,
                title=f"Fee Invoice: {fee.fee_structure.name}",
                message=(
                    f"Dear {fee.student.user.first_name}, your fee "
                    f"'{fee.fee_structure.name}' of {fee.amount_due} is due on "
                    f"{fee.due_date}. Outstanding balance: {fee.balance}."
                ),
                notification_type="fee_invoice",
            )
        except Exception as e:
            return Response(
                {"detail": f"Invoice notification failed: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response({"status": "invoice_sent", "student": str(fee.student_id)})

    @action(detail=False, methods=["post"], url_path="bulk-assign-multi")
    def bulk_assign_multi(self, request):
        """
        Phase D: assign multiple fee structures to multiple classes at once.
        Body: {
            "class_ids":          [<academic_class_id>, ...],
            "fee_structure_ids":  [<fee_id>, ...],
            "due_date":           "YYYY-MM-DD",
            "skip_existing":      true        # don't duplicate if a StudentFee
                                              # already exists for (student, structure, due_date)
        }
        Returns per-structure created/skipped counts.
        """
        from academic.models import Student

        tenant = getattr(request.user, "tenant", None)
        if not tenant:
            return Response(
                {"detail": "No tenant in scope."}, status=status.HTTP_400_BAD_REQUEST
            )

        class_ids = request.data.get("class_ids") or []
        structure_ids = request.data.get("fee_structure_ids") or []
        due_date = request.data.get("due_date")
        skip_existing = bool(request.data.get("skip_existing", True))

        if not class_ids or not structure_ids or not due_date:
            return Response(
                {
                    "detail": "class_ids, fee_structure_ids and due_date are all required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        structures = FeeStructure.objects.filter(
            tenant=tenant, fee_id__in=structure_ids
        )
        if structures.count() != len(set(map(str, structure_ids))):
            return Response(
                {"detail": "Some fee structures not found in this tenant."},
                status=status.HTTP_404_NOT_FOUND,
            )

        students = list(
            Student.objects.filter(
                academic_class_id__in=class_ids, user__tenant=tenant
            ).select_related("user")
        )
        if not students:
            return Response(
                {"detail": "No students found in the selected class(es)."},
                status=status.HTTP_404_NOT_FOUND,
            )

        summary = []
        total_created = 0
        total_skipped = 0
        created_fee_ids = []

        with transaction.atomic():
            for structure in structures:
                created = 0
                skipped = 0
                # Pre-load existing rows to avoid N+1 lookup inside the loop.
                existing = set()
                if skip_existing:
                    existing = set(
                        StudentFee.objects.filter(
                            tenant=tenant, fee_structure=structure, due_date=due_date
                        ).values_list("student_id", flat=True)
                    )
                for s in students:
                    if skip_existing and s.student_id in existing:
                        skipped += 1
                        continue
                    fee = StudentFee.objects.create(
                        tenant=tenant,
                        student=s,
                        fee_structure=structure,
                        amount_due=structure.amount,
                        due_date=due_date,
                        status="pending",
                    )
                    created += 1
                    created_fee_ids.append(str(fee.student_fee_id))
                summary.append(
                    {
                        "fee_structure_id": str(structure.fee_id),
                        "fee_structure_name": structure.name,
                        "created": created,
                        "skipped": skipped,
                    }
                )
                total_created += created
                total_skipped += skipped

        record_audit_event(
            action="billing.student_fee_bulk_assign_multi",
            user=request.user,
            request=request,
            details={
                "class_ids": class_ids,
                "structure_ids": structure_ids,
                "due_date": due_date,
                "students": len(students),
                "created": total_created,
                "skipped": total_skipped,
            },
        )

        return Response(
            {
                "created": total_created,
                "skipped": total_skipped,
                "student_count": len(students),
                "summary": summary,
                "created_fee_ids": created_fee_ids,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="generate-bill")
    def generate_bill(self, request, pk=None):
        """
        Generate a one-page bill PDF for a single StudentFee — emphasizes
        outstanding balance + due date, suitable for distributing to parents.
        """
        from decimal import Decimal

        from billing_school.utils_bs_calendar import bs_date_display

        fee = self.get_object()
        tenant = fee.tenant
        structure = fee.fee_structure
        student = fee.student

        balance = Decimal(str(fee.amount_due or 0)) - Decimal(str(fee.amount_paid or 0))
        try:
            from num2words import num2words

            amount_words = num2words(balance, lang="en").title() + " Only"
        except Exception:
            amount_words = ""

        try:
            student_name = (
                student.user.get_full_name() if student and student.user else ""
            )
        except Exception:
            student_name = ""

        try:
            due_date_bs = bs_date_display(fee.due_date)
        except Exception:
            due_date_bs = ""

        heads = []
        if structure and hasattr(structure, "heads"):
            try:
                heads = [
                    {"name": h.name, "amount": f"{h.amount:.2f}"}
                    for h in structure.heads.all()
                ]
            except Exception:
                heads = []

        logo_url = ""
        try:
            if tenant and tenant.logo:
                logo_url = tenant.logo.url
        except Exception:
            logo_url = ""

        context = {
            "school_name": tenant.name if tenant else "",
            "school_address": getattr(tenant, "address", "") or "",
            "school_phone": getattr(tenant, "contact_phone", "") or "",
            "school_email": getattr(tenant, "contact_email", "") or "",
            "school_pan": getattr(tenant, "pan_number", "") or "",
            "school_vat": getattr(tenant, "vat_number", "") or "",
            "school_logo": logo_url,
            "principal_name": getattr(tenant, "principal_name", "") or "",
            "accountant_name": getattr(tenant, "accountant_name", "") or "",
            "fiscal_year_bs": getattr(tenant, "fiscal_year_bs", "") or "",
            "bill_number": f"BILL-{str(fee.student_fee_id)[:8].upper()}",
            "student_name": student_name,
            "student_id": str(getattr(student, "student_id", "") or ""),
            "class_name": (
                str(student.academic_class)
                if getattr(student, "academic_class", None)
                else ""
            ),
            "due_date": fee.due_date.strftime("%d %b %Y"),
            "due_date_bs": due_date_bs,
            "fee_title": structure.name if structure else "Fee",
            "fee_period": getattr(structure, "frequency", "") if structure else "",
            "fee_heads": heads,
            "amount_due": f"{Decimal(str(fee.amount_due or 0)):.2f}",
            "amount_paid": f"{Decimal(str(fee.amount_paid or 0)):.2f}",
            "balance": f"{balance:.2f}",
            "late_fee": f"{Decimal(str(getattr(fee, 'late_fee_applied', 0) or 0)):.2f}",
            "amount_words": amount_words,
            "status": fee.get_status_display(),
            "currency": getattr(tenant, "currency_symbol", "Rs.") or "Rs.",
            "generated_on": timezone.now().strftime("%d %b %Y %H:%M"),
        }
        filename = f"bill_{str(fee.student_fee_id)[:8]}.pdf"
        response = generate_pdf_response("reports/student_bill.html", context, filename)
        if response:
            return response
        return Response(
            {"error": "Failed to generate bill"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=False, methods=["post"], url_path="bulk-bills-pdf")
    def bulk_bills_pdf(self, request):
        """
        Combined PDF: one page per StudentFee in the supplied list.
        Body: { "student_fee_ids": [<uuid>, ...] }
        """
        from decimal import Decimal

        from billing_school.utils_bs_calendar import bs_date_display

        tenant = getattr(request.user, "tenant", None)
        if not tenant:
            return Response(
                {"detail": "No tenant in scope."}, status=status.HTTP_400_BAD_REQUEST
            )

        ids = request.data.get("student_fee_ids") or []
        if not ids:
            return Response(
                {"detail": "student_fee_ids is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fees = (
            StudentFee.objects.filter(tenant=tenant, student_fee_id__in=ids)
            .select_related("student__user", "fee_structure")
            .prefetch_related("fee_structure__heads")
            .order_by("student__user__first_name")
        )

        try:
            from num2words import num2words
        except Exception:
            num2words = None

        bills = []
        for fee in fees:
            balance = Decimal(str(fee.amount_due or 0)) - Decimal(
                str(fee.amount_paid or 0)
            )
            try:
                student_name = (
                    fee.student.user.get_full_name()
                    if fee.student and fee.student.user
                    else ""
                )
            except Exception:
                student_name = ""
            try:
                due_date_bs = bs_date_display(fee.due_date)
            except Exception:
                due_date_bs = ""
            heads = []
            try:
                heads = [
                    {"name": h.name, "amount": f"{h.amount:.2f}"}
                    for h in fee.fee_structure.heads.all()
                ]
            except Exception:
                heads = []
            amount_words = ""
            if num2words:
                try:
                    amount_words = num2words(balance, lang="en").title() + " Only"
                except Exception:
                    amount_words = ""
            bills.append(
                {
                    "bill_number": f"BILL-{str(fee.student_fee_id)[:8].upper()}",
                    "student_name": student_name,
                    "student_id": str(getattr(fee.student, "student_id", "") or ""),
                    "class_name": (
                        str(fee.student.academic_class)
                        if getattr(fee.student, "academic_class", None)
                        else ""
                    ),
                    "due_date": fee.due_date.strftime("%d %b %Y"),
                    "due_date_bs": due_date_bs,
                    "fee_title": fee.fee_structure.name if fee.fee_structure else "Fee",
                    "fee_heads": heads,
                    "amount_due": f"{Decimal(str(fee.amount_due or 0)):.2f}",
                    "amount_paid": f"{Decimal(str(fee.amount_paid or 0)):.2f}",
                    "balance": f"{balance:.2f}",
                    "late_fee": f"{Decimal(str(getattr(fee, 'late_fee_applied', 0) or 0)):.2f}",
                    "amount_words": amount_words,
                    "status": fee.get_status_display(),
                }
            )

        logo_url = ""
        try:
            if tenant and tenant.logo:
                logo_url = tenant.logo.url
        except Exception:
            logo_url = ""

        context = {
            "bills": bills,
            "school_name": tenant.name if tenant else "",
            "school_address": getattr(tenant, "address", "") or "",
            "school_phone": getattr(tenant, "contact_phone", "") or "",
            "school_pan": getattr(tenant, "pan_number", "") or "",
            "school_logo": logo_url,
            "principal_name": getattr(tenant, "principal_name", "") or "",
            "accountant_name": getattr(tenant, "accountant_name", "") or "",
            "fiscal_year_bs": getattr(tenant, "fiscal_year_bs", "") or "",
            "currency": getattr(tenant, "currency_symbol", "Rs.") or "Rs.",
            "generated_on": timezone.now().strftime("%d %b %Y %H:%M"),
        }
        filename = f"bills_{timezone.now().strftime('%Y%m%d_%H%M')}.pdf"
        response = generate_pdf_response(
            "reports/student_bills_bulk.html", context, filename
        )
        if response:
            record_audit_event(
                action="billing.bulk_bills_exported",
                user=request.user,
                request=request,
                details={"count": len(bills)},
            )
            return response
        return Response(
            {"error": "Failed to generate bills"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=False, methods=["post"])
    def assign_bulk(self, request):
        """
        Assign a fee structure to all students in a class.
        Expects: fee_structure_id, academic_class_id, due_date
        """

        def _execute():
            fee_structure_id = request.data.get("fee_structure_id")
            academic_class_id = request.data.get("academic_class_id")
            due_date = request.data.get("due_date")

            if not all([fee_structure_id, academic_class_id, due_date]):
                return Response(
                    {
                        "error": "Missing required fields: fee_structure_id, academic_class_id, and due_date are required."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                from academic.models import Student

                tenant = getattr(request.user, "tenant", None)
                if not tenant:
                    return Response(
                        {"error": "User has no associated tenant"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                fee_structure = FeeStructure.objects.get(
                    fee_id=fee_structure_id, tenant=tenant
                )
                students = Student.objects.filter(
                    academic_class_id=academic_class_id, user__tenant=tenant
                )

                if not students.exists():
                    return Response(
                        {"error": "No students found in the selected class"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                with transaction.atomic():
                    created_count = 0
                    for student in students:
                        StudentFee.objects.create(
                            tenant=tenant,
                            student=student,
                            fee_structure=fee_structure,
                            amount_due=fee_structure.amount,
                            due_date=due_date,
                            status="pending",
                        )
                        created_count += 1
                record_audit_event(
                    action="billing.student_fee_bulk_assigned",
                    user=request.user,
                    request=request,
                    details={
                        "fee_structure_id": str(fee_structure_id),
                        "academic_class_id": str(academic_class_id),
                        "created_count": created_count,
                        "due_date": due_date,
                    },
                )

                return Response(
                    {
                        "message": f"Successfully assigned fee to {created_count} students"
                    },
                    status=status.HTTP_201_CREATED,
                )
            except FeeStructure.DoesNotExist:
                return Response(
                    {"error": "Fee structure not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            except Exception as exc:
                return Response(
                    {"error": f"Assignment failed: {str(exc)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return self._idempotent_execute(
            request,
            endpoint="billing.student_fees.assign_bulk",
            resource_type="student_fee_bulk",
            resource_id_field="message",
            execute=_execute,
        )


class PaymentViewSet(
    BillingIdempotencyMixin,
    BillingSchemaGuardMixin,
    TenantScopedQuerysetMixin,
    viewsets.ModelViewSet,
):
    require_tenant_schema = True
    allow_unscoped_for_saas = False
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsSchoolFinanceManager]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.select_related(
            "student__user", "recorded_by", "student_fee__fee_structure"
        )

    def create(self, request, *args, **kwargs):
        def _execute():
            return super(PaymentViewSet, self).create(request, *args, **kwargs)

        return self._idempotent_execute(
            request,
            endpoint="billing.payments.create",
            resource_type="payment",
            resource_id_field="payment_id",
            execute=_execute,
        )

    def perform_create(self, serializer):
        if not getattr(self.request.user, "tenant", None):
            raise PermissionDenied(
                "Authenticated user is not associated with a tenant."
            )

        from billing.bill_numbering import allocate_bill_number

        tenant = self.request.user.tenant
        bill_number = allocate_bill_number(tenant)

        payment = serializer.save(
            tenant=tenant,
            recorded_by=self.request.user,
            bill_number=bill_number,
        )
        fee_before = None
        if payment.student_fee:
            fee_before = {
                "student_fee_id": str(payment.student_fee.student_fee_id),
                "amount_paid": str(payment.student_fee.amount_paid),
                "status": payment.student_fee.status,
            }

        if payment.student_fee:
            student_fee = payment.student_fee
            student_fee.amount_paid += payment.amount

            if student_fee.amount_paid >= student_fee.amount_due:
                student_fee.status = "paid"
            elif student_fee.amount_paid > 0:
                student_fee.status = "partial"

            student_fee.save()

        record_audit_event(
            action="billing.payment_created",
            user=self.request.user,
            request=self.request,
            details={
                "payment_id": str(payment.payment_id),
                "student_id": str(payment.student_id),
                "student_fee_id": (
                    str(payment.student_fee_id) if payment.student_fee_id else None
                ),
                "amount": str(payment.amount),
                "method": payment.method,
                "transaction_id": payment.transaction_id,
                "student_fee_before": fee_before,
                "student_fee_after": (
                    {
                        "student_fee_id": str(payment.student_fee.student_fee_id),
                        "amount_paid": str(payment.student_fee.amount_paid),
                        "status": payment.student_fee.status,
                    }
                    if payment.student_fee
                    else None
                ),
            },
        )

    def perform_update(self, serializer):
        before = serializer.instance
        before_snapshot = {
            "amount": str(before.amount),
            "method": before.method,
            "transaction_id": before.transaction_id,
            "remarks": before.remarks,
        }
        payment = serializer.save()
        record_audit_event(
            action="billing.payment_updated",
            user=self.request.user,
            request=self.request,
            details={
                "payment_id": str(payment.payment_id),
                "student_id": str(payment.student_id),
                "student_fee_id": (
                    str(payment.student_fee_id) if payment.student_fee_id else None
                ),
                "before": before_snapshot,
                "after": {
                    "amount": str(payment.amount),
                    "method": payment.method,
                    "transaction_id": payment.transaction_id,
                    "remarks": payment.remarks,
                },
            },
        )

    def perform_destroy(self, instance):
        payload = {
            "payment_id": str(instance.payment_id),
            "student_id": str(instance.student_id),
            "student_fee_id": (
                str(instance.student_fee_id) if instance.student_fee_id else None
            ),
            "amount": str(instance.amount),
            "method": instance.method,
            "transaction_id": instance.transaction_id,
        }
        super().perform_destroy(instance)
        record_audit_event(
            action="billing.payment_deleted",
            user=self.request.user,
            request=self.request,
            details=payload,
        )

    @action(detail=True, methods=["get"])
    def generate_receipt(self, request, pk=None):
        from decimal import Decimal

        from billing_school.utils_bs_calendar import bs_date_display

        payment = self.get_object()
        student = payment.student
        student_fee = payment.student_fee
        fee_structure = student_fee.fee_structure if student_fee else None
        tenant = payment.tenant

        # Remaining balance for this student fee
        balance_due = "0.00"
        if student_fee:
            total_paid = student_fee.payments.aggregate(t=Sum("amount"))[
                "t"
            ] or Decimal("0")
            charged = Decimal(
                str(
                    getattr(student_fee, "amount_due", None)
                    or (fee_structure.amount if fee_structure else 0)
                )
            )
            remaining = charged - total_paid
            if remaining < 0:
                remaining = Decimal("0")
            balance_due = f"{remaining:.2f}"

        # Fee-head breakdown for the line items section (Phase C).
        fee_heads = []
        if fee_structure and hasattr(fee_structure, "heads"):
            try:
                for h in fee_structure.heads.all():
                    fee_heads.append(
                        {
                            "name": h.name,
                            "amount": f"{h.amount:.2f}",
                        }
                    )
            except Exception:
                fee_heads = []

        # Late fee surcharge (if accrued).
        late_fee = "0.00"
        if student_fee:
            late_fee = (
                f"{Decimal(str(getattr(student_fee, 'late_fee_applied', 0) or 0)):.2f}"
            )

        # Student name — Student.user is db_constraint=False so it can be None.
        try:
            student_name = (
                student.user.get_full_name() if student and student.user else ""
            )
        except Exception:
            student_name = ""

        # Amount in words (English) — IRD-style on every Nepali bill.
        try:
            from num2words import num2words

            amount_words = num2words(payment.amount, lang="en").title() + " Only"
        except Exception:
            amount_words = ""

        # Bikram Sambat date alongside AD date.
        try:
            payment_date_bs = bs_date_display(payment.payment_date.date())
        except Exception:
            payment_date_bs = ""

        currency_symbol = (getattr(tenant, "currency_symbol", "") or "Rs.").strip()
        logo_url = ""
        try:
            if tenant and tenant.logo:
                logo_url = tenant.logo.url
        except Exception:
            logo_url = ""

        context = {
            "school_name": tenant.name if tenant else "",
            "school_address": getattr(tenant, "address", "") or "",
            "school_phone": getattr(tenant, "contact_phone", "") or "",
            "school_email": getattr(tenant, "contact_email", "") or "",
            "school_pan": getattr(tenant, "pan_number", "") or "",
            "school_vat": getattr(tenant, "vat_number", "") or "",
            "school_logo": logo_url,
            "principal_name": getattr(tenant, "principal_name", "") or "",
            "accountant_name": getattr(tenant, "accountant_name", "") or "",
            "fiscal_year_bs": getattr(tenant, "fiscal_year_bs", "") or "",
            # Bill identity
            "bill_number": payment.bill_number or str(payment.payment_id)[:8].upper(),
            "receipt_number": payment.bill_number
            or str(payment.payment_id)[:8].upper(),
            # Customer (student / parent)
            "student_name": student_name,
            "student_id": str(getattr(student, "student_id", "") or ""),
            "class_name": (
                str(student.academic_class)
                if getattr(student, "academic_class", None)
                else ""
            ),
            # Payment
            "payment_date": payment.payment_date.strftime("%d %b %Y, %H:%M"),
            "payment_date_bs": payment_date_bs,
            "method": (payment.method or "").replace("_", " ").title(),
            "transaction_id": payment.transaction_id or "",
            "recorded_by": (
                payment.recorded_by.get_full_name() if payment.recorded_by else "Admin"
            ),
            # Line item
            "fee_title": fee_structure.name if fee_structure else "General Fee",
            "fee_period": (
                getattr(fee_structure, "frequency", "") if fee_structure else ""
            ),
            "fee_heads": fee_heads,  # head-wise breakdown (Phase C)
            "late_fee": late_fee,  # late surcharge (Phase C)
            # Amounts
            "amount": f"{payment.amount:.2f}",
            "amount_words": amount_words,
            "balance_due": balance_due,
            "currency": currency_symbol,
            "generated_on": timezone.now().strftime("%d %b %Y %H:%M"),
        }

        filename = f"receipt_{str(payment.payment_id)[:12]}.pdf"
        response = generate_pdf_response(
            "reports/payment_receipt.html", context, filename
        )

        record_audit_event(
            action="billing.payment_receipt_downloaded",
            user=request.user,
            request=request,
            details={
                "payment_id": str(payment.payment_id),
                "student_id": str(payment.student_id),
                "amount": str(payment.amount),
                "method": payment.method,
            },
        )

        if response:
            return response
        return Response(
            {"error": "Failed to generate receipt"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class ExpenseViewSet(
    BillingIdempotencyMixin,
    BillingSchemaGuardMixin,
    TenantScopedQuerysetMixin,
    viewsets.ModelViewSet,
):
    require_tenant_schema = True
    allow_unscoped_for_saas = False
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsSchoolFinanceManager]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.select_related("recorded_by").order_by("-date")

    def create(self, request, *args, **kwargs):
        def _execute():
            return super(ExpenseViewSet, self).create(request, *args, **kwargs)

        return self._idempotent_execute(
            request,
            endpoint="billing.expenses.create",
            resource_type="expense",
            resource_id_field="expense_id",
            execute=_execute,
        )

    def perform_create(self, serializer):
        expense = serializer.save(
            tenant=self.request.user.tenant,
            recorded_by=self.request.user,
        )
        record_audit_event(
            action="billing.expense_created",
            user=self.request.user,
            request=self.request,
            details={
                "expense_id": str(expense.expense_id),
                "title": expense.title,
                "amount": str(expense.amount),
                "category": expense.category,
                "date": expense.date,
            },
        )

    def perform_update(self, serializer):
        before = serializer.instance
        before_snapshot = {
            "title": before.title,
            "amount": str(before.amount),
            "category": before.category,
            "date": before.date,
            "description": before.description,
        }
        expense = serializer.save()
        record_audit_event(
            action="billing.expense_updated",
            user=self.request.user,
            request=self.request,
            details={
                "expense_id": str(expense.expense_id),
                "before": before_snapshot,
                "after": {
                    "title": expense.title,
                    "amount": str(expense.amount),
                    "category": expense.category,
                    "date": expense.date,
                    "description": expense.description,
                },
            },
        )

    def perform_destroy(self, instance):
        payload = {
            "expense_id": str(instance.expense_id),
            "title": instance.title,
            "amount": str(instance.amount),
            "category": instance.category,
            "date": instance.date,
        }
        super().perform_destroy(instance)
        record_audit_event(
            action="billing.expense_deleted",
            user=self.request.user,
            request=self.request,
            details=payload,
        )


class FinanceDashboardViewSet(BillingSchemaGuardMixin, viewsets.ViewSet):
    """
    Provides aggregate financial statistics
    """

    require_tenant_schema = True
    permission_classes = [IsSchoolFinanceManager]

    @method_decorator(cache_page(60 * 5))
    def list(self, request):
        user = request.user
        tenant = getattr(user, "tenant", None)
        if not tenant:
            tenant = getattr(request, "tenant", None)

        if not tenant:
            return Response(
                {
                    "total_revenue": 0.0,
                    "total_pending": 0.0,
                    "total_expenses": 0.0,
                    "net_balance": 0.0,
                    "recent_payments": [],
                    "recent_expenses": [],
                    "notice": "No school tenant identified for this session. Showing summary only.",
                }
            )

        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        payments_qs = Payment.objects.filter(tenant=tenant)
        expenses_qs = Expense.objects.filter(tenant=tenant)

        if start_date:
            payments_qs = payments_qs.filter(payment_date__date__gte=start_date)
            expenses_qs = expenses_qs.filter(date__gte=start_date)
        if end_date:
            payments_qs = payments_qs.filter(payment_date__date__lte=end_date)
            expenses_qs = expenses_qs.filter(date__lte=end_date)

        revenue_agg = payments_qs.aggregate(total=Sum("amount"))
        total_revenue = revenue_agg["total"] or 0

        pending_fees_qs = StudentFee.objects.filter(
            tenant=tenant,
            status__in=["pending", "partial", "overdue"],
        )
        if start_date:
            pending_fees_qs = pending_fees_qs.filter(due_date__gte=start_date)
        if end_date:
            pending_fees_qs = pending_fees_qs.filter(due_date__lte=end_date)

        total_due = pending_fees_qs.aggregate(total=Sum("amount_due"))["total"] or 0
        total_paid_against_pending = (
            pending_fees_qs.aggregate(total=Sum("amount_paid"))["total"] or 0
        )
        total_pending = max(0, total_due - total_paid_against_pending)

        expense_agg = expenses_qs.aggregate(total=Sum("amount"))
        total_expenses = expense_agg["total"] or 0

        recent_payments = (
            Payment.objects.filter(tenant=tenant)
            .select_related("student__user", "student_fee__fee_structure")
            .order_by("-payment_date")[:5]
        )
        recent_expenses = (
            Expense.objects.filter(tenant=tenant)
            .select_related("recorded_by")
            .order_by("-date")[:5]
        )

        return Response(
            {
                "total_revenue": float(total_revenue),
                "total_pending": float(total_pending),
                "total_expenses": float(total_expenses),
                "net_balance": float(total_revenue - total_expenses),
                "recent_payments": PaymentSerializer(recent_payments, many=True).data,
                "recent_expenses": ExpenseSerializer(recent_expenses, many=True).data,
            }
        )

    @action(detail=False, methods=["get"], url_path="analytics")
    def analytics(self, request):
        """
        Richer analytics for the finance dashboard:
        - monthly_collections: last 12 months of payment totals
        - expense_by_category: expenses grouped by category
        - fee_status_breakdown: count + amounts per status
        - collection_rate: % of total fees collected
        - top_defaulters: students with highest outstanding balances
        """
        user = request.user
        tenant = getattr(user, "tenant", None) or getattr(request, "tenant", None)
        if not tenant:
            return Response(
                {
                    "monthly_collections": [],
                    "expense_by_category": [],
                    "fee_status_breakdown": [],
                    "collection_rate": 0,
                    "top_defaulters": [],
                }
            )

        # ── Monthly collections (last 12 months) ────────────────────────────
        twelve_months_ago = date.today().replace(day=1) - timedelta(days=335)
        monthly_qs = (
            Payment.objects.filter(
                tenant=tenant, payment_date__date__gte=twelve_months_ago
            )
            .annotate(month=TruncMonth("payment_date"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("month")
        )
        monthly_collections = [
            {
                "month": item["month"].strftime("%Y-%m"),
                "label": item["month"].strftime("%b %Y"),
                "total": float(item["total"] or 0),
            }
            for item in monthly_qs
        ]

        # ── Expense by category ──────────────────────────────────────────────
        expense_cats = (
            Expense.objects.filter(tenant=tenant)
            .values("category")
            .annotate(total=Sum("amount"), count=Count("expense_id"))
            .order_by("-total")
        )
        expense_by_category = [
            {
                "category": item["category"],
                "total": float(item["total"] or 0),
                "count": item["count"],
            }
            for item in expense_cats
        ]

        # ── Fee status breakdown ─────────────────────────────────────────────
        status_qs = (
            StudentFee.objects.filter(tenant=tenant)
            .values("status")
            .annotate(
                count=Count("student_fee_id"),
                total_due=Sum("amount_due"),
                total_paid=Sum("amount_paid"),
            )
        )
        fee_status_breakdown = [
            {
                "status": item["status"],
                "count": item["count"],
                "total_due": float(item["total_due"] or 0),
                "total_paid": float(item["total_paid"] or 0),
            }
            for item in status_qs
        ]

        # ── Collection rate ──────────────────────────────────────────────────
        all_fees = StudentFee.objects.filter(tenant=tenant).aggregate(
            total_due=Sum("amount_due"),
            total_paid=Sum("amount_paid"),
        )
        total_due_all = float(all_fees["total_due"] or 0)
        total_paid_all = float(all_fees["total_paid"] or 0)
        collection_rate = (
            round((total_paid_all / total_due_all * 100), 1)
            if total_due_all > 0
            else 0.0
        )

        # ── Top defaulters ───────────────────────────────────────────────────
        from academic.models import Student

        defaulter_fees = (
            StudentFee.objects.filter(
                tenant=tenant, status__in=["pending", "partial", "overdue"]
            )
            .values("student_id")
            .annotate(
                outstanding=Sum("amount_due") - Sum("amount_paid"),
                fee_count=Count("student_fee_id"),
            )
            .filter(outstanding__gt=0)
            .order_by("-outstanding")[:10]
        )
        student_ids = [d["student_id"] for d in defaulter_fees]
        students_map = {
            str(s.student_id): s.user.get_full_name()
            for s in Student.objects.filter(student_id__in=student_ids).select_related(
                "user"
            )
        }
        top_defaulters = [
            {
                "student_id": str(d["student_id"]),
                "student_name": students_map.get(str(d["student_id"]), "Unknown"),
                "outstanding": float(d["outstanding"] or 0),
                "fee_count": d["fee_count"],
            }
            for d in defaulter_fees
        ]

        return Response(
            {
                "monthly_collections": monthly_collections,
                "expense_by_category": expense_by_category,
                "fee_status_breakdown": fee_status_breakdown,
                "collection_rate": collection_rate,
                "top_defaulters": top_defaulters,
            }
        )


__all__ = [
    "FeeStructureViewSet",
    "StudentFeeViewSet",
    "PaymentViewSet",
    "ExpenseViewSet",
    "FinanceDashboardViewSet",
]
