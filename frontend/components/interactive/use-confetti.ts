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
