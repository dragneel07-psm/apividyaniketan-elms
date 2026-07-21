// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import {
    Download,
    Trash2,
    CheckCircle2,
    BookOpen,
    Wifi,
    WifiOff,
    HardDrive,
    AlertCircle,
    Loader2,
    RefreshCw,
    ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    useOffline,
    getOfflineLessons,
    removeOfflineLesson,
    isLessonDownloaded,
    downloadLessonForOffline,
    getTotalOfflineSize,
    type OfflineLesson
} from '@/hooks/use-offline';
import { toast } from 'sonner';

interface DownloadableItem {
    id: string;
    title: string;
    subjectName: string;
    description?: string;
    content?: string;
    sizeKB?: number;
    type: 'lesson' | 'pdf' | 'video';
    url?: string;
    pdfUrl?: string;
}

interface ContentDownloadManagerProps {
    availableItems?: DownloadableItem[];
    showHeader?: boolean;
    compact?: boolean;
}

export function ContentDownloadManager({
    availableItems = [],
    showHeader = true,
    compact = false,
}: ContentDownloadManagerProps) {
    const { isOnline, connectionQuality } = useOffline();
    const [downloadedLessons, setDownloadedLessons] = useState<OfflineLesson[]>([]);
    const [downloading, setDownloading] = useState<Record<string, number>>({}); // id -> progress
    const [totalSize, setTotalSize] = useState('0 KB');
    const [mounted, setMounted] = useState(false);

    const refresh = () => {
        setDownloadedLessons(getOfflineLessons());
        setTotalSize(getTotalOfflineSize());
    };

    useEffect(() => {
        setMounted(true);
        refresh();
    }, []);

    const handleDownload = async (item: DownloadableItem) => {
        if (!isOnline) {
            toast.error('You need an internet connection to download content.');
            return;
        }

        setDownloading(prev => ({ ...prev, [item.id]: 0 }));

        try {
            const urlsToCache = [
                item.url,
                item.pdfUrl,
            ].filter(Boolean) as string[];

            await downloadLessonForOffline(
                {
                    id: item.id,
                    title: item.title,
                    subjectName: item.subjectName,
                    downloadedAt: new Date().toISOString(),
                    sizeKB: item.sizeKB ?? 0,
                    content: item.content,
                    pdfUrl: item.pdfUrl,
                    videoUrl: item.url,
                },
                urlsToCache,
                (pct) => {
                    setDownloading(prev => ({ ...prev, [item.id]: pct }));
                }
            );

            setDownloading(prev => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });

            refresh();
            toast.success(`"${item.title}" saved for offline reading!`);
        } catch (error) {
            setDownloading(prev => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
            toast.error(`Failed to download "${item.title}". Please try again.`);
        }
    };

    const handleRemove = (lessonId: string, title: string) => {
        removeOfflineLesson(lessonId);
        refresh();
        toast.info(`"${title}" removed from offline storage.`);
    };

    if (!mounted) return null;

    const connectionBadge = () => {
        if (!isOnline) return <Badge variant="destructive" className="gap-1"><WifiOff className="h-3 w-3" />Offline</Badge>;
        if (connectionQuality === 'slow') return <Badge className="bg-amber-500 gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white" />Slow Connection</Badge>;
        if (connectionQuality === 'moderate') return <Badge className="bg-blue-500 gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white" />3G</Badge>;
        return <Badge className="bg-emerald-500 gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white" />Online</Badge>;
    };

    return (
        <div className="space-y-4">
            {/* Header Card */}
            {showHeader && (
                <Card className="border-none bg-gradient-to-r from-indigo-600 to-purple-700 text-white overflow-hidden shadow-xl relative">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mb-10" />
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <HardDrive className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Offline Learning</h2>
                                        <p className="text-indigo-200 text-xs">For rural & low-bandwidth areas</p>
                                    </div>
                                </div>
                                <p className="text-indigo-100 text-sm leading-relaxed max-w-sm">
                                    Download lessons to study without internet. Perfect for areas with poor connectivity.
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                {connectionBadge()}
                                <div className="mt-3">
                                    <p className="text-indigo-200 text-xs">Downloaded</p>
                                    <p className="text-white font-bold text-lg">{totalSize}</p>
                                    <p className="text-indigo-300 text-xs">{downloadedLessons.length} items</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Slow Connection Warning */}
            {isOnline && connectionQuality === 'slow' && (
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800">Slow internet detected</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                                Downloads may take longer. We recommend downloading when connected to Wi-Fi or 4G.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Downloaded Content */}
            {downloadedLessons.length > 0 && (
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                Downloaded Content
                            </CardTitle>
                            <CardDescription className="text-xs">Available without internet</CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={refresh}
                            className="text-slate-400 hover:text-slate-700"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {downloadedLessons.map((lesson) => (
                            <div
                                key={lesson.id}
                                className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl group"
                            >
                                <div className="h-9 w-9 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                                    <BookOpen className="h-4 w-4 text-emerald-700" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{lesson.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                                            {lesson.subjectName}
                                        </span>
                                        <span className="text-[10px] text-slate-400">•</span>
                                        <span className="text-[10px] text-emerald-600 font-medium">
                                            {lesson.sizeKB > 1024
                                                ? `${(lesson.sizeKB / 1024).toFixed(1)} MB`
                                                : `${lesson.sizeKB} KB`}
                                        </span>
                                        <span className="text-[10px] text-slate-400">•</span>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(lesson.downloadedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] px-1.5">
                                        ✓ Saved
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleRemove(lesson.id, lesson.title)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Available to Download */}
            {availableItems.length > 0 && (
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Download className="h-4 w-4 text-indigo-600" />
                            Download for Offline Study
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {isOnline
                                ? 'Save lessons to study without internet'
                                : 'Connect to internet to download new content'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {availableItems.map((item) => {
                            const isDownloaded = isLessonDownloaded(item.id);
                            const isDownloading = item.id in downloading;
                            const progress = downloading[item.id] || 0;

                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/40 transition-all group"
                                >
                                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isDownloaded ? 'bg-emerald-100' : 'bg-indigo-100'
                                        }`}>
                                        {isDownloaded
                                            ? <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                                            : <BookOpen className="h-4 w-4 text-indigo-700" />
                                        }
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                                                {item.subjectName}
                                            </span>
                                            <span className="text-[10px] text-slate-400">•</span>
                                            <span className="text-[10px] text-slate-400">
                                                ~{item.sizeKB
                                                    ? item.sizeKB > 1024
                                                        ? `${(item.sizeKB / 1024).toFixed(1)} MB`
                                                        : `${item.sizeKB} KB`
                                                    : '200 KB'}
                                            </span>
                                        </div>
                                        {isDownloading && (
                                            <div className="mt-2">
                                                <Progress value={progress} className="h-1.5" />
                                                <p className="text-[10px] text-indigo-600 mt-1">Downloading... {progress}%</p>
                                            </div>
                                        )}
                                    </div>

                                    {isDownloaded ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemove(item.id, item.title)}
                                            className="h-8 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                                            Remove
                                        </Button>
                                    ) : isDownloading ? (
                                        <Button disabled size="sm" className="h-8 text-xs bg-indigo-100 text-indigo-600">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            disabled={!isOnline}
                                            onClick={() => handleDownload(item)}
                                            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                        >
                                            <Download className="h-3.5 w-3.5 mr-1" />
                                            Save
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {downloadedLessons.length === 0 && availableItems.length === 0 && (
                <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
                    <CardContent className="p-8 text-center">
                        <div className="h-16 w-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            {isOnline
                                ? <Download className="h-8 w-8 text-indigo-600" />
                                : <WifiOff className="h-8 w-8 text-slate-400" />
                            }
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-2">
                            {isOnline ? 'No Content Downloaded Yet' : 'No Offline Content'}
                        </h3>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto">
                            {isOnline
                                ? 'Open any lesson and tap "Download" to save it for offline study.'
                                : 'Connect to the internet to download content for offline study.'}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Storage Tip */}
            {downloadedLessons.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
                    <HardDrive className="h-3.5 w-3.5" />
                    <span>Total offline storage used: <strong className="text-slate-600">{totalSize}</strong></span>
                </div>
            )}
        </div>
    );
}
