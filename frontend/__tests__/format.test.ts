// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
import { describe, it, expect } from 'vitest';
import { adToBs, formatBs } from '@/lib/i18n/bs';
import { formatNumber, formatDate, formatCurrency } from '@/lib/i18n/format';

// Helper — mirrors toDevanagari from format.ts (defined locally so the test
// doesn't import a private symbol).
const DEVANAGARI = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
function toDevanagari(s: string): string {
  return s.replace(/[0-9]/g, (d) => DEVANAGARI[Number(d)]);
}

describe('formatNumber', () => {
  it('en: groups with commas', () => {
    expect(formatNumber(12500, 'en')).toBe('12,500');
  });

  it('ne: Devanagari digits + comma grouping', () => {
    expect(formatNumber(12500, 'ne')).toBe('१२,५००');
  });
});

describe('formatDate', () => {
  // Local-component date (TZ-safe) inside bs.ts table range. Jan 1 2024 = Monday.
  const adDate = new Date(2024, 0, 1);

  it('en: returns a friendly long-form date', () => {
    expect(formatDate(adDate, 'en')).toBe('Monday, January 1, 2024');
  });

  it('ne: returns Devanagari BS string derived from real converter', () => {
    const bs = adToBs(adDate);
    expect(bs).not.toBeNull();
    const expected = toDevanagari(formatBs(bs!));
    expect(formatDate(adDate, 'ne')).toBe(expected);
  });
});

describe('formatCurrency', () => {
  it('en: Rs prefix + grouped number', () => {
    expect(formatCurrency(12500, 'en')).toBe('Rs 12,500');
  });

  it('ne: रू prefix + Devanagari grouped number', () => {
    expect(formatCurrency(12500, 'ne')).toBe('रू १२,५००');
  });
});
