import { cn } from '@/lib/utils';
import { ORGANIC_BLOB_BORDER_RADIUS } from './organic-blob';

// Plain <img>, not next/image: these URLs come straight from
// SchoolPublicInfoView (request.build_absolute_uri), which resolves to the
// backend's own origin (e.g. local /media/) whenever ImageKit isn't
// configured (IMAGEKIT_ENABLED=false) — a host next.config.ts's
// remotePatterns doesn't (and can't statically) allowlist. SchoolNav's logo
// and GalleryGrid's gallery photos use the same escape hatch for the same
// reason.
export function SchoolPhoto({
    src,
    alt,
    className,
    aspect = 'aspect-[4/3]',
    priority = false,
}: {
    src: string;
    alt: string;
    className?: string;
    aspect?: string;
    priority?: boolean;
}) {
    return (
        <div
            className={cn('relative overflow-hidden bg-school-cream', aspect, className)}
            style={{ borderRadius: ORGANIC_BLOB_BORDER_RADIUS }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={alt}
                loading={priority ? 'eager' : 'lazy'}
                className="absolute inset-0 h-full w-full object-cover"
            />
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-school-ink/10 via-transparent to-school-marigold/5"
            />
        </div>
    );
}
