// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlaceholderPhoto } from '@/components/school/PlaceholderPhoto';
import type { GalleryItem } from '@/lib/api';

const CATEGORIES: Array<{ value: GalleryItem['category'] | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'campus', label: 'Campus' },
    { value: 'academics', label: 'Academics' },
    { value: 'sports', label: 'Sports' },
    { value: 'culture', label: 'Culture' },
    { value: 'events', label: 'Events' },
];

export function GalleryGrid({ items: allItems }: { items: GalleryItem[] }) {
    const [category, setCategory] = useState<(typeof CATEGORIES)[number]['value']>('all');
    const [active, setActive] = useState<GalleryItem | null>(null);

    const items = useMemo(
        () => (category === 'all' ? allItems : allItems.filter((g) => g.category === category)),
        [allItems, category],
    );

    return (
        <div>
            <Tabs value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <TabsList className="flex h-auto flex-wrap gap-1 bg-school-cream p-1">
                    {CATEGORIES.map((c) => (
                        <TabsTrigger key={c.value} value={c.value} className="font-public-sans">
                            {c.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setActive(item)}
                        className="overflow-hidden rounded-[2rem] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-school-marigold"
                        aria-label={`View ${item.caption}`}
                    >
                        {item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.image_url}
                                alt={item.caption}
                                className="aspect-square w-full object-cover transition-transform hover:scale-[1.02]"
                            />
                        ) : (
                            <PlaceholderPhoto caption={item.caption} aspect="aspect-square" className="transition-transform hover:scale-[1.02]" />
                        )}
                    </button>
                ))}
            </div>

            {items.length === 0 && (
                <p className="mt-8 rounded-2xl border border-dashed border-school-forest/20 bg-white p-8 text-center font-public-sans text-sm text-school-ink/60">
                    No photos in this category yet.
                </p>
            )}

            <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
                <DialogContent className="max-w-2xl border-none bg-transparent p-0 shadow-none">
                    {active && (
                        <div className="rounded-3xl bg-white p-4">
                            <DialogTitle className="sr-only">{active.caption}</DialogTitle>
                            {active.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={active.image_url}
                                    alt={active.caption}
                                    className="aspect-[4/3] w-full rounded-2xl object-cover"
                                />
                            ) : (
                                <PlaceholderPhoto caption={active.caption} aspect="aspect-[4/3]" />
                            )}
                            <p className="mt-4 px-2 pb-1 font-public-sans text-sm font-medium text-school-ink">
                                {active.caption}
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
