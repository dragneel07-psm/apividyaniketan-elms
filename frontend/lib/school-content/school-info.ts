// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { headers } from 'next/headers';
import { resolveBackendOrigin } from '@/lib/server/auth-session';
import { getTenantFromSubdomain } from '@/lib/tenant';
import type {
    AdmissionFaq,
    CoreValue,
    FieldTrip,
    GalleryItem,
    HistoryMilestone,
    NewsArticle,
    Program,
    StudentLifeActivity,
    Testimonial,
    WellbeingSupport,
} from '@/lib/api';

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
    hero_image: string | null;
    principal_photo: string | null;
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
    hero_image: null,
    principal_photo: null,
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

export async function getPublicEvent(eventId: string): Promise<PublicSchoolEvent | null> {
    const events = await fetchTenantScoped<PublicSchoolEvent[]>(
        `/api/academic/public-events/?id=${encodeURIComponent(eventId)}`,
        [],
    );
    return events[0] ?? null;
}

// Admin-managed marketing site content (see /admin/school-site/*).
export function getPrograms() {
    return fetchTenantScoped<Program[]>('/api/academic/public-programs/', []);
}

export function getTestimonials() {
    return fetchTenantScoped<Testimonial[]>('/api/academic/public-testimonials/', []);
}

export function getCoreValues() {
    return fetchTenantScoped<CoreValue[]>('/api/academic/public-core-values/', []);
}

export function getHistoryMilestones() {
    return fetchTenantScoped<HistoryMilestone[]>('/api/academic/public-history-milestones/', []);
}

export function getNewsArticles() {
    return fetchTenantScoped<NewsArticle[]>('/api/academic/public-news-articles/', []);
}

export async function getNewsArticle(slug: string): Promise<NewsArticle | null> {
    const articles = await fetchTenantScoped<NewsArticle[]>(
        `/api/academic/public-news-articles/?slug=${encodeURIComponent(slug)}`,
        [],
    );
    return articles[0] ?? null;
}

export function getGalleryItems() {
    return fetchTenantScoped<GalleryItem[]>('/api/academic/public-gallery-items/', []);
}

export function getStudentLifeActivities() {
    return fetchTenantScoped<StudentLifeActivity[]>('/api/academic/public-student-life-activities/', []);
}

export function getFieldTrips() {
    return fetchTenantScoped<FieldTrip[]>('/api/academic/public-field-trips/', []);
}

export function getWellbeingSupport() {
    return fetchTenantScoped<WellbeingSupport[]>('/api/academic/public-wellbeing-support/', []);
}

export function getAdmissionFaqs() {
    return fetchTenantScoped<AdmissionFaq[]>('/api/academic/public-admission-faqs/', []);
}
