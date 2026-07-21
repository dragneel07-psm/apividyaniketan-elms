// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Reduced motion + always-in-view → counter must show the final value instantly.
vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return { ...actual, useReducedMotion: () => true, useInView: () => true };
});

import { AnimatedCounter } from '@/components/interactive/animated-counter';

describe('AnimatedCounter', () => {
    it('renders the final formatted value under reduced motion', () => {
        render(<AnimatedCounter value={1234} locale="en" />);
        expect(screen.getByText('1,234')).toBeTruthy();
    });

    it('appends the suffix', () => {
        render(<AnimatedCounter value={92} locale="en" suffix="%" />);
        expect(screen.getByText('92%')).toBeTruthy();
    });

    it('treats non-finite values as 0', () => {
        render(<AnimatedCounter value={NaN} locale="en" />);
        expect(screen.getByText('0')).toBeTruthy();
    });
});
