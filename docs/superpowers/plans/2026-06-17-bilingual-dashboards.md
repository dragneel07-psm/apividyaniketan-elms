# Bilingual (English / नेपाली) Dashboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an English/नेपाली language option to the Student and Parent dashboards, with translated UI text, Bikram Sambat (BS) dates, and Devanagari numerals in the Nepali view.

**Architecture:** Extend the existing `frontend/lib/localization.tsx` (`LocalizationProvider` + `useTranslation`, already mounted in `app/layout.tsx`) from `en|es` to `en|ne`, adding `{var}` interpolation, English fallback, and cookie persistence. Add new `lib/i18n/bs.ts` (AD→BS, bundled table, no dependency) and `lib/i18n/format.ts` (Devanagari numerals, BS dates, currency). Update `LanguageSelector` to offer नेपाली, add it to the parent header, load a Devanagari font, then extract hardcoded strings page-by-page.

**Tech Stack:** Next.js (App Router) + TypeScript + React context; Vitest (`vitest.config.ts`, tests in `frontend/__tests__/`); `next/font`.

**All commands run from `frontend/`. Run a single test with:** `npx vitest run <path>`.

---

### Task 1: Extend `localization.tsx` — add `ne`, interpolation, fallback, cookie

**Files:**
- Modify: `frontend/lib/localization.tsx`
- Create: `frontend/locales/ne.json`
- Modify: `frontend/locales/en.json`
- Delete: `frontend/locales/es.json`
- Test: `frontend/__tests__/localization.test.tsx`

- [ ] **Step 1: Seed catalogs.** Replace `frontend/locales/en.json` with a namespaced base and create `ne.json` mirroring it:

`frontend/locales/en.json`:
```json
{
  "common": {
    "appName": "School LMS",
    "save": "Save",
    "cancel": "Cancel",
    "viewAll": "View All",
    "loading": "Loading...",
    "greeting": "Welcome, {name}"
  },
  "student": {
    "dashboard": { "title": "Dashboard", "feeCollection": "Fee Collection", "recentActivity": "Recent Activity" }
  },
  "parent": {
    "dashboard": { "title": "Dashboard" }
  }
}
```

`frontend/locales/ne.json`:
```json
{
  "common": {
    "appName": "विद्यालय एलएमएस",
    "save": "सुरक्षित गर्नुहोस्",
    "cancel": "रद्द गर्नुहोस्",
    "viewAll": "सबै हेर्नुहोस्",
    "loading": "लोड हुँदैछ...",
    "greeting": "स्वागत छ, {name}"
  },
  "student": {
    "dashboard": { "title": "ड्यासबोर्ड", "feeCollection": "शुल्क संकलन", "recentActivity": "हालैका गतिविधि" }
  },
  "parent": {
    "dashboard": { "title": "ड्यासबोर्ड" }
  }
}
```

- [ ] **Step 2: Delete the unused Spanish stub.**

```bash
git rm frontend/locales/es.json
```

- [ ] **Step 3: Write the failing test** at `frontend/__tests__/localization.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalizationProvider, useTranslation } from '@/lib/localization';

function Probe() {
  const { t, locale, setLocale } = useTranslation();
  return (
    <div>
      <span data-testid="loc">{locale}</span>
      <span data-testid="title">{t('student.dashboard.title')}</span>
      <span data-testid="greet">{t('common.greeting', { name: 'Sita' })}</span>
      <span data-testid="missing">{t('student.dashboard.nope')}</span>
      <button onClick={() => setLocale('ne')}>ne</button>
    </div>
  );
}

describe('localization', () => {
  beforeEach(() => { document.cookie = 'lang=; max-age=0; path=/'; });

  it('defaults to English and interpolates vars', () => {
    render(<LocalizationProvider><Probe /></LocalizationProvider>);
    expect(screen.getByTestId('loc').textContent).toBe('en');
    expect(screen.getByTestId('title').textContent).toBe('Dashboard');
    expect(screen.getByTestId('greet').textContent).toBe('Welcome, Sita');
  });

  it('switches to Nepali and persists to the lang cookie', () => {
    render(<LocalizationProvider><Probe /></LocalizationProvider>);
    act(() => { screen.getByText('ne').click(); });
    expect(screen.getByTestId('title').textContent).toBe('ड्यासबोर्ड');
    expect(document.cookie).toContain('lang=ne');
  });

  it('falls back to English when a Nepali key is missing', () => {
    render(<LocalizationProvider><Probe /></LocalizationProvider>);
    act(() => { screen.getByText('ne').click(); });
    // 'student.dashboard.nope' exists in neither → returns the key string
    expect(screen.getByTestId('missing').textContent).toBe('student.dashboard.nope');
  });
});
```

- [ ] **Step 4: Run it, expect failure.**

Run: `npx vitest run __tests__/localization.test.tsx`
Expected: FAIL (no interpolation; `setLocale('ne')` not a valid `Locale`; no cookie).

- [ ] **Step 5: Rewrite `frontend/lib/localization.tsx`:**

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import ne from '../locales/ne.json';

export type Locale = 'en' | 'ne';

interface LocalizationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const translations: Record<Locale, any> = { en, ne };
const COOKIE = 'lang';

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function lookup(locale: Locale, key: string): string | undefined {
  let value: any = translations[locale];
  for (const k of key.split('.')) value = value?.[k];
  return typeof value === 'string' ? value : undefined;
}

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = (readCookie(COOKIE) || localStorage.getItem('app-locale')) as Locale | null;
    if (saved === 'en' || saved === 'ne') setLocaleState(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    document.cookie = `${COOKIE}=${newLocale}; path=/; max-age=31536000; samesite=lax`;
    localStorage.setItem('app-locale', newLocale);
  };

  const t = (key: string, vars?: Record<string, string | number>): string => {
    const value = lookup(locale, key) ?? lookup('en', key);
    if (value === undefined) {
      if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] missing key: ${key}`);
      return key;
    }
    return interpolate(value, vars);
  };

  return (
    <LocalizationContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export const useTranslation = () => {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error('useTranslation must be used within a LocalizationProvider');
  return context;
};
```

- [ ] **Step 6: Run tests, expect pass.**

Run: `npx vitest run __tests__/localization.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Type-check (signature change is backward-compatible — `t(key)` still works).**

Run: `npm run type-check`
Expected: no new errors from `localization.tsx` consumers.

- [ ] **Step 8: Commit.**

```bash
git add frontend/lib/localization.tsx frontend/locales/en.json frontend/locales/ne.json frontend/__tests__/localization.test.tsx
git commit -m "feat(i18n): add Nepali locale, interpolation, en-fallback, cookie persistence"
```

---

### Task 2: BS date converter — `lib/i18n/bs.ts`

**Files:**
- Create: `frontend/lib/i18n/bs.ts`
- Test: `frontend/__tests__/bs.test.ts`

- [ ] **Step 1: Write the failing test** at `frontend/__tests__/bs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { adToBs, formatBs } from '@/lib/i18n/bs';

describe('adToBs', () => {
  // Reference anchors (verified): BS new year 2080 = 2023-04-14 AD.
  it('converts the BS 2080 new year anchor', () => {
    expect(adToBs(new Date('2023-04-14'))).toEqual({ y: 2080, m: 1, d: 1 });
  });

  it('converts a mid-year date', () => {
    // 2024-01-15 AD = 2080-10-01 BS (Magh 1)
    expect(adToBs(new Date('2024-01-15'))).toEqual({ y: 2080, m: 10, d: 1 });
  });

  it('formats BS as YYYY-MM-DD', () => {
    expect(formatBs({ y: 2080, m: 1, d: 1 })).toBe('2080-01-01');
  });

  it('returns null for a date outside the table range', () => {
    expect(adToBs(new Date('1800-01-01'))).toBeNull();
  });
});
```

- [ ] **Step 2: Run it, expect failure.**

Run: `npx vitest run __tests__/bs.test.ts`
Expected: FAIL ("Cannot find module '@/lib/i18n/bs'").

- [ ] **Step 3: Implement `frontend/lib/i18n/bs.ts`:**

```ts
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// AD->BS converter for UI display only. Backend billing_school/utils_bs_calendar.py
// remains authoritative for official/financial documents.
export type BsDate = { y: number; m: number; d: number };

// Days in each of the 12 BS months, per BS year. Source: standard published
// BS calendar tables. Extend the range as needed; out-of-range dates return null.
// Anchor: BS 2080-01-01 == 2000-04-14? No — anchor is 2080-01-01 == 2023-04-14 AD.
const BS_START_YEAR = 2080;
const BS_ANCHOR_AD = Date.UTC(2023, 3, 14); // 2023-04-14, BS 2080-01-01
const BS_MONTH_DAYS: Record<number, number[]> = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2082: [31, 32, 31, 32, 30, 30, 30, 30, 29, 30, 30, 30],
  2083: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
};

const MS_PER_DAY = 86400000;

export function adToBs(ad: Date): BsDate | null {
  const adUtc = Date.UTC(ad.getFullYear(), ad.getMonth(), ad.getDate());
  let remaining = Math.floor((adUtc - BS_ANCHOR_AD) / MS_PER_DAY);
  if (remaining < 0) return null;
  let y = BS_START_YEAR;
  let m = 1;
  let d = 1;
  while (true) {
    const months = BS_MONTH_DAYS[y];
    if (!months) return null; // outside table range
    const daysInMonth = months[m - 1];
    if (remaining < daysInMonth - (d - 1)) {
      d += remaining;
      return { y, m, d };
    }
    remaining -= daysInMonth - (d - 1);
    d = 1;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
}

export function formatBs(bs: BsDate): string {
  const mm = String(bs.m).padStart(2, '0');
  const dd = String(bs.d).padStart(2, '0');
  return `${bs.y}-${mm}-${dd}`;
}
```

- [ ] **Step 4: Run tests, expect pass.**

Run: `npx vitest run __tests__/bs.test.ts`
Expected: PASS (4 tests).
> Note for the implementer: if a reference assertion fails, the BS month-day table values for that year are the source of truth — correct the table from a published BS calendar, not the test anchors. Verify the `2024-01-15` expectation against a published table before adjusting.

- [ ] **Step 5: Commit.**

```bash
git add frontend/lib/i18n/bs.ts frontend/__tests__/bs.test.ts
git commit -m "feat(i18n): add AD->BS date converter for UI display"
```

---

### Task 3: Format helpers — `lib/i18n/format.ts`

**Files:**
- Create: `frontend/lib/i18n/format.ts`
- Test: `frontend/__tests__/format.test.ts`

- [ ] **Step 1: Write the failing test** at `frontend/__tests__/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatNumber, formatDate, formatCurrency } from '@/lib/i18n/format';

describe('formatNumber', () => {
  it('keeps Arabic numerals for en, with grouping', () => {
    expect(formatNumber(12500, 'en')).toBe('12,500');
  });
  it('uses Devanagari numerals for ne, with grouping', () => {
    expect(formatNumber(12500, 'ne')).toBe('१२,५००');
  });
});

describe('formatDate', () => {
  it('formats AD for en', () => {
    expect(formatDate(new Date('2024-01-15'), 'en')).toBe('2024-01-15');
  });
  it('formats BS (Devanagari) for ne', () => {
    expect(formatDate(new Date('2024-01-15'), 'ne')).toBe('२०८०-१०-०१');
  });
});

describe('formatCurrency', () => {
  it('prefixes Rs for en', () => {
    expect(formatCurrency(12500, 'en')).toBe('Rs 12,500');
  });
  it('prefixes रू and Devanagari for ne', () => {
    expect(formatCurrency(12500, 'ne')).toBe('रू १२,५००');
  });
});
```

- [ ] **Step 2: Run it, expect failure.**

Run: `npx vitest run __tests__/format.test.ts`
Expected: FAIL ("Cannot find module '@/lib/i18n/format'").

- [ ] **Step 3: Implement `frontend/lib/i18n/format.ts`:**

```ts
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
import type { Locale } from '@/lib/localization';
import { adToBs, formatBs } from '@/lib/i18n/bs';

const DEVANAGARI = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

function toDevanagari(s: string): string {
  return s.replace(/[0-9]/g, (d) => DEVANAGARI[Number(d)]);
}

export function formatNumber(n: number, locale: Locale): string {
  const grouped = n.toLocaleString('en-US'); // stable grouping: 12,500
  return locale === 'ne' ? toDevanagari(grouped) : grouped;
}

export function formatDate(date: Date, locale: Locale): string {
  if (locale === 'ne') {
    const bs = adToBs(date);
    if (bs) return toDevanagari(formatBs(bs));
    // out-of-range fallback: AD ISO
    if (process.env.NODE_ENV !== 'production') console.warn('[i18n] BS out of range, using AD');
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatCurrency(amount: number, locale: Locale): string {
  return locale === 'ne'
    ? `रू ${formatNumber(amount, 'ne')}`
    : `Rs ${formatNumber(amount, 'en')}`;
}
```

- [ ] **Step 4: Run tests, expect pass.**

Run: `npx vitest run __tests__/format.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit.**

```bash
git add frontend/lib/i18n/format.ts frontend/__tests__/format.test.ts
git commit -m "feat(i18n): add Devanagari number, BS date, and currency formatters"
```

---

### Task 4: Update `LanguageSelector` — offer नेपाली

**Files:**
- Modify: `frontend/components/LanguageSelector.tsx`
- Test: `frontend/__tests__/language-selector.test.tsx`

- [ ] **Step 1: Write the failing test** at `frontend/__tests__/language-selector.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocalizationProvider } from '@/lib/localization';
import { LanguageSelector } from '@/components/LanguageSelector';

describe('LanguageSelector', () => {
  it('renders without crashing inside the provider', () => {
    render(<LocalizationProvider><LanguageSelector /></LocalizationProvider>);
    // Globe trigger button is present
    expect(screen.getByRole('button')).toBeTruthy();
  });
});
```

> Note: the dropdown options render in a portal on open (Radix). This smoke test verifies wiring; the option label change is asserted by reading the source in Step 3. A deeper interaction test may open the menu, but is optional.

- [ ] **Step 2: Run it, expect failure** (only if the import path or provider is broken; otherwise it passes as a smoke test — the real change is the label in Step 3).

Run: `npx vitest run __tests__/language-selector.test.tsx`
Expected: PASS for the smoke assertion (this task's substance is the label swap below).

- [ ] **Step 3: In `frontend/components/LanguageSelector.tsx`, replace the Español item** (lines ~47–52) with Nepali:

```tsx
                <DropdownMenuItem
                    className={`rounded-xl font-bold cursor-pointer transition-colors ${locale === 'ne' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'}`}
                    onClick={() => setLocale('ne')}
                >
                    नेपाली
                </DropdownMenuItem>
```

(The English item above it stays; just change the second item's `es`→`ne` and label `Español`→`नेपाली`.)

- [ ] **Step 4: Run test + type-check.**

Run: `npx vitest run __tests__/language-selector.test.tsx && npm run type-check`
Expected: PASS; no type errors (`'es'` no longer referenced).

- [ ] **Step 5: Commit.**

```bash
git add frontend/components/LanguageSelector.tsx frontend/__tests__/language-selector.test.tsx
git commit -m "feat(i18n): offer Nepali (नेपाली) in the language selector"
```

---

### Task 5: Load a Devanagari font

**Files:**
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Inspect the current font setup.**

Run: `grep -n "next/font\|className\|font" frontend/app/layout.tsx | head`
Expected: shows the existing `next/font` usage and where `<body>`/`<html>` className is set.

- [ ] **Step 2: Add Noto Sans Devanagari** alongside the existing font in `frontend/app/layout.tsx`:

```tsx
import { Noto_Sans_Devanagari } from 'next/font/google';

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '700'],
  variable: '--font-devanagari',
  display: 'swap',
});
```

Then add `notoDevanagari.variable` to the existing `<html>` or `<body>` className list (append to whatever className is already there).

- [ ] **Step 3: Make the font apply for Devanagari text.** In `frontend/app/globals.css`, add a fallback so Devanagari glyphs use the font:

```css
:root { --font-devanagari: 'Noto Sans Devanagari'; }
html[lang="ne"] body { font-family: var(--font-devanagari), system-ui, sans-serif; }
```

- [ ] **Step 4: Build to verify the font import resolves.**

Run: `npm run build`
Expected: build succeeds (font fetched/resolved at build).

- [ ] **Step 5: Commit.**

```bash
git add frontend/app/layout.tsx frontend/app/globals.css
git commit -m "feat(i18n): load Noto Sans Devanagari for Nepali text"
```

---

### Task 6: Add the selector to the Parent header

**Files:**
- Modify: `frontend/app/parent/layout.tsx`

- [ ] **Step 1: Confirm the parent header structure.**

Run: `grep -n "NotificationBell\|header\|<nav\|import" frontend/app/parent/layout.tsx | head`
Expected: shows the header region and existing imports (mirror how the student layout places `<LanguageSelector/>`).

- [ ] **Step 2: Import and render the selector** in `frontend/app/parent/layout.tsx` — add the import:

```tsx
import { LanguageSelector } from '@/components/LanguageSelector';
```

and place `<LanguageSelector />` in the header next to the existing controls (e.g., immediately before `<NotificationBell />` or the avatar), matching the student layout's placement.

- [ ] **Step 3: Type-check.**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 4: Commit.**

```bash
git add frontend/app/parent/layout.tsx
git commit -m "feat(i18n): add language selector to the parent dashboard header"
```

---

### Task 7: Worked string-extraction example — Student dashboard

**Files:**
- Modify: `frontend/app/student/page.tsx`
- Modify: `frontend/locales/en.json`, `frontend/locales/ne.json`

This task demonstrates the exact extraction procedure that Task 8 repeats for every remaining page.

- [ ] **Step 1: Find hardcoded strings on the page.**

Run: `grep -nE ">[A-Z][a-zA-Z ]+<|'[A-Z][a-zA-Z ]+'|\"[A-Z][a-zA-Z ]+\"" frontend/app/student/page.tsx | head -40`
Expected: a list of human-readable English literals (titles, labels, button text).

- [ ] **Step 2: Add the keys** under `student.dashboard.*` in both catalogs. Example additions to `en.json`:

```json
"student": {
  "dashboard": {
    "title": "Dashboard",
    "feeCollection": "Fee Collection",
    "recentActivity": "Recent Activity",
    "viewAll": "View All",
    "quickActions": "Quick Actions"
  }
}
```

and the Nepali mirror in `ne.json` (AI-drafted; add to the review checklist — Task 9):

```json
"student": {
  "dashboard": {
    "title": "ड्यासबोर्ड",
    "feeCollection": "शुल्क संकलन",
    "recentActivity": "हालैका गतिविधि",
    "viewAll": "सबै हेर्नुहोस्",
    "quickActions": "द्रुत कार्यहरू"
  }
}
```

- [ ] **Step 3: Replace literals with `t()` and route numbers/dates through helpers.** At the top of the component:

```tsx
import { useTranslation } from '@/lib/localization';
import { formatNumber, formatCurrency, formatDate } from '@/lib/i18n/format';
// inside the component:
const { t, locale } = useTranslation();
```

Then replace, e.g.:
```tsx
// before:
<CardTitle className="...">Fee Collection</CardTitle>
// after:
<CardTitle className="...">{t('student.dashboard.feeCollection')}</CardTitle>

// before:
<span>Rs {collected}</span>
// after:
<span>{formatCurrency(collected, locale)}</span>

// before:
<Button ...>View All</Button>
// after:
<Button ...>{t('student.dashboard.viewAll')}</Button>
```
Leave user-generated content (notice text, names, lesson titles from the API) unchanged.

- [ ] **Step 4: Type-check and lint the page.**

Run: `npm run type-check && npx eslint app/student/page.tsx`
Expected: no errors.

- [ ] **Step 5: Manual verification.** Start the dev server (per CLAUDE.md proxy mode), log in as a student, switch to नेपाली via the selector, confirm the dashboard labels are Nepali, amounts show रू + Devanagari, and dates show BS. Switch back to English and confirm it reverts and persists on reload.

- [ ] **Step 6: Commit.**

```bash
git add frontend/app/student/page.tsx frontend/locales/en.json frontend/locales/ne.json
git commit -m "feat(i18n): localize the student dashboard page"
```

---

### Task 8: Roll out extraction to remaining Student & Parent pages

Repeat the **exact Task 7 procedure** (Steps 1–6) for each page below, one commit per page (or per small group). Namespace keys as `student.<area>.*` / `parent.<area>.*`. Add every new Nepali value to the review checklist (Task 9).

- [ ] Student: `app/student/courses/**`, `assessments/**`, `timetable/page.tsx`, `attendance` views, `messages/page.tsx`, `notices/page.tsx`, `fees/**`, `ai-tutor/page.tsx`, `resources/page.tsx`, `projects/**`, `profile`, `gamification`, plus `app/student/layout.tsx` nav labels.
- [ ] Parent: `app/parent/page.tsx` and each `app/parent/**` subpage; `app/parent/layout.tsx` nav labels.

For each page:
1. `grep` for literals (Task 7 Step 1).
2. Add `en`/`ne` keys.
3. Replace with `t()`; wrap numbers/dates/currency in `format.ts` helpers.
4. `npm run type-check && npx eslint <file>`.
5. Manual toggle check.
6. Commit `feat(i18n): localize <page>`.

- [ ] **After all pages: full checks.**

Run: `npm run type-check && npm run lint && npx vitest run`
Expected: all pass.

---

### Task 9: Nepali review checklist + finalize

**Files:**
- Create: `docs/superpowers/specs/ne-review-checklist.md`

- [ ] **Step 1: Generate the review list.** List every key whose Nepali value was AI-drafted, grouped by namespace, with the English source and the drafted Nepali, for a Nepali speaker to verify:

```markdown
# Nepali Translation Review Checklist
| Key | English | Nepali (draft) | Verified? |
|-----|---------|----------------|-----------|
| student.dashboard.feeCollection | Fee Collection | शुल्क संकलन | [ ] |
| ... | ... | ... | [ ] |
```

- [ ] **Step 2: Full regression.**

Run: `npm run type-check && npm run lint && npx vitest run`
Expected: all pass. Manually toggle EN/नेपाली on a student and a parent account end-to-end.

- [ ] **Step 3: Commit.**

```bash
git add docs/superpowers/specs/ne-review-checklist.md
git commit -m "docs(i18n): add Nepali translation review checklist"
```

---

## Self-Review Notes
- **Spec coverage:** Task 1 (ne locale + interpolation + fallback + cookie), Task 2 (BS), Task 3 (Devanagari numerals + BS dates + currency), Task 4 (selector → नेपाली), Task 5 (Devanagari font), Task 6 (parent selector), Tasks 7–8 (string extraction, student+parent only), Task 9 (review checklist). All §4/§7/§10 spec items mapped. Out-of-scope (teacher/admin/SaaS/auth, URL locales, backend field, user content) excluded.
- **Type consistency:** `Locale = 'en' | 'ne'` exported from `localization.tsx` and imported by `format.ts`; `t(key, vars?)`, `setLocale(locale)`, `adToBs(Date): BsDate|null`, `formatBs(BsDate)`, `formatNumber/formatDate/formatCurrency(_, locale)` used consistently across tasks.
- **Note:** BS month-day table in Task 2 must be validated against a published BS calendar before the converter is trusted for display; tests assert reference anchors.
