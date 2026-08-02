// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Signature motif referencing the sayapatri (marigold) garlands used across
 * Nepal to welcome and honor guests — a strand of overlapping marigold
 * heads threaded on a string. Marks key thresholds only (page open, page
 * close), never repeated as generic decoration.
 */
export function GarlandDivider({ className, flip = false }: { className?: string; flip?: boolean }) {
    const uid = `garland-${useId().replace(/:/g, '')}`;
    return (
        <svg
            viewBox="0 0 64 28"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            className={cn('h-7 w-full', flip && 'rotate-180', className)}
        >
            <defs>
                <pattern id={uid} width="16" height="28" patternUnits="userSpaceOnUse">
                    <line x1="8" y1="0" x2="8" y2="10" stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.6" />
                    <g transform="translate(8 15)">
                        <circle r="6.4" className="fill-school-marigold" />
                        <circle r="6.4" cx="6" className="fill-school-terracotta" fillOpacity="0.85" />
                        <circle r="3.4" className="fill-school-marigold-dark" fillOpacity="0.9" />
                    </g>
                </pattern>
            </defs>
            <rect width="64" height="28" fill={`url(#${uid})`} />
        </svg>
    );
}
