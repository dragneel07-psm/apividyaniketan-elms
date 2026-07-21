"""Configurable Nepal payroll calculations.

Defaults represent common FY 2082/83 payroll practice. Rates are captured in
each slip's calculation_snapshot so later regulatory changes never rewrite
historical payroll. Schools should confirm fiscal-year settings with their tax
adviser before finalization.
"""
from decimal import Decimal, ROUND_HALF_UP


MONEY = Decimal("0.01")
DEFAULT_RULES = {
    "fiscal_year_bs": "2082/83",
    "pf_employee_rate": "0.10",
    "pf_employer_rate": "0.10",
    "ssf_employee_rate": "0.11",
    "ssf_employer_rate": "0.20",
    "single_slabs": [["500000", "0.01"], ["200000", "0.10"], ["300000", "0.20"], ["1000000", "0.30"], ["3000000", "0.36"], [None, "0.39"]],
    "couple_slabs": [["600000", "0.01"], ["200000", "0.10"], ["300000", "0.20"], ["900000", "0.30"], ["3000000", "0.36"], [None, "0.39"]],
    "ssf_first_slab_exempt": True,
}


def _money(value):
    return Decimal(str(value or 0)).quantize(MONEY, rounding=ROUND_HALF_UP)


def annual_progressive_tax(taxable_income, marital_status="single", *, ssf_member=False, rules=None):
    rules = rules or DEFAULT_RULES
    remaining = max(Decimal("0"), _money(taxable_income))
    tax = Decimal("0")
    slabs = rules["couple_slabs" if marital_status == "couple" else "single_slabs"]
    for index, (width, rate) in enumerate(slabs):
        portion = remaining if width is None else min(remaining, Decimal(width))
        effective_rate = Decimal(rate)
        if index == 0 and ssf_member and rules.get("ssf_first_slab_exempt"):
            effective_rate = Decimal("0")
        tax += portion * effective_rate
        remaining -= portion
        if remaining <= 0:
            break
    return _money(tax)


def calculate_monthly_payroll(employee, *, rules=None):
    rules = dict(DEFAULT_RULES if rules is None else rules)
    basic = _money(employee.basic_salary)
    scheme = employee.social_security_scheme
    pf_employee = _money(basic * Decimal(rules["pf_employee_rate"])) if scheme == "pf" else Decimal("0")
    pf_employer = _money(basic * Decimal(rules["pf_employer_rate"])) if scheme == "pf" else Decimal("0")
    ssf_employee = _money(basic * Decimal(rules["ssf_employee_rate"])) if scheme == "ssf" else Decimal("0")
    ssf_employer = _money(basic * Decimal(rules["ssf_employer_rate"])) if scheme == "ssf" else Decimal("0")
    cit_monthly = _money(getattr(employee, "recurring_cit_monthly", 0))
    insurance_monthly = _money(getattr(employee, "insurance_monthly", 0))
    annual_gross = basic * 12
    annual_retirement = (pf_employee + ssf_employee + cit_monthly) * 12
    taxable = max(Decimal("0"), annual_gross - annual_retirement - insurance_monthly * 12)
    annual_tax = annual_progressive_tax(
        taxable, employee.marital_status, ssf_member=scheme == "ssf", rules=rules
    )
    return {
        "basic_salary": basic,
        "pf_employee": pf_employee,
        "pf_employer": pf_employer,
        "ssf_employee": ssf_employee,
        "ssf_employer": ssf_employer,
        "cit_deduction": cit_monthly,
        "insurance_deduction": insurance_monthly,
        "taxable_income_annual": _money(taxable),
        "annual_tax_liability": annual_tax,
        "tds": _money(annual_tax / 12),
        "fiscal_year_bs": rules["fiscal_year_bs"],
        "calculation_snapshot": rules,
    }
