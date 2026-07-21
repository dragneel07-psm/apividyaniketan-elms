// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Shared route-segment loading state for all portals. Rendered by Next.js
 * while a page's server payload streams in, replacing the blank screen
 * between navigation and first paint.
 */
export function PortalLoading() {
    return (
        <div className="p-6 space-y-6" role="status" aria-label="Loading page">
            {/* Page header */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96 max-w-full" />
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-xl" />
                ))}
            </div>

            {/* Content area */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                <Skeleton className="h-80 rounded-xl lg:col-span-2" />
                <Skeleton className="h-80 rounded-xl" />
            </div>
        </div>
    );
}
