// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { useOffline } from '@/hooks/use-offline';
import {
    Wifi,
    WifiOff,
    Signal,
    SignalLow,
    SignalMedium,
    X,
    Download,
    CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
    const { isOnline, connectionQuality, saveData } = useOffline();
    const [dismissed, setDismissed] = useState(false);
    const [justCameOnline, setJustCameOnline] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setDismissed(false);
            setShowBanner(true);
        } else if (connectionQuality === 'slow') {
            setShowBanner(true);
        } else {
            setShowBanner(false);
        }
    }, [isOnline, connectionQuality]);

    // Show "back online" toast briefly
    useEffect(() => {
        if (isOnline) {
            setJustCameOnline(true);
            const timer = setTimeout(() => setJustCameOnline(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    // ── Back Online Toast ──
    if (justCameOnline && isOnline && connectionQuality !== 'offline') {
        return (
            <div className={cn(
                'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500',
                'bg-emerald-600 text-white px-5 py-3 rounded-full shadow-xl',
                'flex items-center gap-2 text-sm font-semibold',
                'animate-in slide-in-from-bottom-4'
            )}>
                <CheckCircle2 className="h-4 w-4" />
                Back online! Syncing your progress...
            </div>
        );
    }

    // ── Offline Banner ──
    if (!isOnline && !dismissed) {
        return (
            <div className={cn(
                'fixed top-0 left-0 right-0 z-50',
                'bg-gradient-to-r from-gray-900 to-gray-800',
                'border-b border-gray-700 shadow-lg',
                'px-4 py-3',
                'animate-in slide-in-from-top'
            )}>
                <div className="max-w-7xl mx-auto flex items-center gap-3">
                    <div className="flex-shrink-0 h-8 w-8 bg-red-500/20 rounded-full flex items-center justify-center">
                        <WifiOff className="h-4 w-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold">
                            You&apos;re offline
                        </p>
                        <p className="text-gray-300 text-xs mt-0.5">
                            Showing downloaded content. Your progress will sync when you reconnect.
                        </p>
                    </div>
                    <a
                        href="/student/offline"
                        className="flex-shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Download className="h-3 w-3" />
                        Offline Content
                    </a>
                    <button
                        onClick={() => setDismissed(true)}
                        className="flex-shrink-0 text-gray-400 hover:text-white p-1"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    // ── Slow Connection Banner ──
    if (isOnline && connectionQuality === 'slow' && !dismissed) {
        return (
            <div className={cn(
                'fixed top-0 left-0 right-0 z-50',
                'bg-gradient-to-r from-amber-600 to-orange-600',
                'border-b border-amber-500 shadow-lg',
                'px-4 py-2.5',
                'animate-in slide-in-from-top'
            )}>
                <div className="max-w-7xl mx-auto flex items-center gap-3">
                    <div className="flex-shrink-0 h-7 w-7 bg-white/20 rounded-full flex items-center justify-center">
                        <SignalLow className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold">
                            Slow internet detected — Low Data Mode active
                        </p>
                        <p className="text-amber-100 text-xs">
                            Images reduced. Download content for offline study to save data.
                        </p>
                    </div>
                    <a
                        href="/student/offline"
                        className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1 rounded-lg transition-colors"
                    >
                        Download
                    </a>
                    <button
                        onClick={() => setDismissed(true)}
                        className="flex-shrink-0 text-amber-100 hover:text-white p-1"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}

// ── Connection Quality Indicator (for header/nav) ──
export function ConnectionIndicator() {
    const { isOnline, connectionQuality, effectiveType } = useOffline();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const config = {
        offline: {
            icon: WifiOff,
            color: 'text-red-500',
            bg: 'bg-red-50 border-red-200',
            label: 'Offline',
            dot: 'bg-red-500',
        },
        slow: {
            icon: SignalLow,
            color: 'text-amber-600',
            bg: 'bg-amber-50 border-amber-200',
            label: '2G/Slow',
            dot: 'bg-amber-500',
        },
        moderate: {
            icon: SignalMedium,
            color: 'text-blue-600',
            bg: 'bg-blue-50 border-blue-200',
            label: '3G',
            dot: 'bg-blue-500',
        },
        fast: {
            icon: Wifi,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 border-emerald-200',
            label: '4G/Wi-Fi',
            dot: 'bg-emerald-500',
        },
        unknown: {
            icon: Signal,
            color: 'text-slate-500',
            bg: 'bg-slate-50 border-slate-200',
            label: 'Connected',
            dot: 'bg-slate-400',
        },
    };

    const c = config[connectionQuality];
    const Icon = c.icon;

    return (
        <div
            className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium',
                c.bg,
                c.color
            )}
            title={`Signal: ${effectiveType || connectionQuality}`}
        >
            <span className={cn('h-2 w-2 rounded-full animate-pulse', c.dot)} />
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{c.label}</span>
        </div>
    );
}
