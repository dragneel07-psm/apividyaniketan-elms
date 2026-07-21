# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""Views for eSewa and Khalti payment gateway initiation and callbacks."""

import logging
import uuid as uuid_lib
from decimal import Decimal, InvalidOperation

from django.db import connection, transaction
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.models_school import Payment, StudentFee
from billing_school.payment_gateways import EsewaGateway, KhaltiGateway

logger = logging.getLogger(__name__)


def _ensure_tenant_schema() -> bool:
    """Reject gateway callbacks that resolved to the public schema."""
    schema_name = (
        str(getattr(connection, "schema_name", "public") or "public").strip().lower()
    )
    return schema_name != "public"


def _resolve_fee_by_pid_prefix(oid: str):
    """Resolve a StudentFee from an eSewa pid of form ``sf_{hex16}_{random}``.

    Initiation truncates the UUID to 16 hex chars, so a UUID range query
    (PK index scan) is used to find the fee. Returns None if the pid is
    malformed or does not resolve to exactly one fee in this tenant schema.
    """
    parts = (oid or "").split("_")
    if len(parts) < 2 or len(parts[1]) < 16:
        logger.warning("Malformed payment order id: %s", oid)
        return None
    prefix = parts[1][:16].lower()
    try:
        lo = uuid_lib.UUID(prefix + "0" * 16)
        hi = uuid_lib.UUID(prefix + "f" * 16)
    except ValueError:
        logger.warning("Non-hex payment order id prefix: %s", oid)
        return None
    candidates = list(
        StudentFee.objects.filter(student_fee_id__gte=lo, student_fee_id__lte=hi)[:2]
    )
    if len(candidates) != 1:
        logger.warning(
            "Payment callback could not uniquely resolve fee for oid=%s (matches=%d)",
            oid,
            len(candidates),
        )
        return None
    return candidates[0]


def _record_payment(fee, amount, method, gateway_ref, request):
    """Create a Payment record and update StudentFee status.

    Idempotent on (student_fee, method, transaction_id): a duplicate gateway
    callback returns the original Payment instead of double-crediting the fee.
    Uses select_for_update so concurrent callbacks cannot race on amount_paid.
    """
    recorded_by = request.user if request.user.is_authenticated else None

    with transaction.atomic():
        locked_fee = StudentFee.objects.select_for_update().get(pk=fee.pk)

        existing = Payment.objects.filter(
            student_fee=locked_fee,
            method=method,
            transaction_id=gateway_ref,
        ).first()
        if existing is not None:
            return existing

        payment = Payment.objects.create(
            tenant=locked_fee.tenant,
            student=locked_fee.student,
            student_fee=locked_fee,
            amount=amount,
            method=method,
            transaction_id=gateway_ref,
            recorded_by=recorded_by,
            remarks=f"Online payment via {method.upper()}",
        )
        locked_fee.amount_paid = (locked_fee.amount_paid or Decimal("0")) + Decimal(
            str(amount)
        )
        if locked_fee.amount_paid >= locked_fee.amount_due:
            locked_fee.status = "paid"
        else:
            locked_fee.status = "partial"
        locked_fee.save(update_fields=["amount_paid", "status", "updated_at"])
        return payment


class EsewaInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        fee_id = request.data.get("student_fee_id")
        if not fee_id:
            return Response({"error": "student_fee_id is required."}, status=400)
        try:
            fee = StudentFee.objects.get(pk=fee_id, tenant=request.user.tenant)
        except StudentFee.DoesNotExist:
            return Response({"error": "Fee not found."}, status=404)

        balance = float(fee.amount_due - (fee.amount_paid or 0))
        if balance <= 0:
            return Response({"error": "No outstanding balance."}, status=400)

        frontend_url = request.headers.get("Origin", "http://localhost:3000")
        fields = EsewaGateway.build_form_fields(
            student_fee_id=str(fee_id),
            amount=balance,
            success_url=f"{frontend_url}/student/fees/payment-result?status=success&gateway=esewa",
            failure_url=f"{frontend_url}/student/fees/payment-result?status=failed&gateway=esewa",
        )
        return Response(fields)


class EsewaCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not _ensure_tenant_schema():
            return Response({"error": "Tenant context required."}, status=400)

        oid = request.query_params.get("oid", "")
        amt = request.query_params.get("amt", "")
        ref_id = request.query_params.get("refId", "")

        if not all([oid, amt, ref_id]):
            return Response({"error": "Missing parameters."}, status=400)

        try:
            amount = Decimal(amt)
        except (InvalidOperation, TypeError, ValueError):
            return Response({"error": "Invalid amount."}, status=400)
        if amount <= 0:
            return Response({"error": "Invalid amount."}, status=400)

        fee = _resolve_fee_by_pid_prefix(oid)
        if fee is None:
            return Response({"error": "Fee not found."}, status=404)

        if not EsewaGateway.verify_payment(oid, amt, ref_id):
            return Response({"error": "Payment verification failed."}, status=400)

        payment = _record_payment(fee, amount, "esewa", ref_id, request)
        return Response({"status": "success", "payment_id": str(payment.pk)})


class KhaltiInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        fee_id = request.data.get("student_fee_id")
        if not fee_id:
            return Response({"error": "student_fee_id is required."}, status=400)
        try:
            fee = StudentFee.objects.get(pk=fee_id, tenant=request.user.tenant)
        except StudentFee.DoesNotExist:
            return Response({"error": "Fee not found."}, status=404)

        balance = float(fee.amount_due - (fee.amount_paid or 0))
        if balance <= 0:
            return Response({"error": "No outstanding balance."}, status=400)

        frontend_url = request.headers.get("Origin", "http://localhost:3000")
        return_url = f"{frontend_url}/student/fees/payment-result?gateway=khalti"
        fee_name = (
            getattr(fee.fee_structure, "name", "School Fee")
            if hasattr(fee, "fee_structure")
            else "School Fee"
        )
        user = request.user
        customer_name = f"{user.first_name} {user.last_name}".strip() or "Student"

        try:
            result = KhaltiGateway.initiate(
                amount_paisa=int(balance * 100),
                purchase_order_id=str(fee_id),
                return_url=return_url,
                purchase_order_name=fee_name,
                customer_name=customer_name,
                customer_phone=getattr(user, "phone_number", ""),
            )
        except Exception as exc:
            logger.error("Khalti initiation error: %s", exc)
            return Response({"error": "Payment initiation failed."}, status=500)

        return Response(
            {
                "pidx": result.get("pidx"),
                "payment_url": result.get("payment_url"),
                "expires_at": result.get("expires_at"),
            }
        )


class KhaltiCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not _ensure_tenant_schema():
            return Response({"error": "Tenant context required."}, status=400)

        pidx = request.query_params.get("pidx")
        if not pidx:
            return Response({"error": "pidx required."}, status=400)

        try:
            result = KhaltiGateway.verify(pidx)
        except Exception as exc:
            logger.error("Khalti verification error: %s", exc)
            return Response({"error": "Verification failed."}, status=400)

        if result.get("status") != "Completed":
            return Response(
                {"error": f"Payment not completed. Status: {result.get('status')}"},
                status=400,
            )

        purchase_order_id = result.get("purchase_order_id") or ""
        try:
            fee_uuid = uuid_lib.UUID(str(purchase_order_id))
        except (ValueError, TypeError):
            logger.warning("Invalid Khalti purchase_order_id: %s", purchase_order_id)
            return Response({"error": "Invalid order id."}, status=400)

        try:
            amount_npr = Decimal(str(result.get("total_amount", 0))) / Decimal(100)
        except (InvalidOperation, TypeError, ValueError):
            return Response({"error": "Invalid amount."}, status=400)
        if amount_npr <= 0:
            return Response({"error": "Invalid amount."}, status=400)

        try:
            fee = StudentFee.objects.get(pk=fee_uuid)
        except StudentFee.DoesNotExist:
            return Response({"error": "Fee not found."}, status=404)

        payment = _record_payment(fee, amount_npr, "khalti", pidx, request)
        return Response({"status": "success", "payment_id": str(payment.pk)})
