# Interactive UI Refresh — Phase 3: Parent Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Interaction Kit to the parent dashboard with restrained polish — motion cards, counting stats, attendance ring — with zero i18n drift on this fully bilingual page.

**Architecture:** Consume the existing kit (`frontend/components/interactive/`) in `app/parent/page.tsx` only. No kit changes, no data changes, no new fetches.

**Tech Stack:** Same as Phases 1–2.

**Spec:** `docs/superpowers/specs/2026-07-03-interactive-ui-refresh-design.md` (Phase 3 section). Note: the spec mentions "fee status" — the parent dashboard has no fee-status element (fees live on `/parent/fees` and the child-detail page), so attendance is the ProgressRing target. Sanctioned adaptation.

## Global Constraints

- All commands run from `/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/frontend/`.
- **ZERO i18n changes**: this page is fully bilingual (EN/नेपाली) and shipped. Every `t(...)` call byte-identical; no locales/*.json edits; no new visible strings; numbers keep flowing through `formatNumber` (AnimatedCounter does this internally) with the page's `locale`.
- Only `frontend/app/parent/page.tsx` may change. No new files, no new deps, no kit modifications.
- Restrained tone: entrance/hover motion + counters + one ring. No confetti, no charts, no gamification here.
- Kit interfaces consumed: `MotionCard({ children, className?, onClick?, index? })`, `AnimatedCounter({ value, locale, prefix?, suffix?, className?, durationMs? })`, `ProgressRing({ value, size?, strokeWidth?, className?, ringClassName?, children? })`.
- Gates: `npm run type-check`, `npx vitest run` (91 green), `npm run build`.

---

### Task 1: Parent dashboard kit integration

**Files:**
- Modify: `frontend/app/parent/page.tsx`

**Interfaces:**
- Consumes: kit components above; existing `locale` from `useTranslation()`; existing `formatNumber`.
- Produces: no new exports. All `t(...)` keys byte-identical.

- [ ] **Step 1: Imports**

After the line `import { formatNumber, formatDate } from '@/lib/i18n/format';` add:

```tsx
import { MotionCard } from '@/components/interactive/motion-card';
import { AnimatedCounter } from '@/components/interactive/animated-counter';
import { ProgressRing } from '@/components/interactive/progress-ring';
```

The `Progress` import becomes unused after Step 4 — remove `Progress` from the `@/components/ui/progress` import line (delete the whole line, it imports only `Progress`).

- [ ] **Step 2: Quick links → MotionCard**

In the Quick links map, replace:

```tsx
                    <Link key={href} href={href}>
                        <Card className="border-slate-200 hover:shadow-md transition-all cursor-pointer">
```

with (add `idx` to the destructuring map callback — change `.map(({ href, icon: Icon, label, color }) => (` to `.map(({ href, icon: Icon, label, color }, idx) => (`):

```tsx
                    <Link key={href} href={href}>
                        <MotionCard index={idx} className="border-slate-200 cursor-pointer">
```

and its closing `</Card>` (before `</Link>`) with `</MotionCard>`.

- [ ] **Step 3: Child cards → MotionCard + counting mini-stats**

Change the children map signature from `.map((child: Student) => (` to `.map((child: Student, childIdx: number) => (`, and replace:

```tsx
                        <Card key={child.student_id} className="border-slate-200 shadow-sm hover:shadow-md transition-all">
```

with:

```tsx
                        <MotionCard key={child.student_id} index={childIdx} className="border-slate-200 shadow-sm">
```

and the matching closing `</Card>` (the one directly before `))}` that ends the children map) with `</MotionCard>`.

Replace the mini-stats array + renderer:

```tsx
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { icon: <Activity className="h-4 w-4 text-indigo-500" />, label: t('parent.dashboard.statFocus'), value: `${formatNumber(child.focus_score || 0, locale)}%`, color: 'bg-indigo-50' },
                                        { icon: <TrendingUp className="h-4 w-4 text-orange-500" />, label: t('parent.dashboard.statStreak'), value: `${formatNumber(child.current_streak || 0, locale)}d`, color: 'bg-orange-50' },
                                        { icon: <CalendarDays className="h-4 w-4 text-emerald-500" />, label: t('parent.dashboard.statAttendance'), value: `${formatNumber((child as any).attendance_percentage || 0, locale)}%`, color: 'bg-emerald-50' },
                                    ].map((s, i) => (
                                        <div key={i} className={`${s.color} rounded-xl p-2.5 text-center`}>
                                            <div className="flex justify-center mb-1">{s.icon}</div>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</p>
                                            <p className="text-sm font-black text-slate-800">{s.value}</p>
                                        </div>
                                    ))}
                                </div>
```

with:

```tsx
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { icon: <Activity className="h-4 w-4 text-indigo-500" />, label: t('parent.dashboard.statFocus'), value: child.focus_score || 0, suffix: '%', color: 'bg-indigo-50' },
                                        { icon: <TrendingUp className="h-4 w-4 text-orange-500" />, label: t('parent.dashboard.statStreak'), value: child.current_streak || 0, suffix: 'd', color: 'bg-orange-50' },
                                        { icon: <CalendarDays className="h-4 w-4 text-emerald-500" />, label: t('parent.dashboard.statAttendance'), value: (child as any).attendance_percentage || 0, suffix: '%', color: 'bg-emerald-50' },
                                    ].map((s, i) => (
                                        <div key={i} className={`${s.color} rounded-xl p-2.5 text-center`}>
                                            <div className="flex justify-center mb-1">{s.icon}</div>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</p>
                                            <p className="text-sm font-black text-slate-800">
                                                <AnimatedCounter value={s.value} locale={locale} suffix={s.suffix} />
                                            </p>
                                        </div>
                                    ))}
                                </div>
```

(Rendered output is identical: `formatNumber(value, locale)` + same suffix characters. The `%`/`d` suffixes were never translated strings — they stay as-is.)

- [ ] **Step 4: Attendance linear bar → ProgressRing**

Replace:

```tsx
                                {(parentData.user as any).tenant_features?.parent_attendance !== false && (
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-500">{t('parent.dashboard.attendanceLast30')}</span>
                                            <span className="text-slate-700">{formatNumber((child as any).attendance_percentage || 0, locale)}%</span>
                                        </div>
                                        <Progress value={(child as any).attendance_percentage || 0} className="h-2" />
                                    </div>
                                )}
```

with:

```tsx
                                {(parentData.user as any).tenant_features?.parent_attendance !== false && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500">{t('parent.dashboard.attendanceLast30')}</span>
                                        <ProgressRing value={(child as any).attendance_percentage || 0} size={44} strokeWidth={5} ringClassName="text-violet-600">
                                            <span className="text-[9px] font-black text-slate-700">
                                                {formatNumber((child as any).attendance_percentage || 0, locale)}%
                                            </span>
                                        </ProgressRing>
                                    </div>
                                )}
```

(Label `t(...)` unchanged; the same formatted percentage now sits in the ring's center.)

- [ ] **Step 5: Verify**

Run: `npm run type-check` → exit 0 (confirms `Progress` removal left no dangling reference — `Card`, `CardHeader` etc. are still used elsewhere on the page and must stay imported).
Run: `npx vitest run` → 91 green.
Self-check the diff: every `t(...)` key present before is present after; no new visible strings.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/parent/page.tsx
git commit -m "feat(parent): motion cards, counting stats, attendance ring"
```

---

### Task 2: Phase gate

- [ ] **Step 1:** From `frontend/`: `npm run type-check && npx vitest run && npm run build` — all exit 0, 91 tests.
- [ ] **Step 2:** From repo root: `graphify update .`
- [ ] **Step 3:** `git status --short` — clean apart from known unrelated files.

---

## Self-review notes

- Spec coverage: child cards MotionCard ✓; attendance ProgressRing + AnimatedCounter ✓; fee-status adaptation documented (no fee element on this page); restrained (no charts/confetti) ✓.
- `Card` import must remain (used by the empty-state card and dialog-free sections); only `Progress` import is removed.
- Type consistency: `locale` from `useTranslation()` matches `AnimatedCounter`'s `LocaleArg`; suffixes `'%'`/`'d'` are pre-existing untranslated characters.
