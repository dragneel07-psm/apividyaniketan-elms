// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

function sanitizeHtml(html: string): string {
    if (typeof window === 'undefined') {
        return html;
    }

    try {
        // Load only in browser to avoid Node ESM/CJS loader issues during SSR/dev.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const domPurifyModule = require('isomorphic-dompurify');
        const purifier = domPurifyModule?.default ?? domPurifyModule;
        return typeof purifier?.sanitize === 'function' ? purifier.sanitize(html) : html;
    } catch {
        return html;
    }
}

export function SafeHTML({ html, className }: { html: string; className?: string }) {
    const clean = sanitizeHtml(html);
    return (
        <div
            className={className}
            dangerouslySetInnerHTML={{ __html: clean }}
        />
    );
}
