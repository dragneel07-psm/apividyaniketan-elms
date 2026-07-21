// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getTenantFromSubdomain } from '@/lib/tenant';

function normalizeApiBaseUrl(rawUrl: string): string {
    const rawNormalized = (rawUrl || '').trim().toLowerCase();
    if (rawNormalized === '/api' || rawNormalized === 'api' || rawNormalized === 'same-origin' || rawNormalized === 'same_origin' || rawNormalized === 'relative') {
        // Keep paths in callers untouched (most service callers already prefix "/api/...").
        return '';
    }

    const candidates = (rawUrl || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    const apiAbsoluteCandidate = candidates.find((item) => /^https?:\/\//i.test(item) && /\/api(\/|$)/i.test(item));
    let normalized = apiAbsoluteCandidate
        || candidates.find((item) => /^https?:\/\//i.test(item))
        || candidates.find((item) => !item.startsWith('/'))
        || (rawUrl || '').trim();
    if (!normalized) {
        normalized = 'http://localhost:8000';
    }

    if (normalized.startsWith('/')) {
        normalized = 'http://localhost:8000';
    }

    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `https://${normalized}`;
    }

    normalized = normalized.replace(/\/+$/, '');
    if (normalized.endsWith('/api')) {
        normalized = normalized.slice(0, -4);
    }

    return normalized;
}

const API_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

function readTenantHeader(config: { headers?: unknown }): string | null {
    const headers = config?.headers;
    if (!headers) return null;

    if (typeof headers === 'object' && headers !== null && 'get' in headers && typeof headers.get === 'function') {
        return headers.get('x-tenant-id') || headers.get('X-Tenant-Id') || null;
    }

    if (typeof headers === 'object' && headers !== null) {
        const recordHeaders = headers as Record<string, string | undefined>;
        return recordHeaders['x-tenant-id'] || recordHeaders['X-Tenant-Id'] || null;
    }

    return null;
}

// Add interceptor to include tenant context. Auth is handled by httpOnly
// cookies which the /api proxy converts into Authorization headers
// server-side — the browser never sees the tokens.
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        // Tenant Context — never overwrite an explicit request tenant
        const explicitTenant = (readTenantHeader(config) || '').trim().toLowerCase();
        if (!explicitTenant) {
            // Prefer the tenant cached at login time, fall back to subdomain detection
            const cachedTenant = (localStorage.getItem('tenant_id') || '').trim().toLowerCase();
            const subdomainTenant = (getTenantFromSubdomain(window.location.hostname) || '').trim().toLowerCase();
            // Use cached if available AND not 'localhost' (which means no tenant was resolved)
            const tenant = (cachedTenant && cachedTenant !== 'localhost')
                ? cachedTenant
                : (subdomainTenant && subdomainTenant !== 'localhost' ? subdomainTenant : null);
            config.headers['x-tenant-id'] = tenant || 'public';
        }
    }
    return config;
});

// Share one in-flight refresh across concurrent 401s so a burst of expired
// requests triggers a single /api/auth/refresh round trip.
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
    if (!refreshPromise) {
        refreshPromise = fetch('/api/auth/refresh', { method: 'POST' })
            .then((res) => res.ok)
            .catch(() => false)
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
}

type RetriableConfig = InternalAxiosRequestConfig & { _authRetried?: boolean };

// On 401, refresh the httpOnly session cookie once and replay the request.
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as RetriableConfig | undefined;
        const status = error.response?.status;
        const url = config?.url || '';
        const isAuthEndpoint = url.includes('/api/auth/') || url.includes('/api/users/login');

        if (typeof window !== 'undefined' && status === 401 && config && !config._authRetried && !isAuthEndpoint) {
            config._authRetried = true;
            const refreshed = await refreshSession();
            if (refreshed) {
                return api(config);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
