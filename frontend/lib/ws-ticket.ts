// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
/**
 * WebSocket auth tickets.
 *
 * Auth tokens live in httpOnly cookies the browser cannot read, and browsers
 * cannot attach cookies or headers to cross-origin WebSocket upgrades. So
 * before opening a socket, clients exchange their cookie session for a ~60s
 * single-purpose JWT (POST /api/users/ws-ticket/, proxied same-origin) and
 * pass it as ?token=<ticket> in the WS URL.
 */
import { getTenantFromSubdomain } from '@/lib/tenant';

function resolveTenantId(): string {
    if (typeof window === 'undefined') return 'public';
    const cached = (localStorage.getItem('tenant_id') || '').trim().toLowerCase();
    if (cached && cached !== 'localhost') return cached;
    const fromSubdomain = (getTenantFromSubdomain(window.location.hostname) || '').trim().toLowerCase();
    if (fromSubdomain && fromSubdomain !== 'localhost') return fromSubdomain;
    return 'public';
}

export async function fetchWsTicket(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    try {
        const res = await fetch('/api/users/ws-ticket/', {
            method: 'POST',
            headers: { 'x-tenant-id': resolveTenantId() },
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { token?: string };
        return data.token || null;
    } catch {
        return null;
    }
}
