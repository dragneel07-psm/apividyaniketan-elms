// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { headers } from 'next/headers';
import { resolveBackendOrigin } from '@/lib/server/auth-session';
import { getTenantFromSubdomain } from '@/lib/tenant';

export interface SchoolPublicInfo {
    exists: boolean;
    name: string;
    address: string;
    contact_email: string;
    contact_phone: string;
    website: string;
    established_year: number | null;
    principal_name: string;
    current_academic_year: string;
    logo: string | null;
    student_count: number;
    teacher_count: number;
}

const FALLBACK: SchoolPublicInfo = {
    exists: false,
    name: 'Our School',
    address: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    established_year: null,
    principal_name: '',
    current_academic_year: '',
    logo: null,
    student_count: 0,
    teacher_count: 0,
};

// Server Component data fetch — resolves the tenant from the request Host
// header (same subdomain-detection logic the client uses) and calls the
// backend directly (bypassing the Next.js /api proxy, which is designed
// for browser-originated requests carrying cookies).
export async function getSchoolInfo(): Promise<SchoolPublicInfo> {
    try {
        const headerList = await headers();
        const host = (headerList.get('host') || '').replace(/:\d+$/, '');
        const tenantId = getTenantFromSubdomain(host) || 'public';
        const backendOrigin = resolveBackendOrigin();
        if (!backendOrigin || tenantId === 'public') return FALLBACK;

        const res = await fetch(`${backendOrigin}/api/core/school-public-info/`, {
            headers: { 'x-tenant-id': tenantId },
            next: { revalidate: 300 },
        });
        if (!res.ok) return FALLBACK;
        const data = (await res.json()) as SchoolPublicInfo;
        return { ...FALLBACK, ...data };
    } catch {
        return FALLBACK;
    }
}

export interface PublicNotice {
    id: number;
    title: string;
    content: string;
    category: string;
    priority: string;
    published_date: string;
}

export interface PublicSchoolEvent {
    event_id: string;
    title: string;
    description: string;
    event_type: string;
    event_type_display: string;
    start_date: string;
    end_date: string;
    location: string;
    is_holiday: boolean;
}

async function fetchTenantScoped<T>(path: string, fallback: T): Promise<T> {
    try {
        const headerList = await headers();
        const host = (headerList.get('host') || '').replace(/:\d+$/, '');
        const tenantId = getTenantFromSubdomain(host) || 'public';
        const backendOrigin = resolveBackendOrigin();
        if (!backendOrigin || tenantId === 'public') return fallback;

        const res = await fetch(`${backendOrigin}${path}`, {
            headers: { 'x-tenant-id': tenantId },
            next: { revalidate: 120 },
        });
        if (!res.ok) return fallback;
        return (await res.json()) as T;
    } catch {
        return fallback;
    }
}

export function getPublicNotices() {
    return fetchTenantScoped<PublicNotice[]>('/api/academic/public-notices/', []);
}

export function getPublicEvents() {
    return fetchTenantScoped<PublicSchoolEvent[]>('/api/academic/public-events/', []);
}
