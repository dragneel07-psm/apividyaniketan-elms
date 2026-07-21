from decimal import Decimal
from types import SimpleNamespace

from django.test import SimpleTestCase

from .payroll_nepal import annual_progressive_tax, calculate_monthly_payroll


class NepalPayrollCalculationTests(SimpleTestCase):
    def employee(self, **overrides):
        values = {
            "basic_salary": Decimal("50000"),
            "social_security_scheme": "pf",
            "marital_status": "single",
            "recurring_cit_monthly": Decimal("0"),
            "insurance_monthly": Decimal("0"),
        }
        values.update(overrides)
        return SimpleNamespace(**values)

    def test_pf_employee_and_employer_are_each_ten_percent(self):
        result = calculate_monthly_payroll(self.employee())
        self.assertEqual(result["pf_employee"], Decimal("5000.00"))
        self.assertEqual(result["pf_employer"], Decimal("5000.00"))
        self.assertEqual(result["ssf_employee"], Decimal("0"))

    def test_ssf_employee_and_employer_rates_and_first_slab_relief(self):
        result = calculate_monthly_payroll(
            self.employee(social_security_scheme="ssf")
        )
        self.assertEqual(result["ssf_employee"], Decimal("5500.00"))
        self.assertEqual(result["ssf_employer"], Decimal("10000.00"))
        self.assertEqual(result["annual_tax_liability"], Decimal("3400.00"))

    def test_cit_and_insurance_are_recorded_and_reduce_taxable_income(self):
        result = calculate_monthly_payroll(
            self.employee(
                recurring_cit_monthly=Decimal("2000"),
                insurance_monthly=Decimal("1000"),
            )
        )
        self.assertEqual(result["cit_deduction"], Decimal("2000.00"))
        self.assertEqual(result["insurance_deduction"], Decimal("1000.00"))
        self.assertEqual(result["taxable_income_annual"], Decimal("504000.00"))

    def test_progressive_tax_includes_top_rate(self):
        tax = annual_progressive_tax(Decimal("6000000"), "single")
        self.assertEqual(tax, Decimal("1855000.00"))

    def test_couple_first_band_is_six_hundred_thousand(self):
        self.assertEqual(
            annual_progressive_tax(Decimal("600000"), "couple"),
            Decimal("6000.00"),
        )
