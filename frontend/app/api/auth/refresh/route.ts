// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
    REFRESH_COOKIE,
    clearAuthCookies,
    resolveBackendOrigin,
    setAuthCookies,
    userFromAccessToken,
} from '@/lib/server/auth-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const refresh = request.cookies.get(REFRESH_COOKIE)?.value || '';
    if (!refresh) {
        return NextResponse.json({ ok: false, code: 'no_refresh_token' }, { status: 401 });
    }

    const backendOrigin = resolveBackendOrigin();
    if (!backendOrigin) {
        return NextResponse.json(
            { code: 'backend_origin_missing', message: 'Set BACKEND_API_ORIGIN to the backend origin.' },
            { status: 500 },
        );
    }

    const headers = new Headers({ 'content-type': 'application/json' });
    const tenantHeader = request.headers.get('x-tenant-id');
    if (tenantHeader) headers.set('x-tenant-id', tenantHeader);
    const host = request.headers.get('host');
    if (host) {
        headers.set('x-tenant-host', host);
        headers.set('x-forwarded-host', host);
    }

    let upstream: Response;
    try {
        upstream = await fetch(`${backendOrigin}/api/users/refresh/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ refresh }),
            cache: 'no-store',
        });
    } catch (error) {
        return NextResponse.json(
            {
                code: 'backend_proxy_failed',
                message: 'Token refresh request failed.',
                detail: error instanceof Error ? error.message : 'Unknown upstream error',
            },
            { status: 502 },
        );
    }

    let data: { access?: string; refresh?: string } = {};
    try {
        data = (await upstream.json()) as typeof data;
    } catch {
        data = {};
    }

    if (!upstream.ok || !data.access) {
        // Refresh token rejected (expired, blacklisted) — end the session.
        const response = NextResponse.json({ ok: false, code: 'refresh_rejected' }, { status: 401 });
        clearAuthCookies(response);
        return response;
    }

    const user = userFromAccessToken(data.access);
    const response = NextResponse.json({ ok: true, user });
    response.headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
    setAuthCookies(response, request, { access: data.access, refresh: data.refresh });
    return response;
}
