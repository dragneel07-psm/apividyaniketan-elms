// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return { ...actual, useReducedMotion: () => true };
});

import { ProgressRing } from '@/components/interactive/progress-ring';

describe('ProgressRing', () => {
    it('exposes clamped value via aria and renders center content', () => {
        render(<ProgressRing value={87}><span>87%</span></ProgressRing>);
        const bar = screen.getByRole('progressbar');
        expect(bar.getAttribute('aria-valuenow')).toBe('87');
        expect(screen.getByText('87%')).toBeTruthy();
    });

    it('clamps out-of-range and non-finite values', () => {
        render(<ProgressRing value={250} />);
        expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    });

    it('clamps NaN to 0', () => {
        render(<ProgressRing value={NaN} />);
        expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    });
});
