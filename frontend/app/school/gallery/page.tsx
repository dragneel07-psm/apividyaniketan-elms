// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHeading } from '@/components/school/SectionHeading';
import { GalleryGrid } from '@/components/school/GalleryGrid';
import { getGalleryItems } from '@/lib/school-content/school-info';

export const metadata: Metadata = {
    title: 'Gallery',
    description: 'Photos from campus life, academics, sports, culture, and school events at our K-8 school in Dhangadhi, Kailali.',
};

export default async function GalleryPage() {
    const items = await getGalleryItems();

    return (
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex gap-2">
                    <li><Link href="/school" className="hover:text-school-forest">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">Gallery</li>
                </ol>
            </nav>

            <SectionHeading
                eyebrow="Campus life"
                title="Gallery"
                description="A glimpse into daily life on campus — classrooms, sports, culture, and celebrations. Select a category or a photo to see more."
                className="mt-6"
            />

            <div className="mt-10">
                <GalleryGrid items={items} />
            </div>
        </div>
    );
}
