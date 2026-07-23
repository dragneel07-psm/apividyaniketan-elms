// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PublicNotice, PublicSchoolEvent } from '@/lib/school-content/school-info';
import type { NewsArticle } from '@/lib/api';

function matches(query: string, ...fields: (string | undefined)[]) {
    if (!query) return true;
    const q = query.toLowerCase();
    return fields.some((f) => f?.toLowerCase().includes(q));
}

function titleCase(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function NewsExplorer({
    articles,
    notices,
    events,
    initialQuery = '',
}: {
    articles: NewsArticle[];
    notices: PublicNotice[];
    events: PublicSchoolEvent[];
    initialQuery?: string;
}) {
    const [query, setQuery] = useState(initialQuery);

    const filteredArticles = useMemo(
        () => articles.filter((a) => matches(query, a.title, a.excerpt, a.category)),
        [articles, query],
    );
    const filteredNotices = useMemo(
        () => notices.filter((n) => matches(query, n.title, n.content, n.category)),
        [notices, query],
    );
    const filteredEvents = useMemo(
        () => events.filter((e) => matches(query, e.title, e.description, e.event_type_display, e.location)),
        [events, query],
    );

    const totalCount = filteredArticles.length + filteredNotices.length + filteredEvents.length;

    return (
        <div>
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-school-ink/40" aria-hidden="true" />
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search news, notices, and events…"
                    aria-label="Search news, notices, and events"
                    className="border-school-forest/20 pl-9"
                />
            </div>

            <Tabs defaultValue="all" className="mt-8">
                <TabsList className="bg-school-cream">
                    <TabsTrigger value="all">All ({totalCount})</TabsTrigger>
                    <TabsTrigger value="articles">Articles ({filteredArticles.length})</TabsTrigger>
                    <TabsTrigger value="notices">Notices ({filteredNotices.length})</TabsTrigger>
                    <TabsTrigger value="events">Events ({filteredEvents.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-8 space-y-12">
                    {totalCount === 0 && <EmptyState query={query} />}
                    {filteredArticles.length > 0 && <ArticleGrid items={filteredArticles} heading="Articles" />}
                    {filteredEvents.length > 0 && <EventList items={filteredEvents} heading="Events" />}
                    {filteredNotices.length > 0 && <NoticeList items={filteredNotices} heading="Notices" />}
                </TabsContent>
                <TabsContent value="articles" className="mt-8">
                    {filteredArticles.length === 0 ? <EmptyState query={query} /> : <ArticleGrid items={filteredArticles} />}
                </TabsContent>
                <TabsContent value="notices" className="mt-8">
                    {filteredNotices.length === 0 ? <EmptyState query={query} /> : <NoticeList items={filteredNotices} />}
                </TabsContent>
                <TabsContent value="events" className="mt-8">
                    {filteredEvents.length === 0 ? <EmptyState query={query} /> : <EventList items={filteredEvents} />}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function EmptyState({ query }: { query: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-school-forest/20 bg-white p-8 text-center">
            <p className="font-public-sans text-sm text-school-ink/60">
                {query ? `No results for "${query}".` : 'Nothing to show here yet — check back soon.'}
            </p>
        </div>
    );
}

function ArticleGrid({ items, heading }: { items: NewsArticle[]; heading?: string }) {
    return (
        <section>
            {heading && <h2 className="font-public-sans text-sm font-semibold uppercase tracking-wide text-school-ink/50">{heading}</h2>}
            <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${heading ? 'mt-4' : ''}`}>
                {items.map((article) => (
                    <Link
                        key={article.id}
                        href={`/school/news/${article.slug}`}
                        className="group rounded-2xl border border-school-forest/10 bg-white p-5 transition-colors hover:border-school-forest/30"
                    >
                        <Badge variant="secondary" className="bg-school-marigold/15 text-school-terracotta hover:bg-school-marigold/15">
                            {titleCase(article.category)}
                        </Badge>
                        <h3 className="mt-3 font-fraunces text-lg text-school-ink group-hover:text-school-forest">{article.title}</h3>
                        <p className="mt-2 line-clamp-3 font-public-sans text-sm leading-relaxed text-school-ink/70">{article.excerpt}</p>
                        <p className="mt-3 font-public-sans text-xs text-school-ink/50">
                            {new Date(article.published_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function EventList({ items, heading }: { items: PublicSchoolEvent[]; heading?: string }) {
    return (
        <section>
            {heading && <h2 className="font-public-sans text-sm font-semibold uppercase tracking-wide text-school-ink/50">{heading}</h2>}
            <ul className={`space-y-3 ${heading ? 'mt-4' : ''}`}>
                {items.map((event) => (
                    <li key={event.event_id}>
                        <Link
                            href={`/school/events/${event.event_id}`}
                            className="flex items-center gap-4 rounded-xl border border-school-forest/10 bg-white p-4 transition-colors hover:border-school-forest/30"
                        >
                            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-school-forest text-white">
                                <span className="font-mono text-base font-semibold leading-none">{new Date(event.start_date).getDate()}</span>
                                <span className="text-[10px] uppercase">{new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                            </div>
                            <div>
                                <p className="font-public-sans text-sm font-semibold text-school-ink">{event.title}</p>
                                <p className="font-public-sans text-xs text-school-ink/60">
                                    {event.event_type_display}{event.location ? ` · ${event.location}` : ''}
                                </p>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function NoticeList({ items, heading }: { items: PublicNotice[]; heading?: string }) {
    return (
        <section>
            {heading && <h2 className="font-public-sans text-sm font-semibold uppercase tracking-wide text-school-ink/50">{heading}</h2>}
            <ul className={`space-y-3 ${heading ? 'mt-4' : ''}`}>
                {items.map((notice) => (
                    <li key={notice.id} className="rounded-xl border border-school-forest/10 bg-white p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="bg-school-forest/10 text-school-forest hover:bg-school-forest/10">
                                {notice.category}
                            </Badge>
                            <p className="font-public-sans text-xs text-school-ink/50">
                                {new Date(notice.published_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <p className="mt-2 font-public-sans text-sm font-semibold text-school-ink">{notice.title}</p>
                        <p className="mt-1 font-public-sans text-sm text-school-ink/70">{notice.content}</p>
                    </li>
                ))}
            </ul>
        </section>
    );
}
