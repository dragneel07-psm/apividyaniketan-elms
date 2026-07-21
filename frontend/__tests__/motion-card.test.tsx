// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return { ...actual, useReducedMotion: () => true };
});

import { MotionCard } from '@/components/interactive/motion-card';
import { Stagger } from '@/components/interactive/stagger';

describe('MotionCard', () => {
    it('renders children and forwards className to the card', () => {
        render(<MotionCard className="rounded-2xl border-0">hello</MotionCard>);
        const el = screen.getByText('hello');
        expect(el).toBeTruthy();
        expect(el.className).toContain('rounded-2xl');
    });

    it('forwards onClick', () => {
        const onClick = vi.fn();
        render(<MotionCard onClick={onClick}>tap</MotionCard>);
        fireEvent.click(screen.getByText('tap'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

describe('Stagger', () => {
    it('renders all children', () => {
        render(
            <Stagger className="space-y-3">
                <div>one</div>
                <div>two</div>
            </Stagger>,
        );
        expect(screen.getByText('one')).toBeTruthy();
        expect(screen.getByText('two')).toBeTruthy();
    });
});
