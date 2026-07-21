// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
let mockPathname = '/student';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => mockPathname,
}));

import { CommandPalette } from '@/components/command-palette';
import { setSessionUser } from '@/lib/auth';

function signIn(role: string) {
    setSessionUser({
        user_id: 'u-1',
        username: 'user',
        role,
        staff_role: '',
        email: 'u@school.test',
        first_name: 'U',
        last_name: 'Ser',
        tenant_id: 't',
        tenant_schema: 'demo',
        exp: Math.floor(Date.now() / 1000) + 3600,
    });
}

function openPalette() {
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
}

beforeEach(() => {
    localStorage.clear();
    pushMock.mockClear();
    mockPathname = '/student';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('CommandPalette', () => {
    it('renders nothing for anonymous visitors', () => {
        render(<CommandPalette />);
        openPalette();
        expect(screen.queryByPlaceholderText('Where do you want to go?')).toBeNull();
    });

    it('opens with cmd+k for a signed-in student', () => {
        signIn('student');
        render(<CommandPalette />);
        openPalette();
        expect(screen.getByPlaceholderText('Where do you want to go?')).toBeTruthy();
        expect(screen.getByText('AI Tutor')).toBeTruthy();
    });

    it('shows role-specific destinations only', () => {
        signIn('teacher');
        mockPathname = '/teacher';
        render(<CommandPalette />);
        openPalette();
        expect(screen.getByText('Grading')).toBeTruthy();
        expect(screen.queryByText('AI Tutor')).toBeNull();
    });

    it('navigates on selection and closes', () => {
        signIn('student');
        render(<CommandPalette />);
        openPalette();
        fireEvent.click(screen.getByText('AI Tutor'));
        expect(pushMock).toHaveBeenCalledWith('/student/ai-tutor');
    });

    it('filters items by search input', () => {
        signIn('student');
        render(<CommandPalette />);
        openPalette();
        fireEvent.change(screen.getByPlaceholderText('Where do you want to go?'), {
            target: { value: 'leaderboard' },
        });
        expect(screen.getByText('Leaderboard')).toBeTruthy();
        expect(screen.queryByText('Courses')).toBeNull();
    });

    it('does not mount outside portal routes', () => {
        signIn('student');
        mockPathname = '/login';
        render(<CommandPalette />);
        openPalette();
        expect(screen.queryByPlaceholderText('Where do you want to go?')).toBeNull();
    });

    it('hides saas staff management from saas_staff', () => {
        signIn('saas_staff');
        mockPathname = '/saas';
        render(<CommandPalette />);
        openPalette();
        expect(screen.getByText('Schools')).toBeTruthy();
        expect(screen.queryByText('Staff')).toBeNull();
    });
});
