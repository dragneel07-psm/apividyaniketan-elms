// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { cn } from '@/lib/utils';

/**
 * Signature scalloped divider referencing marigold (sayapatri) garlands
 * used to welcome guests — marks key section transitions only, not
 * decoration repeated everywhere.
 */
export function GarlandDivider({ className, flip = false }: { className?: string; flip?: boolean }) {
    return (
        <svg
            viewBox="0 0 240 20"
            preserveAspectRatio="none"
            aria-hidden="true"
            className={cn('h-4 w-full text-school-marigold', flip && 'rotate-180', className)}
        >
            <path
                d="M0 0 Q10 20 20 0 Q30 20 40 0 Q50 20 60 0 Q70 20 80 0 Q90 20 100 0 Q110 20 120 0 Q130 20 140 0 Q150 20 160 0 Q170 20 180 0 Q190 20 200 0 Q210 20 220 0 Q230 20 240 0"
                fill="currentColor"
            />
        </svg>
    );
}
