// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { proxyCredentialEndpoint, setAuthCookies } from '@/lib/server/auth-session';

export const dynamic = 'force-dynamic';

// 2FA activation re-authenticates with email+password+TOTP and, like login,
// returns a token pair that must land in httpOnly cookies.
export async function POST(request: NextRequest): Promise<NextResponse> {
    const result = await proxyCredentialEndpoint(request, '/api/users/2fa/activate/');
    const response = NextResponse.json(result.body, { status: result.status });
    response.headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
    if (result.tokens) {
        setAuthCookies(response, request, result.tokens);
    }
    return response;
}
