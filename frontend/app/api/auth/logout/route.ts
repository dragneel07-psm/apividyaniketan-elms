// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/server/auth-session';

export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
    const response = NextResponse.json({ ok: true });
    response.headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
    clearAuthCookies(response);
    return response;
}
