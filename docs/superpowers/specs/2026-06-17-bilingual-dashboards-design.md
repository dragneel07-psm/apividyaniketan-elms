# Bilingual (English / नेपाली) Dashboards — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design); pending spec review
**Scope (Phase 1):** Student and Parent dashboards
**Author:** brainstorming session

## 1. Problem & Goal
The frontend dashboards are English-only (hardcoded strings). Nepali government-school users — especially students and parents — need a Nepali interface. Goal: add an **English / नेपाली** toggle that fully localizes the **Student** and **Parent** dashboards, including **translated UI text, Bikram Sambat (BS) dates, and Devanagari numerals** in the Nepali view. Teacher, School-Admin, SaaS, and auth interfaces are explicitly later phases.

## 2. Decisions (locked during brainstorming)
| Decision | Choice |
|---|---|
| Initial scope | Student + Parent dashboards only |
| Preference mechanism | `lang` cookie + existing React context + header selector (no URL routing, no backend change) |
| Localization depth | UI text **+ BS dates + Devanagari numerals** in Nepali view |
| Translation source | I draft `ne.json` (AI), user/Nepali-speaker reviews |
| Library | **Extend the existing `LocalizationProvider`** (no new dependency) — discovered already mounted in `app/layout.tsx` |

## 3. Current State (verified — REVISED after code inspection)
An i18n foundation **already exists and is mounted**, but is unused and Spanish-oriented:
- **`frontend/lib/localization.tsx`**: `LocalizationProvider` + `useTranslation()` hook. `Locale = 'en' | 'es'`; persists to **localStorage** (`app-locale`); `t(key)` does dot-path lookup with **no interpolation** and **no fallback** (returns the raw key on miss).
- **`LocalizationProvider` is mounted in `app/layout.tsx`** — the whole app already has the context.
- **`frontend/components/LanguageSelector.tsx`**: a `Globe` dropdown offering **English / Español**; rendered in the **student** layout header only (parent layout does NOT render it).
- **`frontend/locales/en.json` + `es.json`**: tiny stubs (~3 keys: `common`, `student`, `teacher`), not meaningfully populated.
- **Only 1 consumer** of `useTranslation` exists (the selector itself) → dashboard strings are **hardcoded English** everywhere (e.g., `app/admin/page.tsx`: `<CardTitle>Students by Class</CardTitle>`).
- **No frontend BS converter.** `app/admin/finance/accounting/page.tsx` gets BS only via backend `/api/billing/school/nas/bs-calendar/` (`backend/billing_school/utils_bs_calendar.py`) → `{ bs_date_str, bs_display_en, bs_display_np, fiscal_year, ad_date }`. Per-date API calls are unsuitable for formatting many dashboard dates → the frontend needs its own client-side converter.

**Implication:** EXTEND the existing localization system to Nepali (do not build a parallel provider — that would conflict with the already-mounted one). Vitest is configured (`vitest.config.ts`, `vitest.setup.ts`, tests in `frontend/__tests__/`).

## 4. Architecture (REVISED — extend the existing system)

### 4.1 Extend `frontend/lib/localization.tsx` (modify, not replace)
- Change `Locale` to **`'en' | 'ne'`** (replace the unused `'es'`); import `ne.json` instead of `es.json`.
- **Persistence → cookie**: store the choice in a `lang` cookie (via `document.cookie`) instead of/in addition to localStorage, so it is server-readable; read it on init. (Keeps the existing client provider; `<html lang>` updated client-side in the provider effect. A server-rendered `<html lang>` is an optional later nicety.)
- Upgrade `t(key, vars?)`: keep dot-path lookup; **add `{var}` interpolation**; **add fallback to the `en` value when the `ne` key is missing/empty**; dev-only `console.warn` on a key missing in both.
- Keep `LocalizationProvider` mounted in `app/layout.tsx` (already there).

### 4.2 New: `frontend/lib/i18n/format.ts` + `frontend/lib/i18n/bs.ts`
- **`format.ts`**:
  - `formatNumber(n, locale)` → Devanagari numerals (`०१२३…`) when `ne` (pure digit map, no dep), else Arabic; preserves grouping (`१२,५००`).
  - `formatDate(date, locale, opts?)` → BS string when `ne` (via `bs.ts`), else existing AD format.
  - `formatCurrency(amount, locale)` → `रू`/`Rs` prefix + `formatNumber`.
- **`bs.ts`**: self-contained AD↔BS conversion using a bundled BS year/month-day **lookup table** (same data the common `nepali-date-converter` packages use). **No runtime dependency.** Covers a sufficient range (e.g., 2000–2100 BS). Backend `utils_bs_calendar.py` stays authoritative for official/financial docs; `bs.ts` is UI-display only. Unit-tested against known AD↔BS reference dates.

### 4.3 Wiring
- **`LanguageSelector.tsx`**: replace the `Español`/`es` item with **`नेपाली`/`ne`** (keep the `Globe` dropdown UI).
- **Parent layout** (`app/parent/layout.tsx`) currently lacks the selector — **add `<LanguageSelector/>`** to its header (student layout already renders it).
- Load **Noto Sans Devanagari** via `next/font` and apply it so Nepali text renders correctly.
- No new provider; no change to `app/layout.tsx` mount.

### 4.4 Message catalogs: `frontend/locales/`
- `en.json` — source of truth; extracted keys, namespaced: `common.*`, `student.*`, `parent.*`.
- `ne.json` — AI-drafted Nepali mirroring `en.json` keys; values needing verification tracked in a side `docs/superpowers/specs/ne-review-checklist.md` (don't put non-JSON comments in `ne.json`).
- **Delete** the unused `es.json` stub.

### 4.5 String extraction
- Page-by-page across `/student` (~27 pages) and `/parent`: replace hardcoded English with `t('namespace.key')` (from `useTranslation()`); accumulate keys in `en.json`; draft `ne.json`.
- Route displayed numbers/dates/currency through `format.ts` helpers so they switch with `locale`.
- **Not translated** (user-generated, left as authored): notice text, lesson/material content, messages, names.

## 5. Data Flow
1. On init, `LocalizationProvider` reads the `lang` cookie → sets initial `locale` (default `en`).
2. Components call `useTranslation()` → `{ locale, setLocale, t }`; `t()` + `format.ts` helpers render per active `locale`.
3. `<LanguageSelector/>` → `setLocale('ne')` → cookie updated + context re-renders → all in-scope strings/numbers/dates switch.

## 6. Error Handling & Edge Cases
- Missing `ne` key → render `en` value (UI never breaks); dev warning.
- Missing in both → render the key string + dev warning (visible but non-fatal).
- Date outside the BS table range → fall back to AD format + dev warning.
- Cookie absent/invalid → default `en`.

## 7. Testing (Vitest — existing foundation)
- `t()`: dot-path lookup, `{var}` interpolation, `ne`→`en` fallback, missing-key behavior.
- `formatNumber`: Devanagari mapping incl. grouping (`१२,५००`).
- `bs.ts`: AD↔BS conversion against ≥3 known reference dates; out-of-range fallback.
- `formatDate`/`formatCurrency`: locale switching.
- Render smoke test: toggling `lang` swaps a sample student page's strings/numerals.

## 8. Out of Scope (YAGNI / later phases)
Teacher, School-Admin, SaaS, and auth interfaces; URL-based locales; backend `language` profile field (cross-device sync); translation of user-generated content; languages beyond en/ne.

## 9. Risks
- **Volume:** extracting hundreds of strings across ~27+ pages is the bulk of the effort; mitigated by phasing (student first, then parent) and namespaced catalogs.
- **Translation quality:** AI-drafted Nepali requires human review; fallback-to-en guarantees no broken UI in the interim.
- **BS accuracy:** mitigated by a vetted bundled table + reference-date unit tests; backend stays authoritative for official documents.

## 10. Acceptance Criteria
- A Student user and a Parent user can switch language via the header selector (English / नेपाली); the choice persists across navigation and reloads (cookie).
- In `ne`: in-scope UI text is Nepali; numbers render in Devanagari; dates render in BS; currency shows `रू`.
- Missing Nepali strings fall back to English with no broken UI.
- Out-of-scope interfaces remain English and unaffected.
- Vitest suite for i18n utilities passes.
