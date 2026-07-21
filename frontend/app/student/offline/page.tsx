// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import {
    ArrowLeft,
    BookOpen,
    Trash2,
    HardDrive,
    WifiOff,
    Wifi,
    RefreshCw,
    Download,
    AlertCircle,
    GraduationCap,
    Clock,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    useOffline,
    getOfflineLessons,
    removeOfflineLesson,
    getTotalOfflineSize,
    type OfflineLesson
} from '@/hooks/use-offline';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/localization';

export default function OfflinePage() {
    const { t } = useTranslation();
    const { isOnline, connectionQuality } = useOffline();
    const [lessons, setLessons] = useState<OfflineLesson[]>([]);
    const [totalSize, setTotalSize] = useState('0 KB');
    const [selectedLesson, setSelectedLesson] = useState<OfflineLesson | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        refresh();
    }, []);

    const refresh = () => {
        setLessons(getOfflineLessons());
        setTotalSize(getTotalOfflineSize());
    };

    const handleRemove = (lesson: OfflineLesson) => {
        removeOfflineLesson(lesson.id);
        setSelectedLesson(null);
        refresh();
        toast.success(t('student.offline.toastRemoved', { title: lesson.title }));
    };

    const handleClearAll = () => {
        lessons.forEach(l => removeOfflineLesson(l.id));
        setSelectedLesson(null);
        refresh();
        toast.success(t('student.offline.toastClearedAll'));
    };

    if (!mounted) return null;

    const groupedLessons = lessons.reduce<Record<string, OfflineLesson[]>>((acc, lesson) => {
        const subject = lesson.subjectName || 'General';
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push(lesson);
        return acc;
    }, {});

    const studyTips = [
        t('student.offline.tip1'),
        t('student.offline.tip2'),
        t('student.offline.tip3'),
        t('student.offline.tip4'),
        t('student.offline.tip5'),
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/student">
                            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-indigo-700">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <HardDrive className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-slate-900 text-sm leading-tight">{t('student.offline.pageTitle')}</h1>
                                <p className="text-[10px] text-slate-500">{t('student.offline.itemsCount', { count: lessons.length })} • {totalSize}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Connection Status */}
                        <div className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border',
                            isOnline
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                        )}>
                            {isOnline
                                ? <><Wifi className="h-3 w-3" /> {t('student.offline.statusOnline')}</>
                                : <><WifiOff className="h-3 w-3" /> {t('student.offline.statusOffline')}</>
                            }
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={refresh}
                            className="text-slate-400 hover:text-slate-700"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Lesson List */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Status Banner */}
                    {!isOnline && (
                        <div className="flex items-center gap-3 bg-indigo-600 text-white rounded-2xl p-4 shadow-lg">
                            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                <WifiOff className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">{t('student.offline.studyingOffline')}</p>
                                <p className="text-indigo-200 text-xs">{t('student.offline.studyingOfflineDesc')}</p>
                            </div>
                        </div>
                    )}

                    {isOnline && connectionQuality === 'slow' && (
                        <div className="flex items-center gap-3 bg-amber-50 text-amber-800 rounded-2xl p-4 border border-amber-200">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                            <div>
                                <p className="font-semibold text-sm">{t('student.offline.slowConnection')}</p>
                                <p className="text-amber-700 text-xs">{t('student.offline.slowConnectionDesc')}</p>
                            </div>
                        </div>
                    )}

                    {/* Lessons by Subject */}
                    {lessons.length > 0 ? (
                        Object.entries(groupedLessons).map(([subject, subjectLessons]) => (
                            <Card key={subject} className="border-none shadow-sm overflow-hidden">
                                <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4 text-indigo-600" />
                                        {subject}
                                        <Badge variant="outline" className="text-[10px] ml-auto">{subjectLessons.length}</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 space-y-1">
                                    {subjectLessons.map(lesson => (
                                        <button
                                            key={lesson.id}
                                            onClick={() => setSelectedLesson(lesson)}
                                            className={cn(
                                                'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
                                                selectedLesson?.id === lesson.id
                                                    ? 'bg-indigo-50 border border-indigo-200'
                                                    : 'hover:bg-slate-50 border border-transparent'
                                            )}
                                        >
                                            <div className="h-9 w-9 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                                                <BookOpen className="h-4 w-4 text-emerald-700" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{lesson.title}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Clock className="h-3 w-3 text-slate-400" />
                                                    <span className="text-[10px] text-slate-500">
                                                        {new Date(lesson.downloadedAt).toLocaleDateString('en-US', {
                                                            month: 'short', day: 'numeric', year: 'numeric'
                                                        })}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">•</span>
                                                    <span className="text-[10px] text-emerald-600 font-medium">
                                                        {lesson.sizeKB > 1024
                                                            ? `${(lesson.sizeKB / 1024).toFixed(1)} MB`
                                                            : `${lesson.sizeKB} KB`}
                                                    </span>
                                                </div>
                                            </div>
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] shrink-0">
                                                {t('student.offline.savedBadge')}
                                            </Badge>
                                        </button>
                                    ))}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="h-24 w-24 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Download className="h-12 w-12 text-indigo-500" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-3">{t('student.offline.emptyTitle')}</h2>
                            <p className="text-slate-500 text-sm max-w-xs mb-6 leading-relaxed">
                                {t('student.offline.emptyDesc')}
                            </p>
                            {isOnline ? (
                                <Link href="/student/classes">
                                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                                        <BookOpen className="h-4 w-4 mr-2" />
                                        {t('student.offline.browseLessons')}
                                    </Button>
                                </Link>
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-4 py-2 rounded-full">
                                    <WifiOff className="h-3.5 w-3.5" />
                                    {t('student.offline.connectToDownload')}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Preview / Actions */}
                <div className="space-y-4">
                    {/* Info Card */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-800">{t('student.offline.storageInfo')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">{t('student.offline.downloadedItems')}</span>
                                <span className="font-bold text-slate-800">{lessons.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">{t('student.offline.spaceUsed')}</span>
                                <span className="font-bold text-slate-800">{totalSize}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">{t('student.offline.storageStatus')}</span>
                                <span className={cn(
                                    'font-bold text-xs flex items-center gap-1',
                                    isOnline ? 'text-emerald-600' : 'text-red-600'
                                )}>
                                    {isOnline
                                        ? <><CheckCircle2 className="h-3.5 w-3.5" />{t('student.offline.statusOnline')}</>
                                        : <><WifiOff className="h-3.5 w-3.5" />{t('student.offline.statusOffline')}</>
                                    }
                                </span>
                            </div>

                            {lessons.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-red-600 border-red-200 hover:bg-red-50 text-xs mt-2"
                                    onClick={handleClearAll}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                    {t('student.offline.clearAllDownloads')}
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Lesson Viewer */}
                    {selectedLesson && (
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-2 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold text-slate-800 line-clamp-2">
                                    {selectedLesson.title}
                                </CardTitle>
                                <CardDescription className="text-xs">{selectedLesson.subjectName}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                {selectedLesson.content ? (
                                    <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed text-sm max-h-96 overflow-y-auto">
                                        <div dangerouslySetInnerHTML={{ __html: selectedLesson.content }} />
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-400 text-sm">
                                        <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                        <p>{t('student.offline.noContent')}</p>
                                    </div>
                                )}

                                {selectedLesson.pdfUrl && (
                                    <a
                                        href={selectedLesson.pdfUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block"
                                    >
                                        <Button className="w-full text-xs bg-indigo-600 hover:bg-indigo-700">
                                            {t('student.offline.openPdf')}
                                        </Button>
                                    </a>
                                )}

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleRemove(selectedLesson)}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                    {t('student.offline.removeOffline')}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* How to Use */}
                    <Card className="bg-indigo-50 border-indigo-100 border-none shadow-sm">
                        <CardContent className="p-4 space-y-3">
                            <h3 className="text-sm font-bold text-indigo-900">{t('student.offline.studyTipsTitle')}</h3>
                            <ul className="space-y-2">
                                {studyTips.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-indigo-800">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
