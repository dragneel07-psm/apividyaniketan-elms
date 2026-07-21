# Interactive UI Refresh — Phase 4: School Tenant Landing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the two missing hero animations to the school tenant landing: a slowly drifting gradient mesh and staggered headline words.

**Architecture:** Single-file change to `frontend/app/school/page.tsx` using framer-motion already imported there. No kit components needed; no data changes.

**Spec:** `docs/superpowers/specs/2026-07-03-interactive-ui-refresh-design.md` (Phase 4).

**Sanctioned adaptations (page reality vs spec):**
- Scroll-driven section reveals already exist (local `Reveal` component wraps every section) — keep as-is; replacing with kit `Stagger` would be churn with no user-visible gain.
- "Stats band → AnimatedCounter" is inapplicable: this page's stats strip is qualitative (word labels, no numbers). Numeric stats live on the root SaaS landing (Phase 5). No counters added here.

## Global Constraints

- Commands run from `/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/frontend/`.
- Page is hardcoded English (not localized): every visible string stays byte-identical — the headline still reads exactly `Welcome to` / `{schoolName}`.
- Only `frontend/app/school/page.tsx` may change. No new files/deps/kit edits/locales edits.
- Reduced motion: mesh freezes at its base position; headline renders static. Use framer's `useReducedMotion`.
- Hydration note: both mesh branches start at identical base transforms (SSR deterministic for all users). The headline keeps the page's existing pattern (motion initial opacity 0 pre-hydration) — same as the current `motion.h1`, no regression.
- Transform/opacity animations only; `pointer-events-none` stays on decorative layers.
- Gates: `npm run type-check`, `npx vitest run` (91 green), `npm run build`.

---

### Task 1: Hero mesh drift + staggered headline words

**Files:**
- Modify: `frontend/app/school/page.tsx`

**Interfaces:**
- Consumes: `motion`, `useReducedMotion` from framer-motion (add `useReducedMotion` to the existing import).
- Produces: no new exports; no visible string changes.

- [ ] **Step 1: Import + hook**

Change the framer import line:

```tsx
import { motion, useInView } from 'framer-motion';
```

to:

```tsx
import { motion, useInView, useReducedMotion } from 'framer-motion';
```

Inside `SchoolLandingPage`, after `const [tenantId, setTenantId] = useState('school');` add:

```tsx
    const reduced = useReducedMotion();
```

- [ ] **Step 2: Animated gradient mesh**

Replace the two static hero blobs:

```tsx
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-100/60 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/4" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none -translate-x-1/4 translate-y-1/4" />
```

with (Tailwind translate utilities move into framer keyframes because framer owns the inline transform; both branches start at the same base position, so server render is identical for every user):

```tsx
                <motion.div
                    className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-100/60 rounded-full blur-[120px] pointer-events-none"
                    initial={false}
                    animate={reduced
                        ? { x: 200, y: -150, scale: 1 }
                        : { x: [200, 160, 220, 200], y: [-150, -110, -180, -150], scale: [1, 1.08, 0.96, 1] }}
                    transition={reduced ? { duration: 0 } : { duration: 22, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none"
                    initial={false}
                    animate={reduced
                        ? { x: -100, y: 100, scale: 1 }
                        : { x: [-100, -60, -130, -100], y: [100, 140, 70, 100], scale: [1, 1.06, 0.95, 1] }}
                    transition={reduced ? { duration: 0 } : { duration: 26, repeat: Infinity, ease: 'easeInOut' }}
                />
```

(Base offsets preserved: 600px blob had `translate-x-1/3 -translate-y-1/4` ⇒ x 200, y −150; 400px blob had `-translate-x-1/4 translate-y-1/4` ⇒ x −100, y 100.)

- [ ] **Step 3: Staggered headline words**

Replace the headline block:

```tsx
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.15 }}
                            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-slate-900 mb-6"
                        >
                            Welcome to<br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800">
                                {schoolName}
                            </span>
                        </motion.h1>
```

with:

```tsx
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-slate-900 mb-6">
                            {['Welcome', 'to'].map((word, i) => (
                                <motion.span
                                    key={word}
                                    className="inline-block"
                                    initial={reduced ? false : { opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.15 + i * 0.09, ease: 'easeOut' }}
                                >
                                    {word}{i === 0 ? ' ' : ''}
                                </motion.span>
                            ))}
                            <br />
                            <motion.span
                                className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800"
                                initial={reduced ? false : { opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
                            >
                                {schoolName}
                            </motion.span>
                        </h1>
```

(Rendered text identical: `Welcome to` — non-breaking space between the inline-block words — line break, then the gradient school name. The dynamic `schoolName` animates as one unit; word-splitting a dynamic name would risk layout breakage.)

- [ ] **Step 4: Verify**

Run: `npm run type-check` → exit 0.
Run: `npx vitest run` → 91 green.
Self-check the diff: no visible string changed; both blobs keep their color/size/blur classes; `pointer-events-none` retained.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/school/page.tsx
git commit -m "feat(school-landing): drifting hero gradient mesh and staggered headline"
```

---

### Task 2: Phase gate

- [ ] **Step 1:** From `frontend/`: `npm run type-check && npx vitest run && npm run build` — all exit 0, 91 tests.
- [ ] **Step 2:** From repo root: `graphify update .`

---

## Self-review notes

- Spec coverage: hero animated gradient mesh ✓ (Step 2); staggered headline words ✓ (Step 3); scroll reveals pre-existing (documented adaptation); stats counters inapplicable (documented adaptation).
- Infinite mesh animation is transform-only on `pointer-events-none` blurred layers — GPU-composited, no layout thrash; freezes entirely under reduced motion.
- The nbsp (` `) keeps the space between inline-block words; plain spaces collapse between inline-block siblings.
