# Interactive UI Refresh — Design

**Date:** 2026-07-03
**Status:** Approved (Approach A — Shared Interaction Kit + phased rollout)
**Scope:** Frontend only (`/frontend/`). No backend, mobile, or API changes.

## Goal

Elevate the existing indigo/white visual identity across all landing pages and
role dashboards with consistent motion, interactive charts, and gamified
touches — without re-theming, without touching translated strings, and without
disturbing the shipped bilingual (EN/नेपाली) pages.

## Constraints

- Keep current style: indigo/white shadcn/Tailwind identity. No dark mode, no
  re-theme.
- Zero i18n changes: all animation wraps existing translated content. The
  locale parity tests and 66-test vitest suite must stay green.
- No new dependencies: `framer-motion@12`, `recharts@3`, `canvas-confetti@1`
  are already installed.
- Hydration safety: this codebase has a history of hydration mismatches. All
  kit components must render deterministic final-state markup on the server.
- Accessibility: every animation respects `prefers-reduced-motion`.

## Architecture: Interaction Kit

New directory: `frontend/components/interactive/`. Eight client-component
primitives, each a pure presentation wrapper with no data fetching:

| Component | Behavior | Consumers |
|---|---|---|
| `MotionCard` | shadcn `Card` in a `motion.div`: hover lift (−2px + shadow), tap scale ~0.98, `whileInView` fade-up entrance, optional stagger index | All dashboards |
| `AnimatedCounter` | Counts 0→value on in-view via framer-motion spring; formats through existing `formatNumber` from `@/lib/i18n/format` so Nepali digits stay correct | Stat cards |
| `Sparkline` | Axis-less recharts `AreaChart` with gradient fill, draw-in animation, hover dot + tooltip | Attendance/grade trends |
| `TrendChart` | Full recharts line/bar chart, animated draw-in, custom tooltip matching indigo theme | Teacher/admin analytics |
| `ProgressRing` | SVG circular progress with animated arc sweep and a center slot (icon/number) | Attendance %, XP, mastery |
| `StreakBadge` | Flame icon + count; pulse animation when streak ≥ 3 | Student gamification |
| `useConfetti()` | Hook wrapping `canvas-confetti`; fires on achievement unlock / quiz pass; no-ops when canvas unavailable | Student pages |
| `Stagger` | Container cascading children entrances at ~60 ms intervals | Card grids, lists |

### Design rules (apply to every component)

1. `useReducedMotion()` — animations collapse to instant static states.
2. `whileInView` triggers once; no re-animation on scroll-back.
3. Transform/opacity animations only — zero layout shift.
4. SSR renders the final value/state; animation initializes client-side only
   (`useEffect` / `whileInView`). No `Date.now()` or `Math.random()` in render
   paths.
5. Empty/invalid data → flat placeholder rendering, never a crash.
6. Recharts loaded via `next/dynamic` (`ssr: false`) inside `Sparkline` and
   `TrendChart` only, behind a small skeleton, to keep first-load JS flat.

## Rollout phases

Each phase is an independent commit batch, gated by type-check + build +
vitest before the next begins.

### Phase 1 — Kit + Student dashboard (`app/student/page.tsx`)
- Build all 8 primitives with unit tests.
- Stat cards → `MotionCard` + `AnimatedCounter` (attendance %, pending
  assignments, upcoming exams).
- Attendance rate → `ProgressRing` with trend arrow; grade history →
  `Sparkline`.
- Course cards → `Stagger` grid, hover lift + gradient border glow.
- Timetable → pulse indicator on the "ongoing" slot.
- Gamification widget → `StreakBadge` + XP `ProgressRing`; `useConfetti()` on
  new achievement.

### Phase 2 — Teacher + Admin dashboards
- Teacher: grade distribution → `TrendChart` (bar); at-risk list → staggered
  entrance + severity color pulse.
- Admin: enrollment/revenue stat row → `AnimatedCounter` + `Sparkline`;
  attendance overview → `TrendChart`.

### Phase 3 — Parent dashboard
- Child cards → `MotionCard`; attendance/fee status → `ProgressRing` +
  `AnimatedCounter`. Restrained effects; strings untouched (fully bilingual
  page).

### Phase 4 — School tenant landing (`app/school/page.tsx`)
- Scroll-driven section reveals (`whileInView` + `Stagger`).
- Hero: animated gradient mesh background, staggered headline words.
- Stats band → `AnimatedCounter` on scroll-into-view.

### Phase 5 — Root SaaS landing (`app/page.tsx`)
- Interactive hero product mockup: tilting dashboard screenshot with
  mouse-parallax.
- Scroll-progress-linked feature sections.
- Magnetic hover on CTA buttons.

## Error handling

- Charts with empty datasets render a flat placeholder line.
- `useConfetti` silently no-ops without canvas support.
- Reduced-motion users receive instant static UI throughout.

## Testing

- Vitest unit tests per kit component: renders, reduced-motion behavior,
  empty-data handling. Extends the existing suite.
- Per-phase gates: `npm run type-check`, `npm run build`, full vitest run,
  i18n parity tests green.
- Manual smoke of animation feel on the dev server per phase.

## Out of scope

- Dark mode, design tokens, re-theming (Approach C — rejected).
- Mobile app (`/mobile/`).
- Any backend or API change.
- New locale strings or edits to `en.json` / `ne.json`.
