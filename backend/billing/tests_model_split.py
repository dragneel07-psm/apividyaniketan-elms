# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.test import SimpleTestCase

from billing.models import (
    BillingIdempotencyKey,
    Expense,
    FeeStructure,
    Invoice,
    Payment,
    SchemaScopedBillingModel,
    StudentFee,
    Subscription,
    SubscriptionPlan,
    SubscriptionPlanHistory,
)


class BillingModelSplitTests(SimpleTestCase):
    def test_compat_exports_resolve_expected_models(self):
        self.assertEqual(SubscriptionPlan.__name__, "SubscriptionPlan")
        self.assertEqual(Subscription.__name__, "Subscription")
        self.assertEqual(SubscriptionPlanHistory.__name__, "SubscriptionPlanHistory")
        self.assertEqual(Invoice.__name__, "Invoice")
        self.assertEqual(FeeStructure.__name__, "FeeStructure")
        self.assertEqual(StudentFee.__name__, "StudentFee")
        self.assertEqual(Payment.__name__, "Payment")
        self.assertEqual(Expense.__name__, "Expense")
        self.assertEqual(BillingIdempotencyKey.__name__, "BillingIdempotencyKey")

    def test_schema_scope_contracts(self):
        self.assertTrue(issubclass(SubscriptionPlan, SchemaScopedBillingModel))
        self.assertTrue(issubclass(Subscription, SchemaScopedBillingModel))
        self.assertTrue(issubclass(SubscriptionPlanHistory, SchemaScopedBillingModel))
        self.assertTrue(issubclass(Invoice, SchemaScopedBillingModel))
        self.assertTrue(issubclass(FeeStructure, SchemaScopedBillingModel))
        self.assertTrue(issubclass(StudentFee, SchemaScopedBillingModel))
        self.assertTrue(issubclass(Payment, SchemaScopedBillingModel))
        self.assertTrue(issubclass(Expense, SchemaScopedBillingModel))
        self.assertTrue(issubclass(BillingIdempotencyKey, SchemaScopedBillingModel))

        self.assertEqual(SubscriptionPlan.SCHEMA_SCOPE, "public")
        self.assertEqual(Subscription.SCHEMA_SCOPE, "public")
        self.assertEqual(SubscriptionPlanHistory.SCHEMA_SCOPE, "public")
        self.assertEqual(Invoice.SCHEMA_SCOPE, "public")

        self.assertEqual(FeeStructure.SCHEMA_SCOPE, "tenant")
        self.assertEqual(StudentFee.SCHEMA_SCOPE, "tenant")
        self.assertEqual(Payment.SCHEMA_SCOPE, "tenant")
        self.assertEqual(Expense.SCHEMA_SCOPE, "tenant")
        self.assertEqual(BillingIdempotencyKey.SCHEMA_SCOPE, "tenant")
