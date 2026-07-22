// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone, X } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface PublicNotice {
    id: number;
    title: string;
    priority: string;
}

const DISMISS_KEY = 'school-announcement-dismissed-id';

export function AnnouncementBar() {
    const [notice, setNotice] = useState<PublicNotice | null>(null);
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        let active = true;
        apiRequest<PublicNotice[]>('/academic/public-notices/', { skipAuthRedirectOn401: true })
            .then((data) => {
                if (!active || !Array.isArray(data)) return;
                const urgent = data.find((n) => n.priority === 'high') || data[0];
                if (!urgent) return;
                const lastDismissed = typeof window !== 'undefined' ? localStorage.getItem(DISMISS_KEY) : null;
                setNotice(urgent);
                setDismissed(lastDismissed === String(urgent.id));
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, []);

    if (!notice || dismissed) return null;

    return (
        <div className="relative flex items-center justify-center gap-3 bg-school-forest px-4 py-2 text-center font-public-sans text-sm text-school-cream">
            <Megaphone className="hidden h-4 w-4 shrink-0 text-school-marigold sm:block" aria-hidden="true" />
            <Link href="/school/news" className="underline-offset-2 hover:underline">
                {notice.title}
            </Link>
            <button
                type="button"
                onClick={() => {
                    localStorage.setItem(DISMISS_KEY, String(notice.id));
                    setDismissed(true);
                }}
                className="absolute right-3 rounded p-1 text-school-cream/80 hover:text-school-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-school-marigold"
                aria-label="Dismiss announcement"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
