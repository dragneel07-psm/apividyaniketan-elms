import { describe, it, expect } from 'vitest';
import { adToBs, formatBs } from '@/lib/i18n/bs';

describe('adToBs', () => {
  it('converts the BS 2080 new year anchor', () => {
    // Authoritative source (backend billing_school/utils_bs_calendar.py):
    // AD 2023-04-15 = BS 2080 Baisakh 1 (not 2023-04-14, which is 2079-12-30).
    expect(adToBs(new Date('2023-04-15'))).toEqual({ y: 2080, m: 1, d: 1 });
  });
  it('formats BS as YYYY-MM-DD', () => {
    expect(formatBs({ y: 2080, m: 1, d: 1 })).toBe('2080-01-01');
  });
  it('returns null for a date outside the table range', () => {
    expect(adToBs(new Date('1800-01-01'))).toBeNull();
  });
  it('converts AD 2024-07-17 to BS 2081-04-01 (Shrawan 1, verified against backend)', () => {
    // Verified: backend ad_to_bs(date(2024, 7, 17)) == (2081, 4, 1)
    expect(adToBs(new Date('2024-07-17'))).toEqual({ y: 2081, m: 4, d: 1 });
  });
  it('converts the backend epoch anchor AD 2003-04-14 to BS 2060-01-01', () => {
    expect(adToBs(new Date('2003-04-14'))).toEqual({ y: 2060, m: 1, d: 1 });
  });
  it('converts AD 2024-01-01 to BS 2080-09-16', () => {
    // Verified: backend ad_to_bs(date(2024, 1, 1)) == (2080, 9, 16)
    expect(adToBs(new Date('2024-01-01'))).toEqual({ y: 2080, m: 9, d: 16 });
  });
});
