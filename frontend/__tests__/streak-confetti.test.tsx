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
