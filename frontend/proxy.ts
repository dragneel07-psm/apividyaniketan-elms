// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeJwt, jwtVerify } from 'jose';
import { getTenantFromSubdomain, isTenantHost } from './lib/tenant';

interface UserPayload {
    user_id: string;
    username: string;
    role: string;
    exp: number;
}

const PUBLIC_PATHS = [
    '/login',
    '/saas-login',
    '/register',
    '/contact',
    '/verify-email',
    '/public',
    '/forgot-password',
    '/reset-password',
    '/school',
    '/manifest.json',
    '/sw.js',
    '/icons/'
];

function clearAuthCookies(response: NextResponse): void {
    const expiredAt = new Date(0);
    const baseOptions = { path: '/', expires: expiredAt };

    // Host-scoped cookies
    response.cookies.set('access_token', '', baseOptions);
    response.cookies.set('refresh_token', '', baseOptions);
    response.cookies.set('tenant_id', '', baseOptions);

    // Domain-scoped cookies (used for SaaS auth across apex/www)
    // Always clear the .manyaltech.com domain cookie; also honour any explicit override.
    const sharedDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.manyaltech.com';
    response.cookies.set('access_token', '', { ...baseOptions, domain: sharedDomain });
    response.cookies.set('refresh_token', '', { ...baseOptions, domain: sharedDomain });
    response.cookies.set('tenant_id', '', { ...baseOptions, domain: sharedDomain });
}

function buildPublicRootResponse(request: NextRequest, requestHeaders: Headers, hostname: string): NextResponse {
    if (isTenantHost(hostname)) {
        const url = request.nextUrl.clone();
        url.pathname = '/school';
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
}

function getUserFromToken(token: string): UserPayload | null {
    try {
        const decoded = decodeJwt(token) as Partial<UserPayload>;
        if (!decoded || typeof decoded !== 'object') return null;

        return {
            user_id: String(decoded.user_id || ''),
            username: String(decoded.username || ''),
            role: String(decoded.role || 'student'),
            exp: Number(decoded.exp || 0),
        };
    } catch {
        return null;
    }
}

function normalizeTokenCandidate(rawValue: string): string {
    const raw = (rawValue || '').trim();
    if (!raw) return '';

    let decoded = raw;
    try {
        decoded = decodeURIComponent(raw);
    } catch {
        decoded = raw;
    }

    const normalized = decoded.trim();
    if (normalized.toLowerCase().startsWith('bearer ')) {
        return normalized.slice(7).trim();
    }
    return normalized;
}

function isLikelyJwt(token: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    return parts.every((part) => /^[A-Za-z0-9\-_]+$/.test(part));
}

function getLatestAccessToken(request: NextRequest): string | undefined {
    const allValues = request.cookies.getAll('access_token')
        .map((item) => normalizeTokenCandidate(item.value))
        .filter((value) => Boolean(value));

    if (allValues.length === 0) return undefined;

    // Prefer the newest cookie value that is parseable as JWT payload.
    for (let idx = allValues.length - 1; idx >= 0; idx -= 1) {
        const candidate = allValues[idx];
        if (getUserFromToken(candidate)) {
            return candidate;
        }
    }

    // Fall back to JWT-shaped token if payload parsing failed.
    for (let idx = allValues.length - 1; idx >= 0; idx -= 1) {
        const candidate = allValues[idx];
        if (isLikelyJwt(candidate)) {
            return candidate;
        }
    }

    return allValues[allValues.length - 1];
}

export async function proxy(request: NextRequest) {
    const { pathname, hostname } = request.nextUrl;

    // 1. Tenant Handling (Pass subdomain to headers)
    const requestHeaders = new Headers(request.headers);
    const tenantSubdomain = getTenantFromSubdomain(hostname);
    requestHeaders.set('x-tenant-id', (tenantSubdomain && tenantSubdomain !== 'localhost') ? tenantSubdomain : 'public');

    // 2. Auth Handling
    const token = getLatestAccessToken(request);
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/saas-login') || pathname.startsWith('/register');

    // Allow access to public paths
    if (pathname === '/' || PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
        if (pathname === '/' && !token) {
            return buildPublicRootResponse(request, requestHeaders, hostname);
        }
        // Route login pages to the correct portal based on host:
        //   /login      → tenant portals only (redirect to /saas-login on SaaS domain)
        //   /saas-login → SaaS domain only   (redirect to /login on tenant hosts)
        if (pathname.startsWith('/login') && !isTenantHost(hostname)) {
            return NextResponse.redirect(new URL('/saas-login', request.url));
        }
        if (pathname.startsWith('/saas-login') && isTenantHost(hostname)) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        if (isAuthPage) {
            return NextResponse.next({ request: { headers: requestHeaders } });
        }
        // For "/", continue into token check below so authenticated users get dashboard redirect.
        if (pathname !== '/') {
            return NextResponse.next({ request: { headers: requestHeaders } });
        }
    }

    // Redirect to login if no token on protected routes
    if (!token) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('[Proxy] No token found, redirecting to login');
        }
        // Route directly to the correct login page to avoid a double redirect:
        //   non-tenant hosts (SaaS domain, localhost) → /saas-login
        //   tenant hosts (school subdomains, custom domains) → /login
        const loginPath = isTenantHost(hostname) ? '/login' : '/saas-login';
        const loginUrl = new URL(loginPath, request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 3. Role & Expiry Check
    try {
        let user: UserPayload | null = getUserFromToken(token);

        // Prefer signature verification when secret is configured.
        // If verification cannot run (e.g. env mismatch), keep decoded payload as fallback.
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret) {
            try {
                const secretKey = new TextEncoder().encode(jwtSecret);
                const { payload } = await jwtVerify(token, secretKey);
                user = payload as unknown as UserPayload;
            } catch {
                // Keep decoded fallback to avoid login loops from transient/env issues.
            }
        }

        if (!user || !user.exp || !user.role) {
            throw new Error('Unable to validate access token');
        }

        const userRole = (user.role || 'student').toLowerCase();
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[Proxy] Parsed User: role=${userRole}, exp=${user.exp}`);
        }

        // Check expiration
        if (user.exp && user.exp * 1000 < Date.now()) {
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[Proxy] Token expired (exp ${user.exp * 1000} < now ${Date.now()})`);
            }
            const expiredLoginPath = isTenantHost(hostname) ? '/login' : '/saas-login';
            const response =
                pathname === '/'
                    ? buildPublicRootResponse(request, requestHeaders, hostname)
                    : isAuthPage
                        ? NextResponse.next({ request: { headers: requestHeaders } })
                        : NextResponse.redirect(new URL(expiredLoginPath, request.url));
            clearAuthCookies(response);
            return response;
        }

        // Role Protection Logic
        if (pathname.startsWith('/admin') && userRole !== 'admin' && userRole !== 'staff') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        if (pathname.startsWith('/saas') && userRole !== 'saas_admin' && userRole !== 'saas_staff') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        // Staff management is super-admin only
        if (pathname.startsWith('/saas/staff') && userRole !== 'saas_admin') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        if (pathname.startsWith('/teacher') && userRole !== 'teacher') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        if (pathname.startsWith('/student') && userRole !== 'student') {
            // Allow teachers to access the student course view for previewing lessons
            if (userRole === 'teacher' && pathname.startsWith('/student/courses')) {
                // Allowed
            } else {
                return NextResponse.redirect(new URL('/unauthorized', request.url));
            }
        }
        if (pathname.startsWith('/parent') && userRole !== 'parent') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }

        // Root redirect only: auth pages are handled client-side to avoid loops on stale cookies.
        if (pathname === '/') {
            const dashboardMap: Record<string, string> = {
                admin: '/admin',
                staff: '/admin',
                teacher: '/teacher',
                student: '/student',
                saas_admin: '/saas',
                saas_staff: '/saas',
                parent: '/parent'
            };
            const target = dashboardMap[userRole] || '/student';
            return NextResponse.redirect(new URL(target, request.url));
        }

    } catch (e) {
        console.error('[Proxy] JWT Decode/Verify error:', e);
        // Avoid auth-page redirect loops when cookie is invalid/stale.
        if (isAuthPage) {
            const response = NextResponse.next({
                request: { headers: requestHeaders }
            });
            clearAuthCookies(response);
            return response;
        }
        const errorLoginPath = isTenantHost(hostname) ? '/login' : '/saas-login';
        const response =
            pathname === '/'
                ? buildPublicRootResponse(request, requestHeaders, hostname)
                : NextResponse.redirect(new URL(errorLoginPath, request.url));
        clearAuthCookies(response);
        return response;
    }

    return NextResponse.next({
        request: { headers: requestHeaders }
    });
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|manifest.json|sw.js|favicon.ico|robots.txt|icons/).*)'],
};
