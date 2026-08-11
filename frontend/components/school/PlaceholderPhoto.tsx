// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ORGANIC_BLOB_BORDER_RADIUS } from './organic-blob';

/**
 * Signature placeholder-photo treatment used everywhere a real photo of
 * students/staff/campus belongs. We never fabricate photos of real-looking
 * people — this is a deliberately-designed stand-in (organic blob mask,
 * duotone brand gradient) that reads as "add a photo here", not as broken.
 * Swap for a real <img>/<Image> once photography is available.
 */
export function PlaceholderPhoto({
    caption,
    className,
    aspect = 'aspect-[4/3]',
}: {
    caption: string;
    className?: string;
    aspect?: string;
}) {
    return (
        <div
            role="img"
            aria-label={`Placeholder — ${caption}`}
            className={cn(
                'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-school-forest via-school-forest-dark to-school-ink',
                aspect,
                className,
            )}
            style={{ borderRadius: ORGANIC_BLOB_BORDER_RADIUS }}
        >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-school-cream/90">
                <ImageIcon className="h-8 w-8 opacity-70" aria-hidden="true" />
                <span className="font-public-sans text-xs font-medium uppercase tracking-wide opacity-80">
                    Add a photo
                </span>
                <span className="font-public-sans text-sm leading-snug opacity-90">
                    {caption}
                </span>
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(232,163,61,0.25),transparent_55%)]" />
        </div>
    );
}
