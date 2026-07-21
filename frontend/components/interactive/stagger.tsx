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
