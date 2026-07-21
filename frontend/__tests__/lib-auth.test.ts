// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getUser, isAuthenticated, removeTokens, setSessionUser } from '@/lib/auth';

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;
const PAST_EXP = Math.floor(Date.now() / 1000) - 60;

function sessionUser(overrides: Record<string, unknown> = {}) {
    return {
        user_id: 'u-1',
        username: 'student1',
        role: 'student',
        staff_role: '' as const,
        email: 's@school.test',
        first_name: 'Stu',
        last_name: 'Dent',
        tenant_id: 't-1',
        tenant_schema: 'demo',
        exp: FUTURE_EXP,
        ...overrides,
    };
}

beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('session user cache', () => {
    it('round-trips the identity payload', () => {
        setSessionUser(sessionUser());
        expect(getUser()?.role).toBe('student');
        expect(getUser()?.tenant_schema).toBe('demo');
    });

    it('returns null when nothing is stored', () => {
        expect(getUser()).toBeNull();
    });

    it('drops corrupted cache entries instead of throwing', () => {
        localStorage.setItem('user_info', '{not json');
        expect(getUser()).toBeNull();
        expect(localStorage.getItem('user_info')).toBeNull();
    });

    it('scrubs legacy token keys when a session is stored', () => {
        // Pre-httpOnly clients kept raw JWTs in localStorage.
        localStorage.setItem('access_token', 'legacy.jwt.value');
        localStorage.setItem('refresh_token', 'legacy.jwt.value');
        setSessionUser(sessionUser());
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(localStorage.getItem('refresh_token')).toBeNull();
    });
});

describe('isAuthenticated', () => {
    it('is true for an unexpired session', () => {
        setSessionUser(sessionUser());
        expect(isAuthenticated()).toBe(true);
    });

    it('is false once exp has passed', () => {
        setSessionUser(sessionUser({ exp: PAST_EXP }));
        expect(isAuthenticated()).toBe(false);
    });

    it('is false with no session', () => {
        expect(isAuthenticated()).toBe(false);
    });
});

describe('removeTokens', () => {
    it('clears the cache and calls the server logout endpoint', () => {
        setSessionUser(sessionUser());
        localStorage.setItem('tenant_id', 'demo');
        removeTokens();

        expect(getUser()).toBeNull();
        expect(localStorage.getItem('tenant_id')).toBeNull();
        expect(fetch).toHaveBeenCalledWith(
            '/api/auth/logout',
            expect.objectContaining({ method: 'POST' }),
        );
    });
});
