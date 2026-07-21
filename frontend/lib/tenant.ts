// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
// lib/tenant.ts

const MANAGED_HOST_SUFFIXES = [
    '.vercel.app',
    '.railway.app',
    '.up.railway.app',
];

const DEFAULT_PUBLIC_HOSTS = [
    'manyaltech.com',
    'www.manyaltech.com',
];

function normalizeHostname(hostname: string): string {
    return (hostname || '').trim().toLowerCase();
}

function getConfiguredPublicHosts(): Set<string> {
    const configured = (process.env.NEXT_PUBLIC_PUBLIC_HOSTS || process.env.NEXT_PUBLIC_APP_HOSTS || '')
        .split(',')
        .map((item) => normalizeHostname(item))
        .filter(Boolean);
    return new Set([...DEFAULT_PUBLIC_HOSTS, ...configured]);
}

export function isManagedHost(hostname: string): boolean {
    const normalizedHost = normalizeHostname(hostname);
    return MANAGED_HOST_SUFFIXES.some((suffix) => normalizedHost.endsWith(suffix));
}

export function isPublicHost(hostname: string): boolean {
    const normalizedHost = normalizeHostname(hostname);
    if (!normalizedHost) return false;
    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') return true;
    return getConfiguredPublicHosts().has(normalizedHost);
}

export const getTenantFromSubdomain = (hostname: string): string | null => {
    const normalizedHost = normalizeHostname(hostname);
    const parts = normalizedHost.split('.').filter(Boolean);

    if (!normalizedHost) return null;

    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
        return 'localhost';
    }

    // Handle demo.localhost
    if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
        return parts[0] === 'localhost' ? 'localhost' : parts[0];
    }

    // Ignore platform-managed hosts where first label is app name, not tenant.
    if (isManagedHost(normalizedHost)) {
        return null;
    }

    // tenant.example.com -> tenant (except reserved public labels)
    if (parts.length > 2) {
        const label = parts[0];
        if (label === 'www') return null;
        return label;
    }

    return null;
};

export function isTenantHost(hostname: string): boolean {
    const normalizedHost = normalizeHostname(hostname);
    const parts = normalizedHost.split('.').filter(Boolean);

    if (!normalizedHost) return false;
    if (isPublicHost(normalizedHost)) return false;
    if (isManagedHost(normalizedHost)) return false;

    // demo.localhost or tenant.example.com
    if (getTenantFromSubdomain(normalizedHost)) {
        const tenantSlug = getTenantFromSubdomain(normalizedHost);
        return Boolean(tenantSlug && tenantSlug !== 'localhost');
    }

    // Custom tenant domains like school.edu or demo-school.org.
    return parts.length >= 2;
}

export const isLocalHost = (hostname: string): boolean => {
    const normalizedHost = normalizeHostname(hostname);
    if (!normalizedHost) return false;
    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') return true;
    return normalizedHost.endsWith('.localhost') || normalizedHost.endsWith('.local');
};

export type LoginPortalContext = 'public' | 'tenant' | 'local';

export const getLoginPortalContext = (hostname: string): LoginPortalContext => {
    if (isLocalHost(hostname)) return 'local';
    return isTenantHost(hostname) ? 'tenant' : 'public';
};

type TenantInfo = {
    id: string;
    name: string;
    logo: string;
    primaryColor: string;
};

function readCachedTenantInfo() {
    if (typeof window === 'undefined') {
        return { name: '', logo: '', primaryColor: '' };
    }
    return {
        name: localStorage.getItem('tenant_name') || '',
        logo: localStorage.getItem('tenant_logo') || '',
        primaryColor: localStorage.getItem('tenant_primary_color') || '',
    };
}

export const getTenantInfo = () => {
    // Default values for SSR to avoid hydration mismatch
    const defaultTenant: TenantInfo = {
        id: 'localhost',
        name: 'Local School',
        logo: '/logo_placeholder.png',
        primaryColor: 'hsl(222.2 47.4% 11.2%)',
    };

    if (typeof window === 'undefined') return defaultTenant;

    const hostname = window.location.hostname;
    const tenantId = (localStorage.getItem('tenant_id') || '').trim()
        || getTenantFromSubdomain(hostname)
        || (isTenantHost(hostname) ? 'tenant' : 'localhost');
    const cached = readCachedTenantInfo();

    const derivedName = tenantId === 'localhost'
        ? 'Local School'
        : `${tenantId.replace(/[-_]/g, ' ')} School`;

    return {
        id: tenantId,
        name: cached.name || derivedName,
        logo: cached.logo || '/logo_placeholder.png',
        primaryColor: cached.primaryColor || 'hsl(222.2 47.4% 11.2%)',
    };
};
