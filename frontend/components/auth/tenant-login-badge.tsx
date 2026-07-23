'use client';

import { Building2 } from 'lucide-react';
import { useTenantIdentity } from '@/hooks/use-tenant-identity';

export default function TenantLoginBadge() {
    const { tenantName, tenantSchema, isTenantContext } = useTenantIdentity();

    if (!isTenantContext) return null;

    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
            <Building2 className="h-4 w-4" />
            <span>
                Tenant: <strong>{tenantName || tenantSchema || 'School'}</strong>
            </span>
        </div>
    );
}
