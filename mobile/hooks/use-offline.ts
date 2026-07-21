// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────
export type ConnectionQuality = 'offline' | 'slow' | 'moderate' | 'fast' | 'unknown';

export interface NetworkStatus {
    isOnline: boolean;
    connectionQuality: ConnectionQuality;
    connectionType: string;
}

export interface OfflineLesson {
    id: string;
    title: string;
    subjectName: string;
    downloadedAt: string;
    sizeKB: number;
    content?: string;
}

const OFFLINE_KEY = 'elearn_offline_lessons';

// ─── Network Quality ──────────────────────────────────────────
function getQuality(state: NetInfoState): ConnectionQuality {
    if (!state.isConnected) return 'offline';

    const type = state.type;
    if (type === 'wifi') return 'fast';

    const details = state.details as any;
    const cellularGen = details?.cellularGeneration;
    if (cellularGen === '4g' || cellularGen === '5g') return 'fast';
    if (cellularGen === '3g') return 'moderate';
    if (cellularGen === '2g') return 'slow';

    return 'unknown';
}

// ─── Hook ─────────────────────────────────────────────────────
export function useOffline(): NetworkStatus {
    const [status, setStatus] = useState<NetworkStatus>({
        isOnline: true,
        connectionQuality: 'unknown',
        connectionType: 'unknown',
    });

    useEffect(() => {
        // Get current network state immediately
        NetInfo.fetch().then(state => {
            setStatus({
                isOnline: state.isConnected ?? true,
                connectionQuality: getQuality(state),
                connectionType: state.type,
            });
        });

        // Subscribe to changes
        const unsubscribe = NetInfo.addEventListener(state => {
            setStatus({
                isOnline: state.isConnected ?? true,
                connectionQuality: getQuality(state),
                connectionType: state.type,
            });
        });

        return unsubscribe;
    }, []);

    return status;
}

// ─── Offline Content Management ───────────────────────────────
export async function getOfflineLessons(): Promise<OfflineLesson[]> {
    try {
        const raw = await AsyncStorage.getItem(OFFLINE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export async function saveOfflineLesson(lesson: OfflineLesson): Promise<void> {
    const existing = await getOfflineLessons();
    const updated = [...existing.filter(l => l.id !== lesson.id), lesson];
    await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(updated));
}

export async function removeOfflineLesson(lessonId: string): Promise<void> {
    const existing = await getOfflineLessons();
    const updated = existing.filter(l => l.id !== lessonId);
    await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(updated));
}

export async function isLessonDownloaded(lessonId: string): Promise<boolean> {
    const lessons = await getOfflineLessons();
    return lessons.some(l => l.id === lessonId);
}

export async function getOfflineStorageSize(): Promise<string> {
    const lessons = await getOfflineLessons();
    const totalKB = lessons.reduce((sum, l) => sum + (l.sizeKB || 0), 0);
    if (totalKB > 1024) return `${(totalKB / 1024).toFixed(1)} MB`;
    return `${totalKB} KB`;
}
