// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return { ...actual, useReducedMotion: () => true };
});

import { Sparkline } from '@/components/interactive/sparkline';
import { TrendChart } from '@/components/interactive/trend-chart';

const data = [
    { label: 'Jan', value: 70 },
    { label: 'Feb', value: 82 },
    { label: 'Mar', value: 78 },
];

describe('Sparkline', () => {
    it('renders a chart container when data is present', () => {
        render(<Sparkline data={data} />);
        expect(screen.getByTestId('sparkline')).toBeTruthy();
    });

    it('renders a flat placeholder for empty data', () => {
        render(<Sparkline data={[]} />);
        expect(screen.getByTestId('sparkline-empty')).toBeTruthy();
    });
});

describe('TrendChart', () => {
    it('renders a chart container when data is present', () => {
        render(<TrendChart data={data} />);
        expect(screen.getByTestId('trendchart')).toBeTruthy();
    });

    it('renders a placeholder for empty data', () => {
        render(<TrendChart data={[]} />);
        expect(screen.getByTestId('trendchart-empty')).toBeTruthy();
    });
});
