// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { animate, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, ReactNode } from 'react';

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
    const circleRef = useRef<SVGCircleElement>(null);
    const inView = useInView(circleRef, { once: true, margin: '-40px' });

    useEffect(() => {
        if (!inView || reduced) return;
        const controls = animate(circumference, targetOffset, {
            duration: 1,
            ease: 'easeOut',
            onUpdate: (v) => circleRef.current?.setAttribute('stroke-dashoffset', String(v)),
        });
        return () => controls.stop();
    }, [inView, reduced, circumference, targetOffset]);

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
                <circle
                    ref={circleRef}
                    cx={size / 2} cy={size / 2} r={radius}
                    strokeWidth={strokeWidth} fill="none" strokeLinecap="round"
                    stroke="currentColor"
                    className={ringClassName}
                    strokeDasharray={circumference}
                    strokeDashoffset={targetOffset}
                />
            </svg>
            {children ? (
                <div className="absolute inset-0 flex items-center justify-center">{children}</div>
            ) : null}
        </div>
    );
}
