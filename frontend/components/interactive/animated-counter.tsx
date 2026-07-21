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
    prefix?: string;
    suffix?: string;
    className?: string;
    durationMs?: number;
};

export function AnimatedCounter({ value, locale, prefix = '', suffix = '', className, durationMs = 900 }: AnimatedCounterProps) {
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
            {prefix}{formatNumber(display, locale)}{suffix}
        </span>
    );
}
