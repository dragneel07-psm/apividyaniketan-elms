// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
/**
 * Server-side session helpers for the Next.js auth route handlers
 * (/api/auth/login, /api/auth/refresh, /api/auth/logout).
 *
 * Tokens are stored exclusively in httpOnly cookies so they are never
 * readable by client-side JavaScript (XSS cannot exfiltrate them). The
 * /api/[...path] proxy re-attaches them as Authorization headers when
 * forwarding requests to the Django backend.
 */
import { decodeJwt } from 'jose';
import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export function resolveBackendOrigin(): string {
    const raw = process.env.BACKEND_API_ORIGIN || process.env.API_PROXY_TARGET || '';
    const candidates = raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    const selected = candidates.find((item) => /^https?:\/\//i.test(item)) || '';
    if (!selected) return '';
    return selected.replace(/\/+$/, '').replace(/\/api$/i, '');
}

function isSecureRequest(request: NextRequest): boolean {
    const forwardedProto = (request.headers.get('x-forwarded-proto') || '').toLowerCase();
    if (forwardedProto) return forwardedProto.includes('https');
    return request.nextUrl.protocol === 'https:';
}

/**
 * SaaS users on the apex/www host share auth cookies across the marketing
 * domain via a domain-scoped cookie; tenant subdomains stay host-scoped so
 * one school's session never leaks to another school's host.
 */
function sharedCookieDomainFor(request: NextRequest): string | undefined {
    const sharedDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.manyaltech.com';
    const apex = sharedDomain.replace(/^\./, '');
    const host = (request.headers.get('host') || '').split(':')[0].trim().toLowerCase();
    if (host === apex || host === `www.${apex}`) return sharedDomain;
    return undefined;
}

function cookieMaxAgeFromJwt(token: string, fallbackSeconds: number): number {
    try {
        const { exp } = decodeJwt(token);
        if (typeof exp === 'number') {
            const remaining = Math.floor(exp - Date.now() / 1000);
            if (remaining > 0) return remaining;
        }
    } catch {
        // Fall through to the fallback lifetime.
    }
    return fallbackSeconds;
}

export function setAuthCookies(
    response: NextResponse,
    request: NextRequest,
    tokens: { access: string; refresh?: string },
): void {
    const secure = isSecureRequest(request);
    const domain = sharedCookieDomainFor(request);
    const base = {
        httpOnly: true,
        secure,
        sameSite: 'lax' as const,
        path: '/',
        ...(domain ? { domain } : {}),
    };

    response.cookies.set(ACCESS_COOKIE, tokens.access, {
        ...base,
        maxAge: cookieMaxAgeFromJwt(tokens.access, 60 * 60),
    });
    if (tokens.refresh) {
        response.cookies.set(REFRESH_COOKIE, tokens.refresh, {
            ...base,
            maxAge: cookieMaxAgeFromJwt(tokens.refresh, 60 * 60 * 24 * 7),
        });
    }
}

export function clearAuthCookies(response: NextResponse): void {
    const expired = { path: '/', expires: new Date(0) };
    const sharedDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.manyaltech.com';
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
        response.cookies.set(name, '', expired);
        response.cookies.set(name, '', { ...expired, domain: sharedDomain });
    }
}

/** Decode the non-secret identity claims so clients can render role/name without the token. */
export function userFromAccessToken(access: string): Record<string, unknown> | null {
    try {
        const claims = decodeJwt(access);
        return {
            user_id: claims.user_id ?? '',
            username: claims.username ?? '',
            email: claims.email ?? '',
            first_name: claims.first_name ?? '',
            last_name: claims.last_name ?? '',
            role: claims.role ?? '',
            staff_role: claims.staff_role ?? '',
            tenant_id: claims.tenant_id ?? '',
            tenant_schema: claims.tenant_schema ?? '',
            exp: claims.exp ?? 0,
        };
    } catch {
        return null;
    }
}

/**
 * Forward a credential-issuing POST (login, 2FA activate) to the backend and
 * convert any returned token pair into httpOnly cookies. Token values are
 * stripped from the body the browser sees; `ok: true` plus the decoded user
 * take their place.
 */
export async function proxyCredentialEndpoint(
    request: NextRequest,
    backendPath: string,
): Promise<{ status: number; body: Record<string, unknown>; tokens?: { access: string; refresh?: string } }> {
    const backendOrigin = resolveBackendOrigin();
    if (!backendOrigin) {
        return {
            status: 500,
            body: {
                code: 'backend_origin_missing',
                message: 'Set BACKEND_API_ORIGIN (or API_PROXY_TARGET) to the backend origin.',
            },
        };
    }

    const headers = new Headers({ 'content-type': 'application/json' });
    const tenantHeader = request.headers.get('x-tenant-id');
    if (tenantHeader) headers.set('x-tenant-id', tenantHeader);
    const host = request.headers.get('host');
    if (host) {
        headers.set('x-tenant-host', host);
        headers.set('x-forwarded-host', host);
    }
    headers.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', ''));

    let upstream: Response;
    try {
        upstream = await fetch(`${backendOrigin}${backendPath}`, {
            method: 'POST',
            headers,
            body: await request.arrayBuffer(),
            cache: 'no-store',
        });
    } catch (error) {
        return {
            status: 502,
            body: {
                code: 'backend_proxy_failed',
                message: 'Backend authentication request failed.',
                detail: error instanceof Error ? error.message : 'Unknown upstream error',
            },
        };
    }

    let data: Record<string, unknown> = {};
    try {
        data = (await upstream.json()) as Record<string, unknown>;
    } catch {
        data = {};
    }

    const access = typeof data.access === 'string' ? data.access : '';
    const refresh = typeof data.refresh === 'string' ? data.refresh : undefined;

    if (upstream.ok && access) {
        const rest: Record<string, unknown> = { ...data };
        delete rest.access;
        delete rest.refresh;
        const user = (data.user as Record<string, unknown> | undefined) ?? userFromAccessToken(access) ?? undefined;
        return {
            status: upstream.status,
            body: { ...rest, ok: true, user },
            tokens: { access, refresh },
        };
    }

    // Pass through 2FA pre-flights, validation errors, lockouts, etc.
    return { status: upstream.status, body: data };
}
