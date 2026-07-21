# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
TDS (Tax Deducted at Source) calculation utilities for Nepal.

Rates as per Income Tax Act 2058 and IRD Nepal guidelines.
Schools/NGOs acting as withholding agents must deduct TDS before payment.
"""

from decimal import ROUND_HALF_UP, Decimal

# -------------------------------------------------------------------
# TDS rates and thresholds per payment type (Nepal IRD)
# -------------------------------------------------------------------
TDS_RULES: dict[str, dict] = {
    "vendor_supply": {
        "rate": Decimal("1.5"),  # 1.5% on supply contracts
        "threshold": Decimal("50000"),  # NPR 50,000 per fiscal year per vendor
        "description": "Supply Contract (≤50L)",
        "section": "Section 88(1)",
    },
    "vendor_contract": {
        "rate": Decimal("1.5"),
        "threshold": Decimal("50000"),
        "description": "Service/Works Contract",
        "section": "Section 88(1)",
    },
    "rent": {
        "rate": Decimal("10.0"),
        "threshold": Decimal("0"),  # TDS from first paisa
        "description": "Rent / Building Lease",
        "section": "Section 88(3)",
    },
    "professional_fee": {
        "rate": Decimal("15.0"),
        "threshold": Decimal("0"),
        "description": "Professional / Consultancy Fee",
        "section": "Section 88(2)",
    },
    "commission": {
        "rate": Decimal("15.0"),
        "threshold": Decimal("0"),
        "description": "Commission",
        "section": "Section 88(2)",
    },
    "interest": {
        "rate": Decimal("15.0"),
        "threshold": Decimal("0"),
        "description": "Interest Income",
        "section": "Section 88(4)",
    },
    "dividend": {
        "rate": Decimal("5.0"),
        "threshold": Decimal("0"),
        "description": "Dividend",
        "section": "Section 88(5)",
    },
    "salary": {
        "rate": None,  # Slab-based; handled separately
        "threshold": Decimal("500000"),  # Annual basic exemption NPR 5L
        "description": "Salary (Slab)",
        "section": "Section 87",
    },
}

# Payroll income tax slabs (Individual, FY 2081/82)
# Annual taxable income in NPR → rate
SALARY_SLABS: list[tuple[Decimal, Decimal]] = [
    (Decimal("500000"), Decimal("1.0")),  # Up to 5L: 1%
    (Decimal("200000"), Decimal("10.0")),  # 5L–7L: 10%
    (Decimal("300000"), Decimal("20.0")),  # 7L–10L: 20%
    (Decimal("1000000"), Decimal("30.0")),  # 10L–20L: 30%
    (Decimal("Inf"), Decimal("36.0")),  # Above 20L: 36%
]


def calculate_tds(
    gross_amount: Decimal,
    payment_type: str,
    prior_payments_fy: Decimal = Decimal("0"),
) -> dict:
    """
    Calculate TDS for a given payment amount and type.

    Args:
        gross_amount:      Current payment amount.
        payment_type:      Payment category (must be a key in TDS_RULES).
        prior_payments_fy: Total payments already made to this vendor in the current
                           fiscal year (same payment_type).  Used to evaluate the
                           cumulative threshold correctly — e.g. vendor_supply threshold
                           is NPR 50,000 *per fiscal year per vendor*, not per transaction
                           (C4 fix).

    Returns:
        {
          'applicable': bool,
          'rate': Decimal or None,
          'tds_amount': Decimal,
          'net_amount': Decimal,
          'section': str,
          'description': str,
        }
    """
    gross = Decimal(str(gross_amount))
    prior = Decimal(str(prior_payments_fy))
    rules = TDS_RULES.get(payment_type)
    if not rules:
        return {
            "applicable": False,
            "rate": Decimal("0"),
            "tds_amount": Decimal("0"),
            "net_amount": gross,
            "section": "",
            "description": "Payment type not mapped to TDS rules.",
        }

    if rules["rate"] is None:
        # Salary — use slab (monthly basis: divide by 12)
        tds_annual = _salary_tds_annual(gross * 12)
        tds_amount = (tds_annual / 12).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        applicable = tds_amount > 0
        return {
            "applicable": applicable,
            "rate": None,
            "tds_amount": tds_amount,
            "net_amount": (gross - tds_amount).quantize(Decimal("0.01")),
            "section": rules["section"],
            "description": rules["description"],
        }

    threshold = rules["threshold"]
    cumulative = prior + gross

    if threshold > 0 and cumulative <= threshold:
        return {
            "applicable": False,
            "rate": rules["rate"],
            "tds_amount": Decimal("0"),
            "net_amount": gross,
            "section": rules["section"],
            "description": (
                f"{rules['description']} — cumulative NPR {cumulative:,.0f} "
                f"below threshold NPR {threshold:,.0f}"
            ),
        }

    # If the current payment crosses the threshold, only the portion above the
    # threshold that hasn't been previously accounted for is taxable.
    if threshold > 0 and prior < threshold:
        # Only the amount above threshold is newly taxable in this payment
        taxable = cumulative - threshold
    else:
        taxable = gross

    rate = rules["rate"] / 100
    tds_amount = (taxable * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return {
        "applicable": True,
        "rate": rules["rate"],
        "tds_amount": tds_amount,
        "net_amount": (gross - tds_amount).quantize(Decimal("0.01")),
        "section": rules["section"],
        "description": rules["description"],
    }


def _salary_tds_annual(annual_taxable: Decimal) -> Decimal:
    """Compute annual income tax using Nepal salary slabs."""
    tax = Decimal("0")
    remaining = annual_taxable
    for slab_limit, rate in SALARY_SLABS:
        if remaining <= 0:
            break
        taxable_in_slab = (
            min(remaining, slab_limit) if slab_limit != Decimal("Inf") else remaining
        )
        tax += taxable_in_slab * (rate / 100)
        remaining -= taxable_in_slab
    return tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def msf_rate_for_gateway(gateway: str) -> Decimal:
    """
    Standard Merchant Service Fee (MSF) rates for Nepali payment gateways.
    These are indicative; actual rates are in merchant agreements.
    """
    rates = {
        "esewa": Decimal("1.5"),  # 1.5% typical eSewa MSF
        "khalti": Decimal("2.0"),  # 2.0% typical Khalti MSF
        "connectips": Decimal("0.5"),  # 0.5% ConnectIPS (bank-to-bank)
    }
    return rates.get(gateway.lower(), Decimal("2.0"))


def calculate_msf(gross_amount: Decimal, gateway: str) -> dict:
    """Calculate merchant service fee for a gateway payment."""
    rate = msf_rate_for_gateway(gateway)
    msf = (Decimal(str(gross_amount)) * rate / 100).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    net = Decimal(str(gross_amount)) - msf
    return {
        "gateway": gateway,
        "gross_amount": Decimal(str(gross_amount)),
        "msf_rate": rate,
        "msf_amount": msf,
        "net_amount": net,
    }
