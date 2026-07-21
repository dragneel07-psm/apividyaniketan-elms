// @vitest-environment node
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
/**
 * Route-guard tests for proxy.ts (the Next.js middleware).
 *
 * These pin down the role-based access matrix: which dashboard prefixes
 * each role may enter, where unauthenticated users land, and that
 * expired/invalid tokens clear cookies instead of looping.
 */
import { SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from '@/proxy';

const SECRET = new TextEncoder().encode('proxy-test-secret');
const TENANT_HOST = 'demo.manyaltech.com';
const SAAS_HOST = 'manyaltech.com';

async function token(role: string, expiresIn = '1h'): Promise<string> {
    return new SignJWT({ user_id: 'u-1', username: 'user', role })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(expiresIn)
        .sign(SECRET);
}

async function request(path: string, opts: { role?: string; host?: string; expired?: boolean } = {}) {
    const host = opts.host ?? TENANT_HOST;
    const headers = new Headers({ host });
    if (opts.role) {
        const jwt = await token(opts.role, opts.expired ? '-1h' : '1h');
        headers.set('cookie', `access_token=${jwt}`);
    }
    return new NextRequest(`https://${host}${path}`, { headers });
}

function redirectPath(response: Response): string | null {
    const location = response.headers.get('location');
    return location ? new URL(location).pathname : null;
}

describe('unauthenticated access', () => {
    it('redirects protected tenant routes to /login', async () => {
        const response = await proxy(await request('/student'));
        expect(response.status).toBeGreaterThanOrEqual(307);
        expect(redirectPath(response)).toBe('/login');
    });

    it('redirects protected SaaS-host routes to /saas-login', async () => {
        const response = await proxy(await request('/saas', { host: SAAS_HOST }));
        expect(redirectPath(response)).toBe('/saas-login');
    });

    it('keeps auth pages reachable', async () => {
        const response = await proxy(await request('/login'));
        expect(response.headers.get('location')).toBeNull();
    });

    it('no longer treats /debug-auth as public (Sprint 1 regression)', async () => {
        const response = await proxy(await request('/debug-auth'));
        expect(redirectPath(response)).toBe('/login');
    });
});

describe('role guards', () => {
    const cases: Array<{ path: string; role: string; allowed: boolean }> = [
        { path: '/admin', role: 'admin', allowed: true },
        { path: '/admin', role: 'staff', allowed: true },
        { path: '/admin', role: 'student', allowed: false },
        { path: '/admin', role: 'teacher', allowed: false },
        { path: '/teacher', role: 'teacher', allowed: true },
        { path: '/teacher', role: 'student', allowed: false },
        { path: '/student', role: 'student', allowed: true },
        { path: '/student', role: 'parent', allowed: false },
        // Teachers may preview the student course view only.
        { path: '/student/courses', role: 'teacher', allowed: true },
        { path: '/student/grades', role: 'teacher', allowed: false },
        { path: '/parent', role: 'parent', allowed: true },
        { path: '/parent', role: 'student', allowed: false },
    ];

    for (const { path, role, allowed } of cases) {
        it(`${role} ${allowed ? 'may' : 'may not'} enter ${path}`, async () => {
            const response = await proxy(await request(path, { role }));
            if (allowed) {
                expect(response.headers.get('location')).toBeNull();
            } else {
                expect(redirectPath(response)).toBe('/unauthorized');
            }
        });
    }

    it('saas routes require a saas role', async () => {
        const response = await proxy(await request('/saas', { role: 'admin', host: SAAS_HOST }));
        expect(redirectPath(response)).toBe('/unauthorized');
    });

    it('saas staff management is saas_admin only', async () => {
        const response = await proxy(
            await request('/saas/staff', { role: 'saas_staff', host: SAAS_HOST }),
        );
        expect(redirectPath(response)).toBe('/unauthorized');
    });
});

describe('root dashboard redirect', () => {
    const map: Array<[string, string]> = [
        ['admin', '/admin'],
        ['staff', '/admin'],
        ['teacher', '/teacher'],
        ['student', '/student'],
        ['parent', '/parent'],
    ];

    for (const [role, target] of map) {
        it(`sends ${role} from / to ${target}`, async () => {
            const response = await proxy(await request('/', { role }));
            expect(redirectPath(response)).toBe(target);
        });
    }
});

describe('expired sessions', () => {
    it('redirects to login and clears auth cookies', async () => {
        const response = await proxy(await request('/student', { role: 'student', expired: true }));
        expect(redirectPath(response)).toBe('/login');
        const setCookies = response.headers.getSetCookie?.() ?? [];
        const cleared = setCookies.filter(
            (cookie) => cookie.startsWith('access_token=;') || cookie.startsWith('refresh_token=;'),
        );
        expect(cleared.length).toBeGreaterThan(0);
    });
});
