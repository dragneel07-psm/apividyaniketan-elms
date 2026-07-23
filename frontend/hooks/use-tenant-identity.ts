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
    /**
     * Single-tenant deployment: SchoolProfile.get_solo() always resolves, so
     * this is `true` once the school-public-info check succeeds and `null`
     * until then (never `false` — there's no "not provisioned" state anymore).
     */
    tenantExists: boolean | null;
};

type TenantCheckResponse = {
    exists?: boolean;
    name?: string;
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

        const cachedName = typeof window !== 'undefined' ? localStorage.getItem('tenant_name') : null;
        const initialSchema = (tenantSubdomain || '').trim().toLowerCase();
        if (initialSchema) {
            setTenantSchema(initialSchema);
            setTenantName(cachedName || formatTenantNameFromSlug(initialSchema));
        }

        const controller = new AbortController();

        const fetchTenant = async () => {
            setIsLoading(true);
            try {
                // Single-tenant backend: SchoolProfile.get_solo() always
                // resolves to this deployment's one school, so any 2xx
                // response here means it exists — there's no per-subdomain
                // tenant to look up anymore (see SchoolPublicInfoView).
                const response = await fetch('/api/core/school-public-info/', {
                    method: 'GET',
                    cache: 'no-store',
                    signal: controller.signal,
                });

                if (!response.ok) return;

                const payload = (await response.json()) as TenantCheckResponse;
                setTenantExists(true);

                const resolvedName = (payload.name || '').trim();
                if (resolvedName) {
                    setTenantName(resolvedName);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('tenant_name', resolvedName);
                    }
                }
            } catch {
                // Network error — keep derived/cached state, don't mark as not-found.
            } finally {
                setIsLoading(false);
            }
        };

        fetchTenant();

        return () => controller.abort();
    }, [isTenantContext, tenantSubdomain]);

    return { tenantName, tenantSchema, isTenantContext, isLoading, tenantExists };
}
