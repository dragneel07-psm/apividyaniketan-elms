// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function ServiceWorkerRegistrar() {
    const refreshRequestedRef = useRef(false);
    const controllerChangedRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Never register in dev: sw.js cache-firsts /_next/static/ assets,
        // which is correct for production's content-hashed filenames but
        // actively harmful under Turbopack Fast Refresh — it can keep
        // serving a stale JS bundle indefinitely, long after a fix has
        // landed and the dev server has restarted.
        if (process.env.NODE_ENV !== 'production') {
            const cleanupDevelopmentPwa = async () => {
                if (!('serviceWorker' in navigator)) return;

                const hadController = Boolean(navigator.serviceWorker.controller);
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map((registration) => registration.unregister()));

                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames
                            .filter((name) => name.startsWith('elearn-'))
                            .map((name) => caches.delete(name))
                    );
                }

                // Unregistering does not release the current document from its
                // controller. Reload exactly once so subsequent requests go to
                // the dev server rather than the retired worker.
                const reloadKey = 'pwa-dev-cleanup-reloaded';
                if (hadController && sessionStorage.getItem(reloadKey) !== '1') {
                    sessionStorage.setItem(reloadKey, '1');
                    window.location.reload();
                    return;
                }
                sessionStorage.removeItem(reloadKey);
                console.log('[PWA] Development service workers and app caches cleared.');
            };

            void cleanupDevelopmentPwa().catch((error) => {
                console.warn('[PWA] Development cleanup failed:', error);
            });
            return;
        }

        if (!('serviceWorker' in navigator)) {
            return;
        }

        let mounted = true;
        let updateInterval: ReturnType<typeof setInterval> | null = null;

        const registerSW = async () => {
            try {
                const reg = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    updateViaCache: 'none',
                });

                if (!mounted) return;
                if (process.env.NODE_ENV !== 'production') {
                    console.log('[PWA] Service Worker registered:', reg.scope);
                }

                // Check for updates
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            if (mounted) {
                                toast.info('A new version is available! Refresh to update.', {
                                    duration: 10000,
                                    action: {
                                        label: 'Refresh',
                                        onClick: () => {
                                            refreshRequestedRef.current = true;
                                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                                        }
                                    }
                                });
                            }
                        }
                    });
                });

                // Periodic update check every 30 minutes
                updateInterval = setInterval(() => {
                    reg.update().catch(console.warn);
                }, 30 * 60 * 1000);
            } catch (error) {
                console.warn('[PWA] Service Worker registration failed:', error);
            }
        };

        registerSW();

        // Listen for service worker controller changes (after skipWaiting)
        const handleControllerChange = () => {
            if (!mounted || controllerChangedRef.current) return;
            controllerChangedRef.current = true;

            if (refreshRequestedRef.current) {
                window.location.reload();
            } else {
                toast.success('App updated in background. Refresh when convenient.');
            }
        };
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        return () => {
            mounted = false;
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            if (updateInterval) {
                clearInterval(updateInterval);
            }
        };
    }, []);

    return null; // Invisible component
}
