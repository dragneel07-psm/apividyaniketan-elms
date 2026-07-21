# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Bikram Sambat (BS) ↔ Gregorian (AD) calendar conversion utility.

Reference point: BS 2000 Baisakh 1 = AD 1943 April 13.
Lookup table covers BS 2060–2095 (AD 2003–2038).
"""

from datetime import date, timedelta

# -------------------------------------------------------------------
# Monthly day counts per BS year (12 months: Baisakh–Chaitra)
# Source: Nepal Government calendar data
# -------------------------------------------------------------------
_BS_MONTH_DAYS: dict[int, list[int]] = {
    2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2061: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2062: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30],
    2063: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2064: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2065: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2066: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2067: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2068: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
    2069: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2070: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2071: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2072: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2073: [31, 31, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
    2074: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2075: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
    2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2078: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
    2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2080: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2083: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2084: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2085: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 29, 31],
    2088: [30, 31, 32, 32, 30, 31, 30, 29, 30, 29, 30, 30],
    2089: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2090: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2091: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2092: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2093: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2094: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2095: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
}

# AD date corresponding to BS 2060 Baisakh 1 = AD 2003 April 14
_EPOCH_BS_YEAR = 2060
_EPOCH_BS_MONTH = 1
_EPOCH_BS_DAY = 1
_EPOCH_AD = date(2003, 4, 14)

# Nepali month names
BS_MONTH_NAMES_EN = [
    "",
    "Baisakh",
    "Jestha",
    "Ashadh",
    "Shrawan",
    "Bhadra",
    "Ashwin",
    "Kartik",
    "Mangsir",
    "Poush",
    "Magh",
    "Falgun",
    "Chaitra",
]
BS_MONTH_NAMES_NP = [
    "",
    "बैशाख",
    "जेठ",
    "असार",
    "साउन",
    "भदौ",
    "असोज",
    "कार्तिक",
    "मंसिर",
    "पुस",
    "माघ",
    "फागुन",
    "चैत",
]


def _days_from_epoch_bs(year_bs: int, month_bs: int, day_bs: int) -> int:
    """Count days from BS epoch to given BS date."""
    total = 0
    for y in range(_EPOCH_BS_YEAR, year_bs):
        if y not in _BS_MONTH_DAYS:
            raise ValueError(f"BS year {y} not in lookup table (supported: 2060–2095).")
        total += sum(_BS_MONTH_DAYS[y])
    months = _BS_MONTH_DAYS[year_bs]
    for m in range(0, month_bs - 1):
        total += months[m]
    total += day_bs - 1
    return total


def bs_to_ad(year_bs: int, month_bs: int, day_bs: int) -> date:
    """Convert a BS date to a Gregorian date."""
    if year_bs not in _BS_MONTH_DAYS:
        raise ValueError(
            f"BS year {year_bs} not supported. Supported range: 2060–2095."
        )
    if not (1 <= month_bs <= 12):
        raise ValueError(f"Invalid BS month: {month_bs}")
    days_in_month = _BS_MONTH_DAYS[year_bs][month_bs - 1]
    if not (1 <= day_bs <= days_in_month):
        raise ValueError(
            f"Invalid BS day {day_bs} for month {month_bs} of year {year_bs}."
        )
    delta = _days_from_epoch_bs(year_bs, month_bs, day_bs)
    return _EPOCH_AD + timedelta(days=delta)


def ad_to_bs(ad_date: date) -> tuple[int, int, int]:
    """Convert a Gregorian date to (year_bs, month_bs, day_bs)."""
    delta = (ad_date - _EPOCH_AD).days
    if delta < 0:
        raise ValueError(
            f"Date {ad_date} is before the supported BS epoch (2003-04-14)."
        )

    year_bs = _EPOCH_BS_YEAR
    while True:
        if year_bs not in _BS_MONTH_DAYS:
            raise ValueError(
                f"BS year {year_bs} not in lookup table. Date {ad_date} is out of range."
            )
        days_in_year = sum(_BS_MONTH_DAYS[year_bs])
        if delta < days_in_year:
            break
        delta -= days_in_year
        year_bs += 1

    months = _BS_MONTH_DAYS[year_bs]
    month_bs = 1
    for i, days_in_month in enumerate(months):
        if delta < days_in_month:
            month_bs = i + 1
            day_bs = delta + 1
            break
        delta -= days_in_month

    return (year_bs, month_bs, day_bs)


def bs_date_str(ad_date: date, sep: str = "-") -> str:
    """Return BS date string e.g. '2081-04-15' from an AD date."""
    y, m, d = ad_to_bs(ad_date)
    return f"{y}{sep}{m:02d}{sep}{d:02d}"


def bs_date_display(ad_date: date, lang: str = "en") -> str:
    """Return human-readable BS date e.g. 'Shrawan 15, 2081'."""
    y, m, d = ad_to_bs(ad_date)
    names = BS_MONTH_NAMES_EN if lang == "en" else BS_MONTH_NAMES_NP
    return f"{names[m]} {d}, {y}"


def today_bs() -> tuple[int, int, int]:
    """Return today's date in BS."""
    return ad_to_bs(date.today())


def fiscal_year_bs(ad_date: date | None = None) -> str:
    """
    Return Nepali fiscal year string for a given AD date.
    Nepal fiscal year runs Shrawan 1 (July 16 approx) to Ashadh end (July 15 approx).
    """
    d = ad_date or date.today()
    y, m, _ = ad_to_bs(d)
    if m >= 4:  # Shrawan or later → new fiscal year starts
        return f"{y}/{y + 1}"
    return f"{y - 1}/{y}"
