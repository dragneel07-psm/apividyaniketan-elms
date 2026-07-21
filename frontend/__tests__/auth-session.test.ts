// @vitest-environment node
// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';
import {
    clearAuthCookies,
    resolveBackendOrigin,
    setAuthCookies,
    userFromAccessToken,
} from '@/lib/server/auth-session';

const SECRET = new TextEncoder().encode('unit-test-secret');

async function makeJwt(claims: Record<string, unknown>, expiresIn = '1h'): Promise<string> {
    return new SignJWT(claims)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(expiresIn)
        .sign(SECRET);
}

afterEach(() => {
    delete process.env.BACKEND_API_ORIGIN;
    delete process.env.API_PROXY_TARGET;
});

describe('resolveBackendOrigin', () => {
    it('strips trailing slashes and /api suffix', () => {
        process.env.BACKEND_API_ORIGIN = 'https://api.example.com/api/';
        expect(resolveBackendOrigin()).toBe('https://api.example.com');
    });

    it('picks the first absolute URL from a comma list', () => {
        process.env.BACKEND_API_ORIGIN = 'not-a-url, https://backend.example.com';
        expect(resolveBackendOrigin()).toBe('https://backend.example.com');
    });

    it('returns empty string when unset', () => {
        expect(resolveBackendOrigin()).toBe('');
    });
});

describe('userFromAccessToken', () => {
    it('exposes only non-secret identity claims', async () => {
        const token = await makeJwt({
            user_id: 'u-9',
            username: 'teach',
            role: 'teacher',
            tenant_schema: 'demo',
        });
        const user = userFromAccessToken(token);
        expect(user).toMatchObject({ user_id: 'u-9', role: 'teacher', tenant_schema: 'demo' });
        expect(user?.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('returns null for garbage input', () => {
        expect(userFromAccessToken('not-a-jwt')).toBeNull();
    });
});

describe('setAuthCookies', () => {
    async function cookiesFor(host: string) {
        const access = await makeJwt({ user_id: 'u-1', role: 'student' });
        const refresh = await makeJwt({ user_id: 'u-1' }, '7d');
        const request = new NextRequest(`https://${host}/api/auth/login`, {
            headers: { host, 'x-forwarded-proto': 'https' },
        });
        const response = NextResponse.json({ ok: true });
        setAuthCookies(response, request, { access, refresh });
        return response.cookies;
    }

    it('stores both tokens as httpOnly secure cookies', async () => {
        const cookies = await cookiesFor('demo.manyaltech.com');
        for (const name of ['access_token', 'refresh_token']) {
            const cookie = cookies.get(name);
            expect(cookie, name).toBeDefined();
            // The entire point of the Sprint-1 migration: JS must never
            // be able to read these.
            expect(cookie?.httpOnly, `${name} httpOnly`).toBe(true);
            expect(cookie?.secure, `${name} secure`).toBe(true);
            expect(cookie?.sameSite).toBe('lax');
        }
    });

    it('scopes cookies to the host on tenant subdomains', async () => {
        const cookies = await cookiesFor('demo.manyaltech.com');
        expect(cookies.get('access_token')?.domain).toBeUndefined();
    });

    it('uses the shared domain on the apex host', async () => {
        const cookies = await cookiesFor('manyaltech.com');
        expect(cookies.get('access_token')?.domain).toBe('.manyaltech.com');
    });

    it('uses the shared domain on www', async () => {
        const cookies = await cookiesFor('www.manyaltech.com');
        expect(cookies.get('access_token')?.domain).toBe('.manyaltech.com');
    });
});

describe('clearAuthCookies', () => {
    it('expires both token cookies', () => {
        const response = NextResponse.json({ ok: true });
        clearAuthCookies(response);
        const access = response.cookies
            .getAll()
            .filter((cookie) => cookie.name === 'access_token');
        expect(access.length).toBeGreaterThan(0);
        for (const cookie of access) {
            expect(cookie.value).toBe('');
            expect(cookie.expires?.valueOf()).toBe(0);
        }
    });
});
