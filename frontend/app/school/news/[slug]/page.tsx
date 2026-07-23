// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PlaceholderPhoto } from '@/components/school/PlaceholderPhoto';
import { getNewsArticle } from '@/lib/school-content/school-info';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const article = await getNewsArticle(slug);
    if (!article) return { title: 'Article not found' };
    return {
        title: article.title,
        description: article.excerpt,
        openGraph: { title: article.title, description: article.excerpt, type: 'article' },
        twitter: { card: 'summary_large_image', title: article.title, description: article.excerpt },
    };
}

export default async function NewsArticlePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const article = await getNewsArticle(slug);
    if (!article) notFound();

    return (
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex flex-wrap gap-2">
                    <li><Link href="/school" className="hover:text-school-forest">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li><Link href="/school/news" className="hover:text-school-forest">News & Events</Link></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">{article.title}</li>
                </ol>
            </nav>

            <div className="mt-6">
                <Badge variant="secondary" className="bg-school-marigold/15 text-school-terracotta hover:bg-school-marigold/15">
                    {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
                </Badge>
                <h1 className="mt-3 font-fraunces text-3xl font-medium leading-tight text-school-ink sm:text-4xl">
                    {article.title}
                </h1>
                <p className="mt-2 font-public-sans text-sm text-school-ink/50">
                    {new Date(article.published_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            <div className="mt-8">
                {article.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={article.image_url}
                        alt={article.title}
                        className="aspect-[16/9] w-full rounded-[2rem] object-cover"
                    />
                ) : (
                    <PlaceholderPhoto caption={article.title} aspect="aspect-[16/9]" />
                )}
            </div>

            <div className="mt-8 font-public-sans text-base leading-relaxed text-school-ink/80">
                <p>{article.body}</p>
            </div>

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
