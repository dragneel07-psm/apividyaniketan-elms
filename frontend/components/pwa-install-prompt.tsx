// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if previously dismissed
        const wasDismissed = localStorage.getItem('pwa-install-dismissed');
        if (wasDismissed) return;

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Also show the banner after 30 seconds if on mobile
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
            const timer = setTimeout(() => {
                if (!isInstalled) setShowBanner(true);
            }, 30000);
            return () => {
                window.removeEventListener('beforeinstallprompt', handler);
                clearTimeout(timer);
            };
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [isInstalled]);

    const handleInstall = async () => {
        if (!deferredPrompt) {
            toast.info('Install manually from browser menu (Add to Home Screen / Install App).', {
                duration: 7000,
            });
            return;
        }

        await deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;

        if (result.outcome === 'accepted') {
            setIsInstalled(true);
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        setDismissed(true);
        localStorage.setItem('pwa-install-dismissed', '1');
    };

    if (!showBanner || dismissed || isInstalled) return null;

    return (
        <div className={cn(
            'fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50',
            'bg-white rounded-2xl shadow-2xl border border-slate-200',
            'p-4 animate-in slide-in-from-bottom-4 duration-300'
        )}>
            <div className="flex items-start gap-3">
                <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm">Install E-Learning App</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Install the app on your phone for offline study — no internet needed!
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <Button
                            size="sm"
                            onClick={handleInstall}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs px-4"
                        >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Install App
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDismiss}
                            className="h-8 text-xs text-slate-400"
                        >
                            Not now
                        </Button>
                    </div>
                </div>
                <button
                    onClick={handleDismiss}
                    className="text-slate-300 hover:text-slate-600 p-1 -mt-1 -mr-1"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
