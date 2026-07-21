// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
// jsdom polyfills for browser APIs that Radix/cmdk components rely on.
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
afterEach(cleanup);
beforeEach(() => { if (typeof localStorage !== 'undefined') localStorage.clear(); });

if (typeof window !== 'undefined') {
    if (!window.ResizeObserver) {
        window.ResizeObserver = class ResizeObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    }

    if (!Element.prototype.scrollIntoView) {
        Element.prototype.scrollIntoView = () => {};
    }

    if (!Element.prototype.hasPointerCapture) {
        Element.prototype.hasPointerCapture = () => false;
        Element.prototype.setPointerCapture = () => {};
        Element.prototype.releasePointerCapture = () => {};
    }

    if (!window.matchMedia) {
        window.matchMedia = (query: string) =>
            ({
                matches: false,
                media: query,
                onchange: null,
                addListener: () => {},
                removeListener: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => false,
            }) as MediaQueryList;
    }

    if (!window.IntersectionObserver) {
        window.IntersectionObserver = class IntersectionObserver {
            root = null;
            rootMargin = '';
            thresholds: number[] = [];
            observe() {}
            unobserve() {}
            disconnect() {}
            takeRecords() { return []; }
        } as unknown as typeof window.IntersectionObserver;
    }
}
