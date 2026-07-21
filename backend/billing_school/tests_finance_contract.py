from decimal import Decimal

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from billing.models_school import StudentFee
from billing.permissions import IsSchoolFinanceManager
from billing.serializers import ExpenseSerializer, FeeStructureSerializer, PaymentSerializer
from billing_school.urls import urlpatterns
from billing_school.views_discount import FeeDiscountSerializer, FeeDiscountViewSet
from billing_school.views_ledger import LedgerAccountViewSet, LedgerEntryViewSet


class FinanceValidationContractTests(SimpleTestCase):
    def test_fee_and_expense_amounts_must_be_positive(self):
        with self.assertRaises(ValidationError):
            FeeStructureSerializer().validate_amount(Decimal("0"))
        with self.assertRaises(ValidationError):
            ExpenseSerializer().validate_amount(Decimal("-1"))

    def test_percentage_late_fee_cannot_exceed_one_hundred(self):
        serializer = FeeStructureSerializer()
        with self.assertRaises(ValidationError):
            serializer.validate(
                {
                    "late_fee_type": "percent",
                    "late_fee_amount": Decimal("101"),
                }
            )

    def test_payment_rejects_zero_and_overpayment(self):
        serializer = PaymentSerializer()
        with self.assertRaises(ValidationError):
            serializer.validate({"amount": Decimal("0")})

        fee = StudentFee(amount_due=Decimal("100"), amount_paid=Decimal("40"))
        with self.assertRaises(ValidationError):
            serializer.validate(
                {"student_fee": fee, "amount": Decimal("60.01")}
            )

    def test_discount_validation_and_scholarship_fields(self):
        serializer = FeeDiscountSerializer()
        self.assertIn("scholarship_category", serializer.fields)
        self.assertIn("scholarship_source", serializer.fields)
        with self.assertRaises(ValidationError):
            serializer.validate(
                {"discount_type": "percentage", "value": Decimal("101")}
            )


class FinanceAuthorizationAndRouteContractTests(SimpleTestCase):
    def test_finance_only_viewsets_use_finance_permission(self):
        for viewset in (FeeDiscountViewSet, LedgerAccountViewSet, LedgerEntryViewSet):
            self.assertIn(IsSchoolFinanceManager, viewset.permission_classes)

    def test_every_frontend_finance_action_has_a_router_path(self):
        router = urlpatterns[0]
        patterns = "\n".join(str(pattern.pattern) for pattern in router.url_patterns)
        expected_fragments = (
            "dashboard/analytics",
            "student-fees/assign_bulk",
            "student-fees/bulk-assign-multi",
            "student-fees/bulk-bills-pdf",
            "student-fees/(?P<pk>[^/.]+)/generate-bill",
            "payments/(?P<pk>[^/.]+)/generate_receipt",
            "reports/day-book",
            "reports/cash-book",
            "reports/bank-book",
            "reports/student-ledger",
            "reports/aging",
            "reports/trial-balance",
            "reports/scholarship-register",
            "nas/chart-of-accounts/seed-defaults",
            "nas/tds/summary",
            "nas/inventory/depreciation-schedule",
        )
        for fragment in expected_fragments:
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, patterns)

