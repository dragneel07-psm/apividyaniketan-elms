// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// AD->BS converter for UI display only. Backend billing_school/utils_bs_calendar.py
// remains authoritative for official/financial documents.
//
// Validated against backend/billing_school/utils_bs_calendar.py:
//   - Epoch: AD 2003-04-14 = BS 2060-01-01 (authoritative, Nepal Government data)
//   - BS 2080-01-01 = AD 2023-04-15 (NOT 2023-04-14)
//   - Month-day arrays reconciled to backend table (differs from task spec draft)
//   - Table covers BS 2060-2085 (AD 2003–2028 approx.)

export type BsDate = { y: number; m: number; d: number };

// AD epoch corresponding to BS 2060-01-01.
// Source: backend billing_school/utils_bs_calendar.py (_EPOCH_AD / _EPOCH_BS_YEAR)
const EPOCH_BS_YEAR = 2060;
const EPOCH_AD_UTC = Date.UTC(2003, 3, 14); // 2003-04-14

// Monthly day counts per BS year (12 months: Baisakh–Chaitra).
// Source: backend billing_school/utils_bs_calendar.py (_BS_MONTH_DAYS).
// Nepal Government calendar data. DO NOT edit without reconciling the backend.
const BS_MONTH_DAYS: Record<number, number[]> = {
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
};

const MS_PER_DAY = 86_400_000;

/**
 * Convert a Gregorian (AD) Date to a Bikram Sambat (BS) date object.
 * Returns null if the date is outside the supported table range (BS 2060–2095).
 * For display only — use the backend for official/financial documents.
 */
export function adToBs(ad: Date): BsDate | null {
  const adUtc = Date.UTC(ad.getFullYear(), ad.getMonth(), ad.getDate());
  let remaining = Math.floor((adUtc - EPOCH_AD_UTC) / MS_PER_DAY);
  if (remaining < 0) return null;

  let y = EPOCH_BS_YEAR;
  while (true) {
    const months = BS_MONTH_DAYS[y];
    if (!months) return null; // date beyond table range
    const daysInYear = months.reduce((a, b) => a + b, 0);
    if (remaining < daysInYear) break;
    remaining -= daysInYear;
    y++;
  }

  const months = BS_MONTH_DAYS[y]!;
  let m = 1;
  let d = 1;
  for (let i = 0; i < months.length; i++) {
    if (remaining < months[i]) {
      m = i + 1;
      d = remaining + 1;
      break;
    }
    remaining -= months[i];
  }

  return { y, m, d };
}

/**
 * Format a BsDate as a zero-padded YYYY-MM-DD string.
 */
export function formatBs(bs: BsDate): string {
  return `${bs.y}-${String(bs.m).padStart(2, '0')}-${String(bs.d).padStart(2, '0')}`;
}
