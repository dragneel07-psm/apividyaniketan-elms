// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHeading } from '@/components/school/SectionHeading';
import { NewsExplorer } from '@/components/school/NewsExplorer';
import { getNewsArticles, getPublicEvents, getPublicNotices } from '@/lib/school-content/school-info';

export const metadata: Metadata = {
    title: 'News & Events',
    description: 'The latest news, notices, and upcoming events — searchable and filterable — from our K-8 school in Dhangadhi, Kailali.',
};

export default async function NewsAndEventsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const [{ q }, notices, events, articles] = await Promise.all([
        searchParams,
        getPublicNotices(),
        getPublicEvents(),
        getNewsArticles(),
    ]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex gap-2">
                    <li><Link href="/school" className="hover:text-school-forest">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">News & Events</li>
                </ol>
            </nav>

            <SectionHeading
                eyebrow="Stay in the loop"
                title="News & Events"
                description="School announcements, achievements, and the upcoming calendar — search or filter to find what you need."
                className="mt-6"
            />

            <div className="mt-10">
                <NewsExplorer articles={articles} notices={notices} events={events} initialQuery={q ?? ''} />
            </div>
        </div>
    );
}
