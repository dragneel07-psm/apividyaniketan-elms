// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { cn } from '@/lib/utils';

export function SectionHeading({
    eyebrow,
    title,
    description,
    align = 'left',
    className,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    align?: 'left' | 'center';
    className?: string;
}) {
    return (
        <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
            {eyebrow && (
                <p className="font-public-sans text-sm font-semibold uppercase tracking-wider text-school-terracotta">
                    {eyebrow}
                </p>
            )}
            <h2 className="mt-2 font-fraunces text-3xl font-medium text-school-ink sm:text-4xl">
                {title}
            </h2>
            {description && (
                <p className="mt-3 font-public-sans text-base leading-relaxed text-school-ink/70">
                    {description}
                </p>
            )}
        </div>
    );
}
