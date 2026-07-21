// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const animateSpy = vi.fn();

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    const wrappedAnimate = (...args: Parameters<typeof actual.animate>) => {
        animateSpy(...args);
        return actual.animate(...args);
    };
    return {
        ...actual,
        animate: wrappedAnimate,
        useReducedMotion: () => false,
        useInView: () => true,
    };
});

import { MotionCard } from '@/components/interactive/motion-card';
import { Stagger } from '@/components/interactive/stagger';
import { AnimatedCounter } from '@/components/interactive/animated-counter';
import { ProgressRing } from '@/components/interactive/progress-ring';

describe('non-reduced-motion paths', () => {
    beforeEach(() => {
        animateSpy.mockClear();
    });

    it('MotionCard mounts through the motion wrapper (entrance opacity 0)', () => {
        const { container } = render(<MotionCard className="rounded-2xl">content</MotionCard>);
        const wrapper = container.firstElementChild as HTMLElement;
        // In the animated branch the root is the motion.div with initial opacity 0.
        expect(wrapper.style.opacity).toBe('0');
        expect(screen.getByText('content')).toBeTruthy();
    });

    it('Stagger wraps each child in an animated wrapper (entrance opacity 0)', () => {
        const { container } = render(
            <Stagger>
                <div>a</div>
                <div>b</div>
            </Stagger>,
        );
        const wrappers = Array.from((container.firstElementChild as HTMLElement).children) as HTMLElement[];
        expect(wrappers).toHaveLength(2);
        for (const w of wrappers) expect(w.style.opacity).toBe('0');
    });

    it('AnimatedCounter animates and settles on the final formatted value', async () => {
        render(<AnimatedCounter value={1234} locale="en" durationMs={50} />);
        await waitFor(() => expect(screen.getByText('1,234')).toBeTruthy(), { timeout: 3000 });
        expect(animateSpy).toHaveBeenCalledWith(0, 1234, expect.anything());
    });

    it('ProgressRing sweeps the arc to the target offset', async () => {
        const { container } = render(<ProgressRing value={50} size={100} strokeWidth={10} />);
        const circles = container.querySelectorAll('circle');
        const arc = circles[circles.length - 1];
        // r = (100-10)/2 = 45; C = 2π·45 ≈ 282.743; target = C·(1-0.5) ≈ 141.372
        const target = 2 * Math.PI * 45 * 0.5;
        await waitFor(() => {
            const offset = Number(arc.getAttribute('stroke-dashoffset'));
            expect(Math.abs(offset - target)).toBeLessThan(1);
        }, { timeout: 3000 });
        const circumference = 2 * Math.PI * 45;
        expect(animateSpy).toHaveBeenCalledWith(circumference, target, expect.anything());
    });
});
