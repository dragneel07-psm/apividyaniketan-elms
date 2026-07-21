// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return { ...actual, useReducedMotion: () => true, useInView: () => true };
});

import { AnimatedCounter } from '@/components/interactive/animated-counter';
import { Sparkline } from '@/components/interactive/sparkline';

describe('AnimatedCounter prefix', () => {
    it('renders prefix before the formatted value', () => {
        render(<AnimatedCounter value={5000} locale="en" prefix="$" />);
        expect(screen.getByText('$5,000')).toBeTruthy();
    });

    it('renders prefix and suffix together', () => {
        render(<AnimatedCounter value={75} locale="en" prefix="~" suffix="%" />);
        expect(screen.getByText('~75%')).toBeTruthy();
    });
});

describe('Sparkline valueFormatter', () => {
    it('accepts a valueFormatter and still renders the chart', () => {
        render(
            <Sparkline
                data={[{ label: 'a', value: 1 }, { label: 'b', value: 2 }]}
                valueFormatter={(v) => `${v}%`}
            />,
        );
        expect(screen.getByTestId('sparkline')).toBeTruthy();
    });
});
