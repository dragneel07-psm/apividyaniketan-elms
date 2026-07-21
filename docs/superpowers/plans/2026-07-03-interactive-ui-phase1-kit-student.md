# Interactive UI Refresh — Phase 1: Interaction Kit + Student Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable Interaction Kit (8 animated primitives) and apply it to the student dashboard.

**Architecture:** New `frontend/components/interactive/` directory of pure client-side presentation wrappers (framer-motion + recharts + canvas-confetti — all already installed). The student dashboard (`app/student/page.tsx`) and `GamificationWidget` swap static markup for kit components. Zero data-fetching, zero string changes.

**Tech Stack:** Next.js App Router, TypeScript, TailwindCSS 4, framer-motion 12, recharts 3, canvas-confetti 1, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-03-interactive-ui-refresh-design.md`

## Global Constraints

- All commands run from `/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/frontend/`.
- Every new file starts with the proprietary header (exactly as in existing files):
  ```
  // Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
  // Unauthorized copying, modification, or distribution of this file,
  // via any medium, is strictly prohibited. Proprietary and confidential.
  ```
- **No new npm dependencies.** framer-motion@12, recharts@3, canvas-confetti@1 exist in package.json.
- **No i18n changes**: never edit `locales/en.json` / `locales/ne.json` or any `t(...)` call. Do not localize the hardcoded English inside `GamificationWidget.tsx` — out of scope.
- **Hydration safety**: server render shows final values/states; animation initializes only client-side (`useEffect` / `whileInView`). No `Date.now()`/`Math.random()` in render paths.
- **Reduced motion**: every component checks framer's `useReducedMotion()` and collapses to a static state.
- Numbers shown to users always go through `formatNumber` from `@/lib/i18n/format` (keeps नेपाली digits correct).
- Test runner: `npx vitest run __tests__/<file> ` (config: jsdom, setup `vitest.setup.ts`, include `__tests__/**/*.test.{ts,tsx}`).
- Phase gates before final commit: `npm run type-check`, `npx vitest run`, `npm run build` — all green.

---

### Task 1: Test setup polyfill + `MotionCard` + `Stagger`

**Files:**
- Modify: `frontend/vitest.setup.ts` (append IntersectionObserver stub)
- Create: `frontend/components/interactive/motion-card.tsx`
- Create: `frontend/components/interactive/stagger.tsx`
- Test: `frontend/__tests__/motion-card.test.tsx`

**Interfaces:**
- Consumes: `Card` from `@/components/ui/card`; framer-motion.
- Produces:
  - `MotionCard({ children, className?, onClick?, index? }): JSX` — drop-in replacement for `<Card>`: fade-up entrance (staggered by `index`), hover lift, tap scale. `className`/`onClick` forwarded to the inner `Card`.
  - `Stagger({ children, className? }): JSX` — wraps each direct child in a cascading fade-up `motion.div` (60 ms apart).

- [ ] **Step 1: Write the failing test**

Create `frontend/__tests__/motion-card.test.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return { ...actual, useReducedMotion: () => true };
});

import { MotionCard } from '@/components/interactive/motion-card';
import { Stagger } from '@/components/interactive/stagger';

describe('MotionCard', () => {
    it('renders children and forwards className to the card', () => {
        render(<MotionCard className="rounded-2xl border-0">hello</MotionCard>);
        const el = screen.getByText('hello');
        expect(el).toBeTruthy();
        expect(el.className).toContain('rounded-2xl');
    });

    it('forwards onClick', () => {
        const onClick = vi.fn();
        render(<MotionCard onClick={onClick}>tap</MotionCard>);
        fireEvent.click(screen.getByText('tap'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

describe('Stagger', () => {
    it('renders all children', () => {
        render(
            <Stagger className="space-y-3">
                <div>one</div>
                <div>two</div>
            </Stagger>,
        );
        expect(screen.getByText('one')).toBeTruthy();
        expect(screen.getByText('two')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/motion-card.test.tsx`
Expected: FAIL — `Cannot find module '@/components/interactive/motion-card'`

- [ ] **Step 3: Add IntersectionObserver polyfill**

Append to the end of the `if (typeof window !== 'undefined') { ... }` block in `frontend/vitest.setup.ts` (after the `matchMedia` stub, inside the block):

```ts
    if (!window.IntersectionObserver) {
        window.IntersectionObserver = class IntersectionObserver {
            root = null;
            rootMargin = '';
            thresholds: number[] = [];
            observe() {}
            unobserve() {}
            disconnect() {}
            takeRecords() { return []; }
        } as unknown as typeof window.IntersectionObserver;
    }
```

- [ ] **Step 4: Write minimal implementation**

Create `frontend/components/interactive/motion-card.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

type MotionCardProps = {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    /** Position in a grid/list — staggers the entrance by 60 ms per index. */
    index?: number;
};

export function MotionCard({ children, className, onClick, index = 0 }: MotionCardProps) {
    const reduced = useReducedMotion();
    if (reduced) {
        return <Card className={className} onClick={onClick}>{children}</Card>;
    }
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            whileHover={{ y: -4 }}
            whileTap={onClick ? { scale: 0.98 } : undefined}
            transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
        >
            <Card className={className} onClick={onClick}>{children}</Card>
        </motion.div>
    );
}
```

Create `frontend/components/interactive/stagger.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Children, ReactNode } from 'react';

type StaggerProps = { children: ReactNode; className?: string };

/** Cascades direct children in with a 60ms stagger. Spacing utilities go on className. */
export function Stagger({ children, className }: StaggerProps) {
    const reduced = useReducedMotion();
    const items = Children.toArray(children);
    if (reduced) return <div className={className}>{children}</div>;
    return (
        <div className={className}>
            {items.map((child, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.35, delay: i * 0.06, ease: 'easeOut' }}
                >
                    {child}
                </motion.div>
            ))}
        </div>
    );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/motion-card.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/vitest.setup.ts frontend/components/interactive/motion-card.tsx frontend/components/interactive/stagger.tsx frontend/__tests__/motion-card.test.tsx
git commit -m "feat(ui-kit): MotionCard and Stagger entrance/hover primitives"
```

---

### Task 2: `AnimatedCounter`

**Files:**
- Create: `frontend/components/interactive/animated-counter.tsx`
- Test: `frontend/__tests__/animated-counter.test.tsx`

**Interfaces:**
- Consumes: `formatNumber` from `@/lib/i18n/format`; framer-motion `animate`, `useInView`, `useReducedMotion`.
- Produces: `AnimatedCounter({ value, locale, suffix?, className?, durationMs? }): JSX` — a `<span>` that counts 0→value on first in-view; renders the final formatted value on SSR and under reduced motion. `locale` is the same value the pages get from `useTranslation()`.

- [ ] **Step 1: Write the failing test**

Create `frontend/__tests__/animated-counter.test.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Reduced motion + always-in-view → counter must show the final value instantly.
vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return { ...actual, useReducedMotion: () => true, useInView: () => true };
});

import { AnimatedCounter } from '@/components/interactive/animated-counter';

describe('AnimatedCounter', () => {
    it('renders the final formatted value under reduced motion', () => {
        render(<AnimatedCounter value={1234} locale="en" />);
        expect(screen.getByText('1,234')).toBeTruthy();
    });

    it('appends the suffix', () => {
        render(<AnimatedCounter value={92} locale="en" suffix="%" />);
        expect(screen.getByText('92%')).toBeTruthy();
    });

    it('treats non-finite values as 0', () => {
        render(<AnimatedCounter value={NaN} locale="en" />);
        expect(screen.getByText('0')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/animated-counter.test.tsx`
Expected: FAIL — `Cannot find module '@/components/interactive/animated-counter'`

- [ ] **Step 3: Write minimal implementation**

Create `frontend/components/interactive/animated-counter.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { animate, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '@/lib/i18n/format';

type LocaleArg = Parameters<typeof formatNumber>[1];

type AnimatedCounterProps = {
    value: number;
    locale: LocaleArg;
    suffix?: string;
    className?: string;
    durationMs?: number;
};

export function AnimatedCounter({ value, locale, suffix = '', className, durationMs = 900 }: AnimatedCounterProps) {
    const safe = Number.isFinite(value) ? value : 0;
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: '-40px' });
    const reduced = useReducedMotion();
    // SSR + pre-animation state is the FINAL value — hydration-safe, no flash of 0.
    const [display, setDisplay] = useState(safe);
    const displayRef = useRef(safe);
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (!inView || reduced) {
            displayRef.current = safe;
            setDisplay(safe);
            return;
        }
        // First reveal animates 0→value; later value changes animate from current.
        const from = hasAnimated.current ? displayRef.current : 0;
        hasAnimated.current = true;
        const controls = animate(from, safe, {
            duration: durationMs / 1000,
            ease: 'easeOut',
            onUpdate: (v) => {
                displayRef.current = v;
                setDisplay(Math.round(v));
            },
        });
        return () => controls.stop();
    }, [inView, reduced, safe, durationMs]);

    return (
        <span ref={ref} className={className}>
            {formatNumber(display, locale)}{suffix}
        </span>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/animated-counter.test.tsx`
Expected: PASS (3 tests)

Note: if the `locale="en"` prop fails type-check because `formatNumber` expects a narrower type, check the actual signature in `frontend/lib/i18n/format.ts` and use its exported locale type in the test — do NOT change `format.ts`.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/interactive/animated-counter.tsx frontend/__tests__/animated-counter.test.tsx
git commit -m "feat(ui-kit): AnimatedCounter with locale-aware formatting"
```

---

### Task 3: `ProgressRing`

**Files:**
- Create: `frontend/components/interactive/progress-ring.tsx`
- Test: `frontend/__tests__/progress-ring.test.tsx`

**Interfaces:**
- Consumes: framer-motion `motion`, `useReducedMotion`.
- Produces: `ProgressRing({ value, size?, strokeWidth?, className?, ringClassName?, children? }): JSX` — circular SVG progress with animated arc sweep. `value` clamped 0–100. `ringClassName` sets the arc color via Tailwind text-* (stroke uses `currentColor`). `children` renders centered inside the ring. Root has `role="progressbar"` + `aria-valuenow`.

- [ ] **Step 1: Write the failing test**

Create `frontend/__tests__/progress-ring.test.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return { ...actual, useReducedMotion: () => true };
});

import { ProgressRing } from '@/components/interactive/progress-ring';

describe('ProgressRing', () => {
    it('exposes clamped value via aria and renders center content', () => {
        render(<ProgressRing value={87}><span>87%</span></ProgressRing>);
        const bar = screen.getByRole('progressbar');
        expect(bar.getAttribute('aria-valuenow')).toBe('87');
        expect(screen.getByText('87%')).toBeTruthy();
    });

    it('clamps out-of-range and non-finite values', () => {
        render(<ProgressRing value={250} />);
        expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    });

    it('clamps NaN to 0', () => {
        render(<ProgressRing value={NaN} />);
        expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/progress-ring.test.tsx`
Expected: FAIL — `Cannot find module '@/components/interactive/progress-ring'`

- [ ] **Step 3: Write minimal implementation**

Create `frontend/components/interactive/progress-ring.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

type ProgressRingProps = {
    value: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
    /** Tailwind text-* class controls the arc color (stroke uses currentColor). */
    ringClassName?: string;
    children?: ReactNode;
};

export function ProgressRing({
    value, size = 96, strokeWidth = 8, className = '', ringClassName = 'text-indigo-600', children,
}: ProgressRingProps) {
    const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const targetOffset = circumference * (1 - clamped / 100);
    const reduced = useReducedMotion();

    return (
        <div
            className={`relative inline-flex items-center justify-center ${className}`}
            role="progressbar"
            aria-valuenow={Math.round(clamped)}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    strokeWidth={strokeWidth} fill="none"
                    className={`stroke-current opacity-15 ${ringClassName}`}
                />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={radius}
                    strokeWidth={strokeWidth} fill="none" strokeLinecap="round"
                    stroke="currentColor"
                    className={ringClassName}
                    strokeDasharray={circumference}
                    initial={reduced ? false : { strokeDashoffset: circumference }}
                    whileInView={{ strokeDashoffset: targetOffset }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={reduced ? { duration: 0 } : { duration: 1, ease: 'easeOut' }}
                    style={reduced ? { strokeDashoffset: targetOffset } : undefined}
                />
            </svg>
            {children ? (
                <div className="absolute inset-0 flex items-center justify-center">{children}</div>
            ) : null}
        </div>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/progress-ring.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/components/interactive/progress-ring.tsx frontend/__tests__/progress-ring.test.tsx
git commit -m "feat(ui-kit): ProgressRing animated circular progress"
```

---

### Task 4: `Sparkline` + `TrendChart` (recharts)

**Files:**
- Create: `frontend/components/interactive/sparkline.tsx`
- Create: `frontend/components/interactive/trend-chart.tsx`
- Test: `frontend/__tests__/charts.test.tsx`

**Interfaces:**
- Consumes: recharts (`AreaChart`, `Area`, `LineChart`, `Line`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`); framer `useReducedMotion`.
- Produces:
  - `ChartPoint = { label: string; value: number }` (exported from `trend-chart.tsx`).
  - `Sparkline({ data, height?, className?, colorClassName? }): JSX` — axis-less area mini-chart; empty data → flat placeholder (`data-testid="sparkline-empty"`).
  - `TrendChart({ data, type?, height?, className?, color? }): JSX` — full line/bar chart; empty data → placeholder (`data-testid="trendchart-empty"`). Used by Phase 2 (teacher/admin); built now so the kit is complete.
- Consumers import these directly (whole dashboards are client components); pages MAY wrap with `next/dynamic` `ssr:false` for bundle deferral — done in Task 6.

- [ ] **Step 1: Write the failing test**

Create `frontend/__tests__/charts.test.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return { ...actual, useReducedMotion: () => true };
});

import { Sparkline } from '@/components/interactive/sparkline';
import { TrendChart } from '@/components/interactive/trend-chart';

const data = [
    { label: 'Jan', value: 70 },
    { label: 'Feb', value: 82 },
    { label: 'Mar', value: 78 },
];

describe('Sparkline', () => {
    it('renders a chart container when data is present', () => {
        render(<Sparkline data={data} />);
        expect(screen.getByTestId('sparkline')).toBeTruthy();
    });

    it('renders a flat placeholder for empty data', () => {
        render(<Sparkline data={[]} />);
        expect(screen.getByTestId('sparkline-empty')).toBeTruthy();
    });
});

describe('TrendChart', () => {
    it('renders a chart container when data is present', () => {
        render(<TrendChart data={data} />);
        expect(screen.getByTestId('trendchart')).toBeTruthy();
    });

    it('renders a placeholder for empty data', () => {
        render(<TrendChart data={[]} />);
        expect(screen.getByTestId('trendchart-empty')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/charts.test.tsx`
Expected: FAIL — `Cannot find module '@/components/interactive/sparkline'`

- [ ] **Step 3: Write minimal implementation**

Create `frontend/components/interactive/trend-chart.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useReducedMotion } from 'framer-motion';
import {
    Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

export type ChartPoint = { label: string; value: number };

type TrendChartProps = {
    data: ChartPoint[];
    type?: 'line' | 'bar';
    height?: number;
    className?: string;
    /** CSS color for the series. Defaults to the indigo brand color. */
    color?: string;
};

const tooltipStyle = {
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    fontSize: 12,
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.1)',
} as const;

export function TrendChart({ data, type = 'line', height = 240, className, color = '#4f46e5' }: TrendChartProps) {
    const reduced = useReducedMotion();
    if (!data.length) {
        return (
            <div
                data-testid="trendchart-empty"
                className={`flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-400 ${className ?? ''}`}
                style={{ height }}
            >
                —
            </div>
        );
    }
    return (
        <div data-testid="trendchart" className={className} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                {type === 'bar' ? (
                    <BarChart data={data}>
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={32} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(79,70,229,0.06)' }} />
                        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} isAnimationActive={!reduced} />
                    </BarChart>
                ) : (
                    <LineChart data={data}>
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={32} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={!reduced} />
                    </LineChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}
```

Create `frontend/components/interactive/sparkline.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ChartPoint } from '@/components/interactive/trend-chart';

type SparklineProps = {
    data: ChartPoint[];
    height?: number;
    className?: string;
    /** CSS color for stroke/fill. Defaults to indigo. */
    color?: string;
};

export function Sparkline({ data, height = 40, className, color = '#4f46e5' }: SparklineProps) {
    const gradientId = useId();
    const reduced = useReducedMotion();
    if (!data.length) {
        return (
            <div
                data-testid="sparkline-empty"
                className={`rounded bg-slate-100 ${className ?? ''}`}
                style={{ height: 2, marginTop: height / 2, marginBottom: height / 2 - 2 }}
            />
        );
    }
    return (
        <div data-testid="sparkline" className={className} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                        labelStyle={{ display: 'none' }}
                    />
                    <Area
                        type="monotone" dataKey="value"
                        stroke={color} strokeWidth={2}
                        fill={`url(#${gradientId})`}
                        isAnimationActive={!reduced}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/charts.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/components/interactive/sparkline.tsx frontend/components/interactive/trend-chart.tsx frontend/__tests__/charts.test.tsx
git commit -m "feat(ui-kit): Sparkline and TrendChart recharts primitives"
```

---

### Task 5: `StreakBadge` + `useConfetti`

**Files:**
- Create: `frontend/components/interactive/streak-badge.tsx`
- Create: `frontend/components/interactive/use-confetti.ts`
- Test: `frontend/__tests__/streak-confetti.test.tsx`

**Interfaces:**
- Consumes: `Flame` from lucide-react; `canvas-confetti` (dynamic import); framer `useReducedMotion`.
- Produces:
  - `StreakBadge({ streak, className? }): JSX` — flame + count visual only (no label text; labels stay in consumers so i18n is untouched). Pulses when `streak >= 3`, dimmed when `streak === 0`.
  - `useConfetti(): () => Promise<void>` — fire-and-forget confetti burst; no-ops under reduced motion or when canvas-confetti fails to load.

- [ ] **Step 1: Write the failing test**

Create `frontend/__tests__/streak-confetti.test.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const confettiMock = vi.fn();
vi.mock('canvas-confetti', () => ({ default: confettiMock }));

let reducedMotion = false;
vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return { ...actual, useReducedMotion: () => reducedMotion };
});

import { StreakBadge } from '@/components/interactive/streak-badge';
import { useConfetti } from '@/components/interactive/use-confetti';

beforeEach(() => {
    confettiMock.mockClear();
    reducedMotion = false;
});

describe('StreakBadge', () => {
    it('shows the streak count', () => {
        render(<StreakBadge streak={7} />);
        expect(screen.getByText('7')).toBeTruthy();
    });

    it('pulses at streak >= 3', () => {
        const { container } = render(<StreakBadge streak={3} />);
        expect(container.innerHTML).toContain('animate-pulse');
    });

    it('does not pulse below 3', () => {
        const { container } = render(<StreakBadge streak={2} />);
        expect(container.innerHTML).not.toContain('animate-pulse');
    });
});

describe('useConfetti', () => {
    it('fires confetti', async () => {
        const { result } = renderHook(() => useConfetti());
        await result.current();
        expect(confettiMock).toHaveBeenCalledTimes(1);
    });

    it('no-ops under reduced motion', async () => {
        reducedMotion = true;
        const { result } = renderHook(() => useConfetti());
        await result.current();
        expect(confettiMock).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/streak-confetti.test.tsx`
Expected: FAIL — `Cannot find module '@/components/interactive/streak-badge'`

- [ ] **Step 3: Write minimal implementation**

Create `frontend/components/interactive/streak-badge.tsx`:

```tsx
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Flame } from 'lucide-react';

type StreakBadgeProps = { streak: number; className?: string };

/** Flame + count visual. Labels/text stay in the consumer (keeps i18n untouched). */
export function StreakBadge({ streak, className = '' }: StreakBadgeProps) {
    const safe = Number.isFinite(streak) && streak > 0 ? Math.floor(streak) : 0;
    const hot = safe >= 3;
    return (
        <div className={`flex flex-col items-center ${className}`}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${hot ? 'bg-orange-100 animate-pulse' : 'bg-orange-50'}`}>
                <Flame className={`h-6 w-6 ${safe > 0 ? 'text-orange-600' : 'text-orange-300'}`} />
            </div>
            <p className="text-2xl font-black text-slate-800">{safe}</p>
        </div>
    );
}
```

Create `frontend/components/interactive/use-confetti.ts`:

```ts
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Fire-and-forget celebration burst. Safe everywhere: no-ops on SSR, reduced motion, or load failure. */
export function useConfetti() {
    const reduced = useReducedMotion();
    return useCallback(async () => {
        if (reduced || typeof window === 'undefined') return;
        try {
            const confetti = (await import('canvas-confetti')).default;
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, disableForReducedMotion: true });
        } catch {
            // canvas unavailable — silently skip
        }
    }, [reduced]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/streak-confetti.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/components/interactive/streak-badge.tsx frontend/components/interactive/use-confetti.ts frontend/__tests__/streak-confetti.test.tsx
git commit -m "feat(ui-kit): StreakBadge and useConfetti gamification primitives"
```

---

### Task 6: Student dashboard — stats row, course stagger, timetable pulse

**Files:**
- Modify: `frontend/app/student/page.tsx` (imports ~line 8–24; Stats Row lines 205–293; course list lines 322–349; timetable slot lines 384–390)

**Interfaces:**
- Consumes: `MotionCard`, `AnimatedCounter`, `ProgressRing`, `Stagger` from Tasks 1–3. All existing `t(...)` keys, `formatNumber`, `locale` stay exactly as they are.
- Produces: no new exports (page component).

- [ ] **Step 1: Add kit imports**

In `frontend/app/student/page.tsx`, after the line `import { formatNumber, formatDate } from '@/lib/i18n/format';` add:

```tsx
import { MotionCard } from '@/components/interactive/motion-card';
import { AnimatedCounter } from '@/components/interactive/animated-counter';
import { ProgressRing } from '@/components/interactive/progress-ring';
import { Stagger } from '@/components/interactive/stagger';
```

- [ ] **Step 2: Replace the Stats Row (lines 205–293)**

Replace the entire `{/* ── Stats Row ─── */}` block (the outer `<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">` through its closing `</div>` — currently lines 206–293) with:

```tsx
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Attendance */}
                <MotionCard
                    index={0}
                    className="border-0 shadow-lg cursor-pointer overflow-hidden rounded-2xl"
                    onClick={() => router.push('/student/attendance')}
                >
                    <CardContent className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xs font-bold flex items-center gap-0.5 text-white/80">
                                {attendanceTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {attendanceTrend >= 0 ? '+' : ''}{attendanceTrend}%
                            </span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-black text-white">
                                    <AnimatedCounter value={attendanceRate} locale={locale} suffix="%" />
                                </p>
                                <p className="text-xs font-medium text-white/70 mt-1">{t('student.dashboard.attendanceRate')}</p>
                            </div>
                            <ProgressRing value={attendanceRate} size={44} strokeWidth={5} ringClassName="text-white" />
                        </div>
                    </CardContent>
                </MotionCard>

                {/* Pending Assignments */}
                <MotionCard
                    index={1}
                    className="border-0 shadow-lg cursor-pointer overflow-hidden rounded-2xl"
                    onClick={() => router.push('/student/assignments')}
                >
                    <CardContent className="p-5 bg-gradient-to-br from-orange-500 to-amber-500">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            {pendingAssignmentsCount > 0 && (
                                <span className="h-6 min-w-6 px-1.5 rounded-full bg-white text-orange-600 text-[10px] font-black flex items-center justify-center animate-pulse">
                                    {pendingAssignmentsCount > 9 ? '9+' : pendingAssignmentsCount}
                                </span>
                            )}
                        </div>
                        <p className="text-3xl font-black text-white">
                            <AnimatedCounter value={pendingAssignmentsCount} locale={locale} />
                        </p>
                        <p className="text-xs font-medium text-white/70 mt-1">{t('student.dashboard.pendingTasks')}</p>
                        <p className="text-[10px] text-white/80 font-bold mt-3 uppercase tracking-wider">
                            {pendingAssignmentsCount === 0 ? t('student.dashboard.allDone') : t('student.dashboard.actionNeeded')}
                        </p>
                    </CardContent>
                </MotionCard>

                {/* Upcoming Exams */}
                <MotionCard
                    index={2}
                    className="border-0 shadow-lg cursor-pointer overflow-hidden rounded-2xl"
                    onClick={() => router.push('/student/assessments')}
                >
                    <CardContent className="p-5 bg-gradient-to-br from-blue-500 to-indigo-600">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Trophy className="h-5 w-5 text-white" />
                            </div>
                            {upcomingExamsCount > 0 && (
                                <span className="h-6 min-w-6 px-1.5 rounded-full bg-white/30 text-white text-[10px] font-black flex items-center justify-center">
                                    {upcomingExamsCount}
                                </span>
                            )}
                        </div>
                        <p className="text-3xl font-black text-white">
                            <AnimatedCounter value={upcomingExamsCount} locale={locale} />
                        </p>
                        <p className="text-xs font-medium text-white/70 mt-1">{t('student.dashboard.upcomingExams')}</p>
                        <p className="text-[10px] text-white/80 font-bold mt-3 uppercase tracking-wider">{t('student.dashboard.quizzesAndTests')}</p>
                    </CardContent>
                </MotionCard>

                {/* My Courses */}
                <MotionCard
                    index={3}
                    className="border-0 shadow-lg cursor-pointer overflow-hidden rounded-2xl"
                    onClick={() => router.push('/student/courses')}
                >
                    <CardContent className="p-5 bg-gradient-to-br from-violet-500 to-purple-600">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Zap className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xs font-bold text-white/70">{t('student.dashboard.doneCount', { count: formatNumber(completedCourses, locale) })}</span>
                        </div>
                        <p className="text-3xl font-black text-white">
                            <AnimatedCounter value={courses.length} locale={locale} />
                        </p>
                        <p className="text-xs font-medium text-white/70 mt-1">{t('student.dashboard.enrolledCourses')}</p>
                        <p className="text-[10px] text-white/80 font-bold mt-3 uppercase tracking-wider">{t('student.dashboard.completedCount', { count: formatNumber(completedCourses, locale) })}</p>
                    </CardContent>
                </MotionCard>
            </div>
```

Notes: the old `hover:shadow-xl hover:-translate-y-0.5 transition-all` classes are removed — `MotionCard` supplies hover motion. The attendance card's old linear bottom bar (`<div className="h-1 mt-3 ...">`) is replaced by the `ProgressRing`. All `t(...)` keys and copy are byte-identical to before.

- [ ] **Step 3: Stagger the course list**

In the My Courses card (`CardContent className="px-6 pb-6 space-y-3"`, currently line 322), change the wrapper so items cascade. Replace:

```tsx
                        <CardContent className="px-6 pb-6 space-y-3">
                            {courses.slice(0, 4).map((course, idx) => {
```

with:

```tsx
                        <CardContent className="px-6 pb-6">
                            <Stagger className="space-y-3">
                            {courses.slice(0, 4).map((course, idx) => {
```

Then close the `Stagger` — the course map ends at (currently line 349):

```tsx
                            })}
                            {courses.length === 0 && (
```

becomes:

```tsx
                            })}
                            </Stagger>
                            {courses.length === 0 && (
```

- [ ] **Step 4: Timetable ongoing pulse ring**

In the Today's Schedule slot number box (currently lines 384–390), replace:

```tsx
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                                                slot.status === 'ongoing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' :
                                                slot.status === 'completed' ? 'bg-slate-200 text-slate-500' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {idx + 1}
                                            </div>
```

with:

```tsx
                                            <div className={`relative h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                                                slot.status === 'ongoing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' :
                                                slot.status === 'completed' ? 'bg-slate-200 text-slate-500' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {slot.status === 'ongoing' && (
                                                    <span className="absolute inline-flex h-full w-full rounded-xl bg-indigo-400 opacity-40 animate-ping motion-reduce:animate-none" />
                                                )}
                                                <span className="relative">{idx + 1}</span>
                                            </div>
```

- [ ] **Step 5: Verify**

Run: `npm run type-check`
Expected: exit 0.

Run: `npx vitest run`
Expected: all tests pass (existing 66+ plus the new kit tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/app/student/page.tsx
git commit -m "feat(student): animated stats, staggered courses, live-class pulse"
```

---

### Task 7: GamificationWidget — StreakBadge, XP ProgressRing, confetti

**Files:**
- Modify: `frontend/components/student/GamificationWidget.tsx`

**Interfaces:**
- Consumes: `StreakBadge`, `ProgressRing`, `useConfetti` from Task 3/5; existing `useGamification()` provider (`streak`, `currentXP`, `currentLevel`, `nextLevelXP`, `isLoading`).
- Produces: no interface change — `GamificationWidget()` signature untouched.
- **Do not localize or change any visible English strings in this file.**

- [ ] **Step 1: Add imports and confetti trigger**

In `frontend/components/student/GamificationWidget.tsx`, change:

```tsx
import { useEffect, useState } from 'react';
import { gamificationAPI, StudentBadge } from '@/lib/api';
import { useGamification } from '@/components/providers/gamification-provider';
```

to:

```tsx
import { useEffect, useRef, useState } from 'react';
import { gamificationAPI, StudentBadge } from '@/lib/api';
import { useGamification } from '@/components/providers/gamification-provider';
import { ProgressRing } from '@/components/interactive/progress-ring';
import { StreakBadge } from '@/components/interactive/streak-badge';
import { useConfetti } from '@/components/interactive/use-confetti';
```

Then inside the component, change:

```tsx
    const { streak, currentXP, currentLevel, nextLevelXP, isLoading: statsLoading } = useGamification();
    const [badges, setBadges] = useState<StudentBadge[]>([]);
    const [badgesLoading, setBadgesLoading] = useState(true);
```

to:

```tsx
    const { streak, currentXP, currentLevel, nextLevelXP, isLoading: statsLoading } = useGamification();
    const [badges, setBadges] = useState<StudentBadge[]>([]);
    const [badgesLoading, setBadgesLoading] = useState(true);
    const fireConfetti = useConfetti();
    const prevLevel = useRef<number | null>(null);

    // Celebrate level-ups (skip the initial load so mounting never fires confetti).
    useEffect(() => {
        if (statsLoading) return;
        if (prevLevel.current !== null && currentLevel > prevLevel.current) {
            void fireConfetti();
        }
        prevLevel.current = currentLevel;
    }, [currentLevel, statsLoading, fireConfetti]);
```

- [ ] **Step 2: Swap the streak tile for StreakBadge**

Replace:

```tsx
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                            <Flame className={`h-6 w-6 ${streak > 0 ? 'text-orange-600 animate-pulse' : 'text-orange-300'}`} />
                        </div>
                        <p className="text-2xl font-black text-slate-800">{streak}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Day Streak</p>
                    </div>
```

with:

```tsx
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col items-center text-center">
                        <StreakBadge streak={streak} />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Day Streak</p>
                    </div>
```

Then remove `Flame` from the lucide-react import list (it is now unused):

```tsx
import {
    Award, Trophy, Star,
    ChevronRight, Zap, Target
} from 'lucide-react';
```

(If `ChevronRight` was already unused before this change, leave it — do not expand scope.)

- [ ] **Step 3: Swap the linear level bar for a ProgressRing**

Replace the level-progress block:

```tsx
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span>{Math.floor(currentXP)} / {nextLevelXP} XP</span>
                                <span>{Math.round(levelProgress)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-1000 ease-out"
                                    style={{ width: `${levelProgress}%` }}
                                />
                            </div>
                        </div>
```

with:

```tsx
                        <div className="flex items-center gap-4">
                            <ProgressRing value={levelProgress} size={56} strokeWidth={6} ringClassName="text-white">
                                <span className="text-[10px] font-black">{Math.round(levelProgress)}%</span>
                            </ProgressRing>
                            <div className="text-[10px] font-black uppercase tracking-widest">
                                {Math.floor(currentXP)} / {nextLevelXP} XP
                            </div>
                        </div>
```

- [ ] **Step 4: Verify**

Run: `npm run type-check`
Expected: exit 0 (in particular: no unused-import errors for `Flame`).

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/student/GamificationWidget.tsx
git commit -m "feat(student): gamification widget with streak badge, XP ring, level-up confetti"
```

---

### Task 8: Phase gate — full verification + graph update

**Files:** none created; verification only.

- [ ] **Step 1: Full frontend gates**

Run (from `frontend/`):

```bash
npm run type-check && npx vitest run && npm run build
```

Expected: all three exit 0. Build compiles with no new warnings about bundle size regressions on `/student`.

- [ ] **Step 2: Manual smoke (animation feel)**

Start dev server (backend must be running):

```bash
BACKEND_API_ORIGIN=http://127.0.0.1:8000 NEXT_PUBLIC_API_URL=/api npm run dev -- --hostname 127.0.0.1 --port 3000
```

Log in as a student; verify: stat cards fade-up staggered and lift on hover; counters count up; attendance ring sweeps; course rows cascade; ongoing class pulses; gamification widget shows streak flame + XP ring. Also verify the नेपाली locale still renders Devanagari digits in all counters.

- [ ] **Step 3: Update knowledge graph**

Run from repo root: `graphify update .`

- [ ] **Step 4: Commit any stragglers**

```bash
git status --short   # should be clean except graphify-out/ updates, commit those if tracked
```

---

## Self-review notes

- Spec coverage (Phase 1 scope): 8 primitives ✓ (MotionCard, Stagger, AnimatedCounter, Sparkline, TrendChart, ProgressRing, StreakBadge, useConfetti); stats-row animation ✓; attendance ProgressRing ✓; course stagger + hover ✓; timetable pulse ✓; gamification streak/XP/confetti ✓. Grade-history `Sparkline` placement on the student page is deferred to Phase 2 alongside teacher analytics (the component itself ships now) — the spec lists it under Phase 1 loosely; this plan pins it to Phase 2 where the grade-series computation is designed once for both surfaces.
- `next/dynamic` deferral of recharts: not needed in Phase 1 — no chart renders on the student page yet, so no bundle impact. Phase 2 applies `next/dynamic` at the consumer.
- Type consistency: `ChartPoint` defined once in `trend-chart.tsx`, imported by `sparkline.tsx`; `locale` typed via `Parameters<typeof formatNumber>[1]`.
