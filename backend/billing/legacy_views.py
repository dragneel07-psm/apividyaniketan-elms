# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from __future__ import annotations

from billing_saas.views import InvoiceViewSet as SaaSInvoiceViewSet
from billing_saas.views import (
    SubscriptionPlanHistoryViewSet as SaaSSubscriptionPlanHistoryViewSet,
)
from billing_saas.views import SubscriptionPlanViewSet as SaaSSubscriptionPlanViewSet
from billing_saas.views import SubscriptionViewSet as SaaSSubscriptionViewSet
from billing_school.views import ExpenseViewSet as SchoolExpenseViewSet
from billing_school.views import FeeStructureViewSet as SchoolFeeStructureViewSet
from billing_school.views import (
    FinanceDashboardViewSet as SchoolFinanceDashboardViewSet,
)
from billing_school.views import PaymentViewSet as SchoolPaymentViewSet
from billing_school.views import StudentFeeViewSet as SchoolStudentFeeViewSet
from billing_school.views_reports import (
    BillingReportViewSet as SchoolBillingReportViewSet,
)

from .legacy import LegacyBillingDeprecationMixin


class SubscriptionViewSet(LegacyBillingDeprecationMixin, SaaSSubscriptionViewSet):
    pass


class SubscriptionPlanViewSet(
    LegacyBillingDeprecationMixin, SaaSSubscriptionPlanViewSet
):
    pass


class SubscriptionPlanHistoryViewSet(
    LegacyBillingDeprecationMixin, SaaSSubscriptionPlanHistoryViewSet
):
    pass


class InvoiceViewSet(LegacyBillingDeprecationMixin, SaaSInvoiceViewSet):
    pass


class FeeStructureViewSet(LegacyBillingDeprecationMixin, SchoolFeeStructureViewSet):
    pass


class StudentFeeViewSet(LegacyBillingDeprecationMixin, SchoolStudentFeeViewSet):
    pass


class PaymentViewSet(LegacyBillingDeprecationMixin, SchoolPaymentViewSet):
    pass


class ExpenseViewSet(LegacyBillingDeprecationMixin, SchoolExpenseViewSet):
    pass


class FinanceDashboardViewSet(
    LegacyBillingDeprecationMixin, SchoolFinanceDashboardViewSet
):
    pass


class BillingReportViewSet(LegacyBillingDeprecationMixin, SchoolBillingReportViewSet):
    pass
