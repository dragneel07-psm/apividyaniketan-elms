// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { useState, useEffect, useCallback } from 'react';

export type ConnectionQuality = 'offline' | 'slow' | 'moderate' | 'fast' | 'unknown';

export interface NetworkStatus {
    isOnline: boolean;
    connectionQuality: ConnectionQuality;
    effectiveType?: string; // '4g' | '3g' | '2g' | 'slow-2g'
    downlink?: number; // Mbps
    rtt?: number; // ms
    saveData?: boolean; // data saver enabled
}

function getConnectionQuality(connection: any): ConnectionQuality {
    if (!connection) return 'unknown';
    const { effectiveType, downlink, rtt } = connection;

    if (effectiveType === 'slow-2g' || (rtt && rtt > 2000) || (downlink && downlink < 0.1)) {
        return 'slow';
    }
    if (effectiveType === '2g' || (rtt && rtt > 500) || (downlink && downlink < 0.5)) {
        return 'slow';
    }
    if (effectiveType === '3g' || (rtt && rtt > 200) || (downlink && downlink < 2)) {
        return 'moderate';
    }
    return 'fast';
}

export function useOffline(): NetworkStatus {
    const [status, setStatus] = useState<NetworkStatus>({
        isOnline: true,
        connectionQuality: 'unknown',
    });

    useEffect(() => {
        const getConnection = () => {
            if (typeof navigator === 'undefined') return null;
            return (navigator as any).connection ||
                (navigator as any).mozConnection ||
                (navigator as any).webkitConnection || null;
        };

        const buildStatus = (): NetworkStatus => {
            const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
            const connection = getConnection();

            if (!isOnline) {
                return {
                    isOnline: false,
                    connectionQuality: 'offline',
                };
            }

            const quality = getConnectionQuality(connection);
            return {
                isOnline: true,
                connectionQuality: quality,
                effectiveType: connection?.effectiveType,
                downlink: connection?.downlink,
                rtt: connection?.rtt,
                saveData: connection?.saveData ?? false,
            };
        };

        // Initialize status safely on client sidemount
        setStatus(buildStatus());

        // Update on online/offline events
        const handleOnline = () => setStatus(buildStatus());
        const handleOffline = () => setStatus({
            isOnline: false,
            connectionQuality: 'offline',
        });

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Update on connection change
        const connection = getConnection();
        if (connection) {
            const handleChange = () => setStatus(buildStatus());
            connection.addEventListener('change', handleChange);
            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
                connection.removeEventListener('change', handleChange);
            };
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return status;
}

// ─── Offline Content Management ──────────────────────────────

export interface OfflineLesson {
    id: string;
    title: string;
    subjectName: string;
    downloadedAt: string;
    sizeKB: number;
    content?: string;
    videoUrl?: string;
    pdfUrl?: string;
}

const OFFLINE_STORAGE_KEY = 'elearn_offline_lessons';

export function getOfflineLessons(): OfflineLesson[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveOfflineLesson(lesson: OfflineLesson): void {
    if (typeof window === 'undefined') return;
    const existing = getOfflineLessons();
    const updated = [...existing.filter(l => l.id !== lesson.id), lesson];
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated));
}

export function removeOfflineLesson(lessonId: string): void {
    if (typeof window === 'undefined') return;
    const existing = getOfflineLessons();
    const updated = existing.filter(l => l.id !== lessonId);
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated));

    // Also remove from service worker cache
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'REMOVE_CACHED_LESSON',
            lessonId,
        });
    }
}

export function isLessonDownloaded(lessonId: string): boolean {
    return getOfflineLessons().some(l => l.id === lessonId);
}

export async function downloadLessonForOffline(
    lesson: OfflineLesson,
    urlsToCache: string[] = [],
    onProgress?: (pct: number) => void
): Promise<void> {
    // Save metadata to localStorage
    saveOfflineLesson({ ...lesson, downloadedAt: new Date().toISOString() });

    // Send URLs to service worker for caching
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_LESSON',
            lessonId: lesson.id,
            urls: urlsToCache,
        });
    }

    // Simulate progress for UX
    if (onProgress) {
        for (let i = 0; i <= 100; i += 20) {
            onProgress(i);
            await new Promise(r => setTimeout(r, 100));
        }
    }
}

export function getTotalOfflineSize(): string {
    const lessons = getOfflineLessons();
    const totalKB = lessons.reduce((sum, l) => sum + (l.sizeKB || 0), 0);
    if (totalKB > 1024) return `${(totalKB / 1024).toFixed(1)} MB`;
    return `${totalKB} KB`;
}
