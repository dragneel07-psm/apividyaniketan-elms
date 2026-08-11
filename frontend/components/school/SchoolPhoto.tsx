import Image from 'next/image';
import { cn } from '@/lib/utils';

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
            style={{ borderRadius: '58% 42% 61% 39% / 45% 39% 61% 55%' }}
        >
            <Image
                src={src}
                alt={alt}
                fill
                priority={priority}
                sizes="(min-width: 1024px) 42vw, 92vw"
                className="object-cover"
            />
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-school-ink/10 via-transparent to-school-marigold/5"
            />
        </div>
    );
}
