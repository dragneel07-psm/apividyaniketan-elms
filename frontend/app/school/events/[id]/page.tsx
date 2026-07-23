// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, PartyPopper } from 'lucide-react';
import { getPublicEvent } from '@/lib/school-content/school-info';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const event = await getPublicEvent(id);
    if (!event) return { title: 'Event not found' };
    return {
        title: event.title,
        description: event.description || `${event.event_type_display} on ${event.start_date}`,
    };
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default async function EventDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const event = await getPublicEvent(id);
    if (!event) notFound();

    const isMultiDay = event.end_date && event.end_date !== event.start_date;

    return (
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex flex-wrap gap-2">
                    <li><Link href="/school" className="hover:text-school-forest">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li><Link href="/school/news" className="hover:text-school-forest">News & Events</Link></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">{event.title}</li>
                </ol>
            </nav>

            <div className="mt-6 flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-school-forest text-white">
                    <span className="font-mono text-2xl font-semibold leading-none">{new Date(event.start_date).getDate()}</span>
                    <span className="text-xs uppercase">{new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div>
                    {event.is_holiday && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-school-marigold/15 px-3 py-1 font-public-sans text-xs font-semibold text-school-terracotta">
                            <PartyPopper className="h-3.5 w-3.5" /> Holiday
                        </span>
                    )}
                    <h1 className="mt-2 font-fraunces text-3xl font-medium leading-tight text-school-ink sm:text-4xl">
                        {event.title}
                    </h1>
                    <p className="mt-1 font-public-sans text-sm font-medium text-school-terracotta">{event.event_type_display}</p>
                </div>
            </div>

            <div className="mt-8 space-y-4 rounded-2xl border border-school-forest/10 bg-school-cream p-6">
                <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-school-forest" />
                    <div>
                        <p className="font-public-sans text-sm font-semibold text-school-ink">Date</p>
                        <p className="font-public-sans text-sm text-school-ink/70">
                            {formatDate(event.start_date)}
                            {isMultiDay ? ` – ${formatDate(event.end_date)}` : ''}
                        </p>
                    </div>
                </div>
                {event.location && (
                    <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-school-forest" />
                        <div>
                            <p className="font-public-sans text-sm font-semibold text-school-ink">Location</p>
                            <p className="font-public-sans text-sm text-school-ink/70">{event.location}</p>
                        </div>
                    </div>
                )}
            </div>

            {event.description && (
                <div className="mt-8 font-public-sans text-base leading-relaxed text-school-ink/80">
                    <p>{event.description}</p>
                </div>
            )}

            <div className="mt-12 border-t border-school-forest/10 pt-6">
                <Link
                    href="/school/news"
                    className="inline-flex items-center gap-2 font-public-sans text-sm font-semibold text-school-forest hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to News & Events
                </Link>
            </div>
        </div>
    );
}
