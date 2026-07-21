// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { getTenantFromSubdomain, isTenantHost } from '@/lib/tenant';

type TenantIdentity = {
    tenantName: string | null;
    tenantSchema: string | null;
    isTenantContext: boolean;
    isLoading: boolean;
    /** true = school exists in DB; false = 404 returned (school not provisioned); null = check not done yet */
    tenantExists: boolean | null;
};

type TenantCheckResponse = {
    exists?: boolean;
    name?: string;
    schema_name?: string;
    id?: string;
};

function formatTenantNameFromSlug(slug: string): string {
    return slug
        .split(/[-_]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function useTenantIdentity(): TenantIdentity {
    const [tenantName, setTenantName] = useState<string | null>(null);
    const [tenantSchema, setTenantSchema] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [tenantExists, setTenantExists] = useState<boolean | null>(null);

    const tenantSubdomain = useMemo(() => {
        if (typeof window === 'undefined') return null;
        return getTenantFromSubdomain(window.location.hostname);
    }, []);

    const isTenantContext = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return isTenantHost(window.location.hostname);
    }, []);

    useEffect(() => {
        if (!isTenantContext) return;

        const cachedSchema = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null;
        const cachedName = typeof window !== 'undefined' ? localStorage.getItem('tenant_name') : null;
        const initialSchema = (cachedSchema || tenantSubdomain || '').trim().toLowerCase();
        if (initialSchema) {
            setTenantSchema(initialSchema);
            setTenantName(cachedName || formatTenantNameFromSlug(initialSchema));
        }

        const controller = new AbortController();
        const fetchTenant = async () => {
            setIsLoading(true);
            try {
                const headers: HeadersInit = {};
                if (initialSchema) {
                    headers['x-tenant-id'] = initialSchema;
                }
                const response = await fetch('/api/core/tenant-check/', {
                    method: 'GET',
                    headers,
                    cache: 'no-store',
                    signal: controller.signal,
                });

                if (!response.ok) {
                    // 404 means the school subdomain is not provisioned in the DB
                    if (response.status === 404) setTenantExists(false);
                    return;
                }

                const payload = (await response.json()) as TenantCheckResponse;
                if (!payload?.exists) {
                    setTenantExists(false);
                    return;
                }

                setTenantExists(true);
                const resolvedName = (payload.name || '').trim();
                const resolvedSchema = (payload.schema_name || '').trim().toLowerCase();

                if (resolvedSchema) {
                    setTenantSchema(resolvedSchema);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('tenant_id', resolvedSchema);
                    }
                }
                if (resolvedName) {
                    setTenantName(resolvedName);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('tenant_name', resolvedName);
                    }
                }
            } catch {
                // Network error — don't mark as not-found, keep derived/cached state.
            } finally {
                setIsLoading(false);
            }
        };

        fetchTenant();

        return () => controller.abort();
    }, [isTenantContext, tenantSubdomain]);

    return { tenantName, tenantSchema, isTenantContext, isLoading, tenantExists };
}
