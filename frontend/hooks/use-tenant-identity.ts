// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
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

    // Computed via effect (not useMemo) so the first client render matches
    // the SSR-ed HTML (always `null`/`false`, since `window` isn't available
    // server-side) — flipping to the real value in an effect avoids a
    // hydration mismatch instead of causing one.
    const [tenantSubdomain, setTenantSubdomain] = useState<string | null>(null);
    const [isTenantContext, setIsTenantContext] = useState(false);

    useEffect(() => {
        setTenantSubdomain(getTenantFromSubdomain(window.location.hostname));
        setIsTenantContext(isTenantHost(window.location.hostname));
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
        const staleFallbackSchema = (tenantSubdomain || '').trim().toLowerCase();
        const usedCachedSchema = Boolean(cachedSchema && initialSchema === cachedSchema.trim().toLowerCase());

        const fetchTenant = async (schemaToCheck: string, isStaleCacheRetry: boolean) => {
            setIsLoading(true);
            try {
                const headers: HeadersInit = {};
                if (schemaToCheck) {
                    headers['x-tenant-id'] = schemaToCheck;
                }
                const response = await fetch('/api/core/tenant-check/', {
                    method: 'GET',
                    headers,
                    cache: 'no-store',
                    signal: controller.signal,
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        // The cached tenant no longer resolves (e.g. re-provisioned under
                        // a different/same schema after the cache was written) — clear the
                        // stale cache and retry once against the live subdomain detection
                        // before concluding the school truly isn't registered.
                        if (!isStaleCacheRetry && usedCachedSchema && staleFallbackSchema && staleFallbackSchema !== schemaToCheck) {
                            localStorage.removeItem('tenant_id');
                            localStorage.removeItem('tenant_name');
                            await fetchTenant(staleFallbackSchema, true);
                            return;
                        }
                        setTenantExists(false);
                    }
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

        fetchTenant(initialSchema, false);

        return () => controller.abort();
    }, [isTenantContext, tenantSubdomain]);

    return { tenantName, tenantSchema, isTenantContext, isLoading, tenantExists };
}
