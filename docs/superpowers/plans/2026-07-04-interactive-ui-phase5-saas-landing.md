# Interactive UI Refresh — Phase 5: Root SaaS Landing Wow-Pass

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three Phase 5 interactions to the root SaaS landing: magnetic hover on CTA buttons, mouse-parallax tilt on the hero dashboard mockup, and a scroll-progress-linked feature section.

**Architecture:** Single-file change to `frontend/app/page.tsx` using framer-motion already imported there. The page uses its own local micro-components (`AnimatedCounter`, `Reveal`, `FaqItem`) rather than the interactive kit — Phase 5 follows that pattern and adds one local `Magnetic` component. No data changes, no new deps.

**Tech Stack:** Next.js App Router, framer-motion (`useMotionValue`, `useSpring`, `useReducedMotion`, `useScroll`), TailwindCSS.

**Spec:** `docs/superpowers/specs/2026-07-03-interactive-ui-refresh-design.md` (Phase 5).

**Sanctioned adaptations (page reality vs spec):**
- "Tilting dashboard screenshot" — the hero has no screenshot; it has a hand-built dashboard card cluster (`hidden lg:block`, lines ~298–370). The tilt applies to that whole cluster. Desktop-only by existing markup; no mobile tilt.
- "Scroll-progress-linked feature sections" — implemented as a scroll-progress-drawn vertical gold line beside the 6-row features list (the page's only long scrolling feature block). The hero already has scroll-linked `heroY`/`heroOpacity`; untouched.
- Magnetic hover goes on the four true CTAs (hero pair + closing CTA pair). The fixed-nav button and pricing-card buttons are excluded — magnetic movement inside a fixed nav or aligned card grid reads as jitter, not delight.
- No new unit tests: this page's local micro-components have never been under vitest (kit components are; kit is untouched). Same testing posture as Phase 4 — gates + manual smoke. Suite stays at 91.

## Global Constraints

- Commands run from `/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/frontend/`.
- Only `frontend/app/page.tsx` may change. No new files, deps, kit edits, or locale edits (page is hardcoded English; every visible string stays byte-identical).
- Reduced motion (`useReducedMotion`): magnetic buttons stay still, mockup does not tilt, feature progress line renders fully drawn and static.
- Hydration: all new motion values start at 0 (server and client render identical transforms); `useReducedMotion` returns `null` on server AND first client render, so no branch differs across hydration.
- Transform/opacity-only animations; decorative layers keep `pointer-events-none`.
- Work on branch `feat/interactive-ui-phase5`.
- Gates: `npm run type-check`, `npx vitest run` (91 green), `npm run build`.

---

### Task 1: Magnetic CTA buttons

**Files:**
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `motion` (already imported), `useMotionValue`, `useSpring`, `useReducedMotion` from framer-motion; `useRef` (already imported).
- Produces: local component `function Magnetic({ children, strength = 0.3, className = '' }: { children: React.ReactNode; strength?: number; className?: string })` — Tasks 2–3 don't consume it, but Task 2 reuses the same enlarged framer import line, so do this task first.

- [ ] **Step 1: Extend the framer-motion import**

Change line 12:

```tsx
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
```

to:

```tsx
import { motion, AnimatePresence, useInView, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
```

- [ ] **Step 2: Add the `Magnetic` micro-component**

Insert directly after the closing brace of `Reveal` (after line ~155), before `FaqItem`:

```tsx
function Magnetic({ children, strength = 0.3, className = '' }: { children: React.ReactNode; strength?: number; className?: string }) {
    const reduced = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const x = useSpring(mx, { stiffness: 220, damping: 18, mass: 0.6 });
    const y = useSpring(my, { stiffness: 220, damping: 18, mass: 0.6 });
    const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (reduced || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - (r.left + r.width / 2)) * strength);
        my.set((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const onLeave = () => { mx.set(0); my.set(0); };
    return (
        <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ x, y }} className={`inline-block ${className}`}>
            {children}
        </motion.div>
    );
}
```

- [ ] **Step 3: Wrap the hero CTA pair**

In the hero (inside the `motion.div` with `className="flex flex-col sm:flex-row items-start gap-4"`, lines ~268–283), wrap each of the two children:

```tsx
                                <Magnetic>
                                    <Link href="/contact">
                                        <button className="group flex items-center gap-2 px-8 py-4 rounded-full text-base font-bold transition-all hover:brightness-110 hover:scale-[1.02]"
                                            style={{ background: 'linear-gradient(135deg,#d4a34c,#a07030)', color: '#0c0a08', boxShadow: '0 8px 40px rgba(212,163,76,0.3)' }}>
                                            Request a Demo
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </Link>
                                </Magnetic>
                                <Magnetic>
                                    <a href="#intelligence">
                                        <button className="flex items-center gap-2 px-8 py-4 rounded-full text-base font-medium transition-all hover:brightness-110"
                                            style={{ background: 'rgba(212,163,76,0.07)', border: `1px solid rgba(212,163,76,0.2)`, color: S.cream }}>
                                            See AI in Action
                                        </button>
                                    </a>
                                </Magnetic>
```

(The `Link`/`a` elements and buttons are byte-identical to today — only the `Magnetic` wrappers are new.)

- [ ] **Step 4: Wrap the closing CTA pair**

In the final CTA section (inside `<div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-14">`, lines ~717–730), wrap both `Link`s the same way:

```tsx
                            <Magnetic>
                                <Link href="/contact">
                                    <button className="px-10 py-5 rounded-full text-lg font-bold transition-all hover:brightness-110 hover:scale-[1.03]"
                                        style={{ background: 'linear-gradient(135deg,#d4a34c,#a07030)', color: '#0c0a08', boxShadow: '0 16px 64px rgba(212,163,76,0.35)' }}>
                                        Request a Demo →
                                    </button>
                                </Link>
                            </Magnetic>
                            <Magnetic>
                                <Link href="/saas-login">
                                    <button className="px-10 py-5 rounded-full text-lg font-medium transition-all hover:brightness-110"
                                        style={{ background: 'rgba(212,163,76,0.06)', border: `1px solid rgba(212,163,76,0.2)`, color: S.cream }}>
                                        Admin Sign In
                                    </button>
                                </Link>
                            </Magnetic>
```

- [ ] **Step 5: Verify**

Run: `npm run type-check` → exit 0.
Run: `npx vitest run` → 91 green.
Self-check the diff: no visible string changed; buttons' classNames/styles byte-identical; only wrappers added.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat(saas-landing): magnetic hover on hero and closing CTA buttons"
```

---

### Task 2: Mouse-parallax tilt on the hero dashboard mockup

**Files:**
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `useMotionValue`, `useSpring`, `useReducedMotion` (import added in Task 1).
- Produces: nothing consumed later; hooks `rotateX`/`rotateY` + handlers `onHeroMouseMove`/`onHeroMouseLeave` local to `SaaSLandingPage`.

- [ ] **Step 1: Add tilt state to `SaaSLandingPage`**

Inside the component, directly after the existing `heroOpacity` line (~184):

```tsx
    const reduced = useReducedMotion();
    const tiltX = useMotionValue(0);
    const tiltY = useMotionValue(0);
    const rotateX = useSpring(tiltX, { stiffness: 150, damping: 20 });
    const rotateY = useSpring(tiltY, { stiffness: 150, damping: 20 });
    const onHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        tiltX.set(((e.clientY - r.top) / r.height - 0.5) * -8);
        tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 10);
    };
    const onHeroMouseLeave = () => { tiltX.set(0); tiltY.set(0); };
```

(±4° X, ±5° Y — subtle. Springs settle back to flat on leave.)

- [ ] **Step 2: Attach tilt to the card cluster**

Change the cluster wrapper (line ~298):

```tsx
                        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.3 }} className="relative hidden lg:block">
```

to:

```tsx
                        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.3 }}
                            onMouseMove={onHeroMouseMove} onMouseLeave={onHeroMouseLeave}
                            style={{ rotateX, rotateY, transformPerspective: 900 }}
                            className="relative hidden lg:block">
```

(Entrance animation animates `x`/`opacity`; the style motion values own `rotateX`/`rotateY` — no conflict. Both start at 0 so SSR markup is unchanged.)

- [ ] **Step 3: Verify**

Run: `npm run type-check` → exit 0.
Run: `npx vitest run` → 91 green.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat(saas-landing): mouse-parallax tilt on hero dashboard mockup"
```

---

### Task 3: Scroll-progress-linked features section

**Files:**
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `useScroll` (already imported), `useSpring`, `useReducedMotion` via the `reduced` const from Task 2, `S` palette const, `featuresRef` hook added here.
- Produces: nothing consumed later.

- [ ] **Step 1: Add scroll progress state**

Inside `SaaSLandingPage`, directly after the tilt block from Task 2:

```tsx
    const featuresRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress: featProgress } = useScroll({ target: featuresRef, offset: ['start 0.8', 'end 0.35'] });
    const featLine = useSpring(featProgress, { stiffness: 90, damping: 24 });
```

- [ ] **Step 2: Wrap the features list with the progress line**

Change the features list container (line ~426):

```tsx
                    <div className="space-y-0">
                        {features.map((f, i) => (
```

to:

```tsx
                    <div ref={featuresRef} className="relative">
                        <div className="hidden lg:block absolute -left-8 top-0 bottom-0 w-px pointer-events-none" style={{ background: 'rgba(212,163,76,0.12)' }} />
                        <motion.div className="hidden lg:block absolute -left-8 top-0 bottom-0 w-px origin-top pointer-events-none"
                            style={{ background: `linear-gradient(180deg,${S.amber},${S.amberLight})`, scaleY: reduced ? 1 : featLine, boxShadow: '0 0 12px rgba(212,163,76,0.5)' }} />
                        <div className="space-y-0">
                            {features.map((f, i) => (
```

…and close the new wrapper: the features list's existing closing `</div>` (after the `.map`) gets one more `</div>` after it (indent the moved list one level if formatting matters; JSX nesting is what counts). Final shape:

```tsx
                    <div ref={featuresRef} className="relative">
                        {/* track + progress line as above */}
                        <div className="space-y-0">
                            {/* existing features.map rows — unchanged */}
                        </div>
                    </div>
```

(The faint track is always visible on lg+; the gold line grows top→down as the section scrolls through the viewport. `scaleY` accepts a plain `1` when `reduced` is truthy — static fully-drawn line. `reduced` is `null` on server and first client render, so SSR/client both render `scaleY(0)` initially — no hydration mismatch.)

- [ ] **Step 3: Verify**

Run: `npm run type-check` → exit 0.
Run: `npx vitest run` → 91 green.
Self-check: feature row markup byte-identical; new layers are `pointer-events-none`.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat(saas-landing): scroll-progress-linked features section"
```

---

### Task 4: Phase gate

- [ ] **Step 1:** From `frontend/`: `npm run type-check && npx vitest run && npm run build` — all exit 0, 91 tests.
- [ ] **Step 2:** Manual smoke on dev server (`BACKEND_API_ORIGIN=http://127.0.0.1:8000 NEXT_PUBLIC_API_URL=/api npm run dev -- --hostname 127.0.0.1 --port 3000`, open `http://127.0.0.1:3000/`): CTAs pull toward cursor and spring back; mockup tilts with mouse and settles flat; gold line draws while scrolling the features list; with OS reduced-motion on, all three are static.
- [ ] **Step 3:** From repo root: `graphify update .`

---

## Self-review notes

- Spec coverage: magnetic CTAs ✓ (Task 1); tilting hero mockup with mouse-parallax ✓ (Task 2); scroll-progress-linked feature section ✓ (Task 3). Exclusions (nav/pricing buttons, no screenshot asset, no new unit tests) documented as sanctioned adaptations.
- Type consistency: `Magnetic` defined once (Task 1) and only used in Task 1; `reduced` defined in Task 2 and reused in Task 3 — Task 3 depends on Task 2's Step 1 (execution order is 1→2→3; if reordered, move the `reduced` line with it).
- All new motion is transform-only on GPU-composited layers; infinite loops none (tilt/magnetic are input-driven; line is scroll-driven).
- No placeholders: every step carries the exact code or exact command + expected result.
