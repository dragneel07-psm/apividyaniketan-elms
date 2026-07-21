# Interactive UI Refresh — Phase 2: Teacher + Admin Dashboards

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Phase 1 Interaction Kit to the teacher and admin dashboards, add the deferred student grade-history sparkline, and harden the kit with non-reduced-motion tests.

**Architecture:** Consume the existing kit (`frontend/components/interactive/`) in `app/teacher/page.tsx` and `app/admin/page.tsx`; two tiny additive kit props (`prefix` on AnimatedCounter, `valueFormatter` on Sparkline); new trend-series derivations from data the pages already fetch. No new data fetching, no API changes.

**Tech Stack:** Same as Phase 1 (framer-motion 12, recharts 3, vitest).

**Spec:** `docs/superpowers/specs/2026-07-03-interactive-ui-refresh-design.md`

## Global Constraints

- All commands run from `/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/frontend/`.
- New files start with the 3-line proprietary header:
  ```
  // Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
  // Unauthorized copying, modification, or distribution of this file,
  // via any medium, is strictly prohibited. Proprietary and confidential.
  ```
- **No new npm dependencies.** **No i18n changes**: no locales/*.json edits; on the student page every existing `t(...)` call stays byte-identical; teacher/admin pages are hardcoded English — do NOT translate them, do NOT change any visible string anywhere.
- Teacher/admin pages are not localized: pass the literal `locale="en"` to `AnimatedCounter` there. Student page uses its existing `locale` from `useTranslation()`.
- Kit changes must be additive (new optional props only) — existing consumers (student page, GamificationWidget) must compile unchanged.
- **Sanctioned deviation from spec:** no `next/dynamic` recharts deferral — teacher/admin pages already import recharts statically today, so there is no bundle regression to prevent. Do not add dynamic imports.
- Hydration safety and reduced-motion rules from Phase 1 apply to all new code. `Date` usage is allowed inside `loadData`/effects (not render paths).
- Test runner: `npx vitest run __tests__/<file>`; phase gates: `npm run type-check`, `npx vitest run`, `npm run build`.

---

### Task 1: Kit hardening — non-reduced-motion animation tests

**Files:**
- Test (create): `frontend/__tests__/interactive-animation.test.tsx`

**Interfaces:**
- Consumes: existing kit components; framer-motion mocked with `useReducedMotion: () => false`, `useInView: () => true`, and `animate` wrapped in a spy around the real implementation.
- Produces: regression coverage for the animated (non-reduced) paths. No component changes expected — if a test exposes a real defect, fix the component minimally and note it in the report.

- [ ] **Step 1: Write the tests**

Create `frontend/__tests__/interactive-animation.test.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const animateSpy = vi.fn();

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    const wrappedAnimate = (...args: Parameters<typeof actual.animate>) => {
        animateSpy(...args);
        return actual.animate(...args);
    };
    return {
        ...actual,
        animate: wrappedAnimate,
        useReducedMotion: () => false,
        useInView: () => true,
    };
});

import { MotionCard } from '@/components/interactive/motion-card';
import { Stagger } from '@/components/interactive/stagger';
import { AnimatedCounter } from '@/components/interactive/animated-counter';
import { ProgressRing } from '@/components/interactive/progress-ring';

describe('non-reduced-motion paths', () => {
    it('MotionCard mounts through the motion wrapper (entrance opacity 0)', () => {
        const { container } = render(<MotionCard className="rounded-2xl">content</MotionCard>);
        const wrapper = container.firstElementChild as HTMLElement;
        // In the animated branch the root is the motion.div with initial opacity 0.
        expect(wrapper.style.opacity).toBe('0');
        expect(screen.getByText('content')).toBeTruthy();
    });

    it('Stagger wraps each child in an animated wrapper (entrance opacity 0)', () => {
        const { container } = render(
            <Stagger>
                <div>a</div>
                <div>b</div>
            </Stagger>,
        );
        const wrappers = Array.from((container.firstElementChild as HTMLElement).children) as HTMLElement[];
        expect(wrappers).toHaveLength(2);
        for (const w of wrappers) expect(w.style.opacity).toBe('0');
    });

    it('AnimatedCounter animates and settles on the final formatted value', async () => {
        render(<AnimatedCounter value={1234} locale="en" durationMs={50} />);
        await waitFor(() => expect(screen.getByText('1,234')).toBeTruthy(), { timeout: 3000 });
        expect(animateSpy).toHaveBeenCalledWith(0, 1234, expect.anything());
    });

    it('ProgressRing sweeps the arc to the target offset', async () => {
        const { container } = render(<ProgressRing value={50} size={100} strokeWidth={10} />);
        const circles = container.querySelectorAll('circle');
        const arc = circles[circles.length - 1];
        // r = (100-10)/2 = 45; C = 2π·45 ≈ 282.743; target = C·(1-0.5) ≈ 141.372
        const target = 2 * Math.PI * 45 * 0.5;
        await waitFor(() => {
            const offset = Number(arc.getAttribute('stroke-dashoffset'));
            expect(Math.abs(offset - target)).toBeLessThan(1);
        }, { timeout: 3000 });
        expect(animateSpy).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run __tests__/interactive-animation.test.tsx`
Expected: PASS (4 tests). These exercise existing code, so they should pass immediately. If one fails, that is a real animation-path defect: fix the component minimally (do not change its public interface) and document RED→GREEN in your report.

Note: if jsdom lacks `requestAnimationFrame` timing and the counter/ring tests are flaky, prefer `vi.useFakeTimers()` alternatives ONLY as a last resort — first try increasing the `waitFor` timeout.

- [ ] **Step 3: Full suite**

Run: `npx vitest run`
Expected: all green (88 tests: 84 + 4 new).

- [ ] **Step 4: Commit**

```bash
git add frontend/__tests__/interactive-animation.test.tsx
git commit -m "test(ui-kit): cover non-reduced-motion animation paths"
```

---

### Task 2: Kit additions — AnimatedCounter `prefix`, Sparkline `valueFormatter`

**Files:**
- Modify: `frontend/components/interactive/animated-counter.tsx`
- Modify: `frontend/components/interactive/sparkline.tsx`
- Test (create): `frontend/__tests__/kit-additions.test.tsx`

**Interfaces:**
- Produces:
  - `AnimatedCounter` gains optional `prefix?: string`, rendered before the number: `{prefix}{formatNumber(display, locale)}{suffix}`.
  - `Sparkline` gains optional `valueFormatter?: (value: number) => string`, applied in the recharts `Tooltip` `formatter`.
- Both are additive; all existing call sites compile unchanged.

- [ ] **Step 1: Write the failing test**

Create `frontend/__tests__/kit-additions.test.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return { ...actual, useReducedMotion: () => true, useInView: () => true };
});

import { AnimatedCounter } from '@/components/interactive/animated-counter';
import { Sparkline } from '@/components/interactive/sparkline';

describe('AnimatedCounter prefix', () => {
    it('renders prefix before the formatted value', () => {
        render(<AnimatedCounter value={5000} locale="en" prefix="$" />);
        expect(screen.getByText('$5,000')).toBeTruthy();
    });

    it('renders prefix and suffix together', () => {
        render(<AnimatedCounter value={75} locale="en" prefix="~" suffix="%" />);
        expect(screen.getByText('~75%')).toBeTruthy();
    });
});

describe('Sparkline valueFormatter', () => {
    it('accepts a valueFormatter and still renders the chart', () => {
        render(
            <Sparkline
                data={[{ label: 'a', value: 1 }, { label: 'b', value: 2 }]}
                valueFormatter={(v) => `${v}%`}
            />,
        );
        expect(screen.getByTestId('sparkline')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run __tests__/kit-additions.test.tsx`
Expected: FAIL — `prefix`/`valueFormatter` props don't exist (type error at runtime render shows missing text `$5,000`).

- [ ] **Step 3: Implement**

In `animated-counter.tsx`: add `prefix?: string` to `AnimatedCounterProps`, destructure `prefix = ''`, and change the return to:

```tsx
    return (
        <span ref={ref} className={className}>
            {prefix}{formatNumber(display, locale)}{suffix}
        </span>
    );
```

In `sparkline.tsx`: add `valueFormatter?: (value: number) => string;` to `SparklineProps`, destructure it, and change the `<Tooltip ... />` to:

```tsx
                    <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                        labelStyle={{ display: 'none' }}
                        formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : (value as number))}
                    />
```

- [ ] **Step 4: Verify**

Run: `npx vitest run __tests__/kit-additions.test.tsx` → PASS (3 tests).
Run: `npx vitest run` → all green. Run: `npm run type-check` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/interactive/animated-counter.tsx frontend/components/interactive/sparkline.tsx frontend/__tests__/kit-additions.test.tsx
git commit -m "feat(ui-kit): AnimatedCounter prefix and Sparkline valueFormatter"
```

---

### Task 3: Teacher dashboard — KPI motion, TrendChart swap, at-risk stagger + pulse

**Files:**
- Modify: `frontend/app/teacher/page.tsx`

**Interfaces:**
- Consumes: `MotionCard`, `AnimatedCounter` (with `locale="en"`), `Stagger`, `TrendChart` (`{ data: ChartPoint[]; type?: 'line'|'bar'; height?: number }` where `ChartPoint = { label: string; value: number }`).
- Produces: no new exports. Visible English strings unchanged.

- [ ] **Step 1: Swap imports**

Remove the recharts + SafeResponsiveContainer imports (lines currently reading):

```tsx
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip } from 'recharts';
import { SafeResponsiveContainer } from '@/components/ui/safe-responsive-container';
```

Add instead:

```tsx
import { MotionCard } from '@/components/interactive/motion-card';
import { AnimatedCounter } from '@/components/interactive/animated-counter';
import { Stagger } from '@/components/interactive/stagger';
import { TrendChart } from '@/components/interactive/trend-chart';
```

(`AttendanceTrends` keeps its own chart internals — do not touch that component.)

- [ ] **Step 2: KPI cards → MotionCard + AnimatedCounter**

For each of the four KPI cards in the `{/* 2. KPI Cards */}` grid: replace `<Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">` with `<MotionCard index={N} className="shadow-sm border-slate-200">` (N = 0,1,2,3 in order: Today's Classes, Total Students, Pending Reviews, AI Evaluations) and the matching `</Card>` with `</MotionCard>`. Replace each value div's number:

- `{stats.todaysClasses}` → `<AnimatedCounter value={stats.todaysClasses} locale="en" />`
- `{stats.totalStudents}` → `<AnimatedCounter value={stats.totalStudents} locale="en" />`
- `{stats.pendingReviews}` → `<AnimatedCounter value={stats.pendingReviews} locale="en" />`
- `{stats.aiEvaluations}` → `<AnimatedCounter value={stats.aiEvaluations} locale="en" />`

Everything else inside the cards (titles, icons, captions, the `Progress` bar) stays byte-identical.

- [ ] **Step 3: Performance Trends → TrendChart**

Replace the chart block inside the Performance Trends `CardContent` (the `<SafeResponsiveContainer ...>...</SafeResponsiveContainer>` branch of the ternary) with:

```tsx
                                    <TrendChart
                                        data={performanceTrends.map((row) => ({ label: row.name, value: row.score }))}
                                        type="bar"
                                        height={200}
                                    />
```

Keep the empty-state branch (`Performance trend data is unavailable.`) exactly as-is.

- [ ] **Step 4: At-risk list → Stagger + severity pulse**

In the At Risk Students card, wrap the `atRiskStudents.map(...)` output in a `Stagger`:

```tsx
                                <Stagger className="space-y-3">
                                    {atRiskStudents.map((row) => (
                                        ...existing row JSX...
                                    ))}
                                </Stagger>
```

(The `atRiskStudents.length === 0` branch and the trailing `Link` stay outside the `Stagger`.)

In each row, change the risk badge to pulse for high scores:

```tsx
                                            <Badge className={`bg-rose-100 text-rose-700 hover:bg-rose-100 ${Number(row.risk_score) >= 70 ? 'animate-pulse motion-reduce:animate-none' : ''}`}>
                                                {row.risk_score}/100
                                            </Badge>
```

- [ ] **Step 5: Verify**

Run: `npm run type-check` → exit 0 (confirms the removed recharts imports are truly unused).
Run: `npx vitest run` → all green.
Self-check: `git diff frontend/app/teacher/page.tsx` — no visible English string changed on any `+` line vs its `-` counterpart.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/teacher/page.tsx
git commit -m "feat(teacher): animated KPIs, kit TrendChart, staggered at-risk list"
```

---

### Task 4: Admin dashboard — KPI motion + counters, revenue & attendance sparklines

**Files:**
- Modify: `frontend/app/admin/page.tsx`

**Interfaces:**
- Consumes: `MotionCard`, `AnimatedCounter` (with `prefix`/`suffix` from Task 2, `locale="en"`), `Sparkline` + `ChartPoint`.
- Produces: no new exports. Visible English strings unchanged. Existing Area/Pie charts stay untouched.

- [ ] **Step 1: Imports and state**

Add imports:

```tsx
import { MotionCard } from '@/components/interactive/motion-card';
import { AnimatedCounter } from '@/components/interactive/animated-counter';
import { Sparkline } from '@/components/interactive/sparkline';
import type { ChartPoint } from '@/components/interactive/trend-chart';
```

Add state next to `classDistribution`:

```tsx
    const [revenueTrend, setRevenueTrend] = useState<ChartPoint[]>([]);
    const [attendanceTrendSeries, setAttendanceTrendSeries] = useState<ChartPoint[]>([]);
```

- [ ] **Step 2: Derive monthly series inside `loadData`**

Immediately after the `setClassDistribution(...)` call, add:

```tsx
            const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
            const lastMonths = (n: number) => {
                const now = new Date();
                return Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1));
            };

            const revByMonth: Record<string, number> = {};
            for (const payment of payments) {
                const d = new Date(payment.payment_date || '');
                if (Number.isNaN(d.getTime())) continue;
                revByMonth[monthKey(d)] = (revByMonth[monthKey(d)] || 0) + Number(payment.amount || 0);
            }
            setRevenueTrend(lastMonths(6).map((d) => ({ label: monthLabel(d), value: Math.round(revByMonth[monthKey(d)] || 0) })));

            const attByMonth: Record<string, { present: number; total: number }> = {};
            for (const record of attendanceRecords) {
                const d = new Date(record.date || '');
                if (Number.isNaN(d.getTime())) continue;
                const key = monthKey(d);
                attByMonth[key] = attByMonth[key] || { present: 0, total: 0 };
                attByMonth[key].total += 1;
                if (record.status === 'present' || record.status === 'late') attByMonth[key].present += 1;
            }
            setAttendanceTrendSeries(lastMonths(6).map((d) => {
                const bucket = attByMonth[monthKey(d)];
                return { label: monthLabel(d), value: bucket && bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 100) : 0 };
            }));
```

- [ ] **Step 3: Restructure `KPI_CARDS` to numeric values**

Replace the whole `KPI_CARDS` array with (note: every visible string is preserved exactly; only `value` becomes numeric with `prefix`/`suffix`/`spark` added):

```tsx
    const KPI_CARDS = [
        {
            title: 'Total Students',
            value: stats.totalStudents,
            prefix: '',
            suffix: '',
            spark: [] as ChartPoint[],
            trend: `${stats.totalClasses} active classes`,
            trendUp: null as boolean | null,
            icon: GraduationCap,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        },
        {
            title: 'Teachers',
            value: stats.totalTeachers,
            prefix: '',
            suffix: '',
            spark: [] as ChartPoint[],
            trend: stats.totalTeachers > 0 ? `${Math.round((stats.totalStudents / Math.max(1, stats.totalTeachers)))} students / teacher` : 'No teacher assigned',
            trendUp: null as boolean | null,
            icon: Users,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            title: 'Attendance',
            value: stats.attendanceRate,
            prefix: '',
            suffix: '%',
            spark: attendanceTrendSeries,
            trend: stats.attendanceRate >= 90 ? 'Healthy attendance' : 'Needs attention',
            trendUp: stats.attendanceRate >= 90 as boolean | null,
            icon: School,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: 'Revenue',
            value: stats.revenue,
            prefix: '$',
            suffix: '',
            spark: revenueTrend,
            trend: stats.pendingFees > 0 ? `$${stats.pendingFees.toLocaleString()} pending` : 'All collected',
            trendUp: (stats.pendingFees === 0) as boolean | null,
            icon: TrendingUp,
            color: 'text-orange-600',
            bg: 'bg-orange-50'
        },
    ];
```

- [ ] **Step 4: KPI render — MotionCard + AnimatedCounter + Sparkline**

Replace the KPI map block with:

```tsx
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {KPI_CARDS.map((card, idx) => (
                    <MotionCard key={idx} index={idx} className="border-none shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{card.title}</p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-2">
                                        <AnimatedCounter value={card.value} locale="en" prefix={card.prefix} suffix={card.suffix} />
                                    </h3>
                                </div>
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                                    <card.icon className={`h-5 w-5 ${card.color}`} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 text-xs font-medium">
                                {card.trendUp === true && <ArrowUpRight className="h-3 w-3 text-green-600" />}
                                {card.trendUp === false && <ArrowDownRight className="h-3 w-3 text-red-600" />}
                                <span className={card.trendUp === true ? 'text-green-600' : card.trendUp === false ? 'text-red-600' : 'text-slate-500'}>
                                    {card.trend}
                                </span>
                            </div>
                            {card.spark.some((point) => point.value > 0) && (
                                <Sparkline data={card.spark} height={32} className="mt-3" />
                            )}
                        </CardContent>
                    </MotionCard>
                ))}
            </div>
```

Note: the old `hover:shadow-md transition-shadow` classes are dropped (MotionCard supplies hover motion). `card.value.toLocaleString()` formatting is now handled by `AnimatedCounter`→`formatNumber` (same `en-US` grouping).

- [ ] **Step 5: Verify**

Run: `npm run type-check` → exit 0. Run: `npx vitest run` → all green.
Self-check the diff: no visible English string changed.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/admin/page.tsx
git commit -m "feat(admin): animated KPIs with revenue and attendance sparklines"
```

---

### Task 5: Student dashboard — grade-history sparkline (deferred from Phase 1)

**Files:**
- Modify: `frontend/app/student/page.tsx`

**Interfaces:**
- Consumes: `Sparkline` (+ its `valueFormatter` from Task 2); existing page data (`safeSubmissions` with `result?.score`, `safeAssessments` with `assessment_id`/`total_marks`); existing `formatNumber`, `formatDate`, `locale`.
- Produces: no new exports. **This page is fully bilingual — zero string changes; every `t(...)` byte-identical.** The sparkline adds no visible strings (tooltip values go through `valueFormatter` → `formatNumber`, dates through `formatDate`).

- [ ] **Step 1: Import + state**

Add import (next to the other kit imports added in Phase 1):

```tsx
import { Sparkline } from '@/components/interactive/sparkline';
```

Add state next to `todayTimetable`:

```tsx
    const [gradeTrend, setGradeTrend] = useState<{ date: string; value: number }[]>([]);
```

- [ ] **Step 2: Derive the grade series in `loadData`**

Immediately after the `setPendingAssignmentsCount(...)` line (which already has `safeAssessments` and `safeSubmissions` in scope), add:

```tsx
            const assessTotals = new Map(safeAssessments.map((a) => [String(a.assessment_id), Number(a.total_marks)]));
            const gradedPoints = safeSubmissions
                .filter((s) => s.result && Number.isFinite(Number(s.result.score)) && s.submitted_at)
                .map((s) => {
                    const total = assessTotals.get(String(s.assessment)) || 0;
                    if (total <= 0) return null;
                    const pct = Math.min(100, Math.max(0, (Number(s.result!.score) / total) * 100));
                    return { date: s.submitted_at, value: Math.round(pct) };
                })
                .filter((point): point is { date: string; value: number } => point !== null)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(-8);
            setGradeTrend(gradedPoints);
```

- [ ] **Step 3: Render in the Upcoming Exams stat card**

In the Upcoming Exams `MotionCard` (index 2), directly after the line
`<p className="text-[10px] text-white/80 font-bold mt-3 uppercase tracking-wider">{t('student.dashboard.quizzesAndTests')}</p>`, add:

```tsx
                        {gradeTrend.length > 1 && (
                            <Sparkline
                                data={gradeTrend.map((g) => ({ label: formatDate(new Date(g.date), locale), value: g.value }))}
                                height={28}
                                color="#ffffff"
                                className="mt-2"
                                valueFormatter={(v) => `${formatNumber(v, locale)}%`}
                            />
                        )}
```

(White stroke/gradient on the indigo gradient card; hidden entirely when fewer than 2 graded submissions exist.)

- [ ] **Step 4: Verify**

Run: `npm run type-check` → exit 0. Run: `npx vitest run` → all green.
Self-check the diff: every `t(...)` key untouched; no new visible strings.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/student/page.tsx
git commit -m "feat(student): grade-history sparkline in upcoming-exams card"
```

---

### Task 6: Phase gate

**Files:** none; verification only.

- [ ] **Step 1: Full gates**

From `frontend/`:

```bash
npm run type-check && npx vitest run && npm run build
```

Expected: all exit 0; test count 91 (84 + 4 + 3).

- [ ] **Step 2: Update knowledge graph**

From repo root: `graphify update .`

- [ ] **Step 3: Confirm clean tree**

`git status --short` — nothing unexpected outside the committed files.

---

## Self-review notes

- Spec coverage (Phase 2): teacher grade-distribution bar chart → Task 3 (kit TrendChart replaces the inline recharts BarChart — same visual, now animated + consistent); at-risk stagger + severity pulse → Task 3; admin stat row AnimatedCounter + Sparkline → Task 4 (revenue + attendance series derived from already-fetched payments/attendance); admin "attendance overview TrendChart" from the spec is satisfied as an attendance Sparkline in the KPI card — the admin page has no attendance time-series panel today and inventing a new full-width chart panel would be scope creep beyond "elevate current style"; student grade-history sparkline (deferred from Phase 1) → Task 5; kit non-reduced-motion tests (final-review precondition for Phase 2 reuse) → Task 1.
- `next/dynamic` deviation documented in Global Constraints with rationale.
- Type consistency: `ChartPoint` imported from `trend-chart.tsx` everywhere; Sparkline prop is `color` (per Phase 1 resolution), used in Task 5; `locale="en"` literals satisfy `Locale = 'en' | 'ne'`.
- i18n: teacher/admin strings untouched (hardcoded English preserved); student page strings byte-identical; sparkline tooltips localize via `valueFormatter`/`formatDate`.
