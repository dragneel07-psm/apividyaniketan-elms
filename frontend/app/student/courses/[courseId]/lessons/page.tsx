// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    FileText,
    ArrowLeft, CheckCircle2, Circle,
    PlayCircle, BookOpen, ChevronRight,
    Clock, Download, HardDrive, Loader2
} from 'lucide-react';
import { academicAPI, Lesson, Subject, Chapter } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/localization';
import { formatNumber } from '@/lib/i18n/format';
import {
    isLessonDownloaded,
    downloadLessonForOffline,
    removeOfflineLesson,
    useOffline
} from '@/hooks/use-offline';

function normalizeChapters(payload: unknown): Chapter[] {
    if (Array.isArray(payload)) return payload as Chapter[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown[] }).results)) {
        return (payload as { results: Chapter[] }).results;
    }
    return [];
}

export default function StudentCourseLessonsPage() {
    const { t, locale } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;
    const { isOnline } = useOffline();

    const [subject, setSubject] = useState<Subject | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
    const [lessonProgressMap, setLessonProgressMap] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
    const [downloadedIds, setDownloadedIds] = useState<Set<number>>(new Set());

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [subjectData, chaptersData] = await Promise.all([
                academicAPI.getSubject(parseInt(courseId)),
                academicAPI.getChapters(parseInt(courseId))
            ]);
            setSubject(subjectData);
            const normalizedChapters = normalizeChapters(chaptersData);
            setChapters(normalizedChapters);

            // Calculate completed lessons from the backend data
            const completed = new Set<number>();
            const progressMap: Record<number, number> = {};
            const downloaded = new Set<number>();
            normalizedChapters.forEach(chapter => {
                chapter.lessons?.forEach(lesson => {
                    const isCompleted = Boolean(lesson.completed || lesson.user_progress?.completed);
                    const progressPercent = isCompleted
                        ? 100
                        : Math.max(0, Math.min(100, Number(lesson.progress_percent ?? lesson.user_progress?.progress_percent ?? 0)));
                    if (isCompleted) completed.add(lesson.id);
                    progressMap[lesson.id] = progressPercent;
                    if (isLessonDownloaded(String(lesson.id))) downloaded.add(lesson.id);
                });
            });
            setCompletedLessons(completed);
            setLessonProgressMap(progressMap);
            setDownloadedIds(downloaded);
        } catch (error) {
            console.error('Failed to load curriculum data:', error);
            toast.error(t('student.courses.courseLessons.toastLoadFail'));
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const totalLessons = chapters.reduce((acc, chapter) => acc + (chapter.lessons?.filter(l => l.is_published).length || 0), 0);
    const cumulativeLessonProgress = chapters.reduce((sum, chapter) => {
        return sum + (chapter.lessons?.filter(l => l.is_published).reduce((innerSum, lesson) => {
            const isCompleted = completedLessons.has(lesson.id);
            const progress = isCompleted ? 100 : Number(lessonProgressMap[lesson.id] || 0);
            return innerSum + Math.max(0, Math.min(100, progress));
        }, 0) || 0);
    }, 0);
    const progressPercentage = totalLessons > 0 ? (cumulativeLessonProgress / totalLessons) : 0;

    const handleDownloadLesson = async (e: React.MouseEvent, lesson: Lesson) => {
        e.stopPropagation();
        if (!isOnline) {
            toast.error(t('student.courses.courseLessons.toastOffline'));
            return;
        }
        setDownloadingIds(prev => new Set(prev).add(lesson.id));
        try {
            await downloadLessonForOffline(
                {
                    id: String(lesson.id),
                    title: lesson.title,
                    subjectName: subject?.name || 'Unknown Subject',
                    downloadedAt: new Date().toISOString(),
                    sizeKB: lesson.duration_minutes ? lesson.duration_minutes * 50 : 200,
                    content: lesson.content || '',
                    videoUrl: lesson.video_url || '',
                },
                lesson.video_url ? [lesson.video_url] : [],
            );
            setDownloadedIds(prev => new Set(prev).add(lesson.id));
            toast.success(t('student.courses.courseLessons.toastSaved', { title: lesson.title }));
        } catch {
            toast.error(t('student.courses.courseLessons.toastDownloadFail'));
        } finally {
            setDownloadingIds(prev => {
                const next = new Set(prev);
                next.delete(lesson.id);
                return next;
            });
        }
    };

    const handleRemoveLesson = (e: React.MouseEvent, lesson: Lesson) => {
        e.stopPropagation();
        removeOfflineLesson(String(lesson.id));
        setDownloadedIds(prev => {
            const next = new Set(prev);
            next.delete(lesson.id);
            return next;
        });
        toast.info(t('student.courses.courseLessons.toastRemoved', { title: lesson.title }));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="hover:bg-white"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900">{subject?.name}</h1>
                    <p className="text-slate-500 font-medium">{t('student.courses.courseLessons.curriculum')}</p>
                </div>
            </div>

            {/* Progress Card */}
            <Card className="p-8 border-none shadow-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden relative">
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-2xl mb-1">{t('student.courses.courseLessons.journeyTitle')}</h3>
                            <p className="text-indigo-100 opacity-90">
                                {t('student.courses.courseLessons.journeySubtitle', { completed: formatNumber(completedLessons.size, locale), total: formatNumber(totalLessons, locale) })}
                            </p>
                        </div>
                        <div className="text-4xl font-black bg-white/20 backdrop-blur-md rounded-2xl p-4 min-w-[100px] text-center">
                            {formatNumber(Math.round(progressPercentage), locale)}%
                        </div>
                    </div>
                    <Progress value={progressPercentage} className="h-3 bg-white/20" />
                </div>
                {/* Decorative blobs */}
                <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-100px] left-[-50px] w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl"></div>
            </Card>

            {/* Curriculum List */}
            {chapters.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{t('student.courses.courseLessons.noContentTitle')}</h3>
                    <p className="text-slate-500">
                        {t('student.courses.courseLessons.noContentHint')}
                    </p>
                </Card>
            ) : (
                <div className="space-y-10">
                    {chapters.map((chapter, chapterIndex) => (
                        <div key={chapter.id} className="space-y-4">
                            <div className="flex items-center gap-3 py-2 border-b border-slate-200">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm">
                                    {chapterIndex + 1}
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800">{chapter.title}</h2>
                                {chapter.description && (
                                    <span className="text-sm text-slate-400 ml-2">• {chapter.description}</span>
                                )}
                            </div>

                            <div className="grid gap-4">
                                {chapter.lessons?.filter(l => l.is_published).map((lesson, lessonIndex) => {
                                    const isCompleted = completedLessons.has(lesson.id);
                                    const lessonProgress = isCompleted ? 100 : Number(lessonProgressMap[lesson.id] || 0);
                                    const isInProgress = !isCompleted && lessonProgress > 0;

                                    return (
                                        <Card
                                            key={lesson.id}
                                            className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-slate-200 cursor-pointer ${isCompleted ? 'bg-emerald-50/30' : 'bg-white'
                                                }`}
                                            onClick={() => router.push(`/student/courses/${courseId}/lessons/${lesson.id}`)}
                                        >
                                            <CardContent className="p-0">
                                                <div className="flex items-stretch min-h-[90px]">
                                                    {/* Status indicator bar */}
                                                    <div className={`w-1.5 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-100 group-hover:bg-indigo-500'}`} />

                                                    <div className="flex items-center gap-6 flex-1 px-6 py-4">
                                                        <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl transition-colors ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                                            }`}>
                                                            {isCompleted ? (
                                                                <CheckCircle2 className="h-6 w-6" />
                                                            ) : isInProgress ? (
                                                                <Circle className="h-6 w-6 text-amber-500" />
                                                            ) : lesson.video_url ? (
                                                                <PlayCircle className="h-6 w-6" />
                                                            ) : (
                                                                <FileText className="h-6 w-6" />
                                                            )}
                                                        </div>

                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                                    {t('student.courses.courseLessons.lessonLabel', { chapter: formatNumber(chapterIndex + 1, locale), lesson: formatNumber(lessonIndex + 1, locale) })}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                    <Clock className="h-3 w-3" />
                                                                    {formatNumber(lesson.duration_minutes ?? 0, locale)}m
                                                                </span>
                                                            </div>
                                                            <h3 className={`text-lg font-bold ${isCompleted ? 'text-slate-600' : 'text-slate-800'}`}>
                                                                {lesson.title}
                                                            </h3>
                                                            {isInProgress && (
                                                                <div className="mt-2 max-w-xs">
                                                                    <Progress value={lessonProgress} className="h-1.5" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {isCompleted && (
                                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 font-bold">
                                                                    {t('student.courses.courseLessons.badgeCompleted')}
                                                                </Badge>
                                                            )}
                                                            {isInProgress && (
                                                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 font-bold">
                                                                    {t('student.courses.courseLessons.badgeInProgress', { pct: formatNumber(Math.round(lessonProgress), locale) })}
                                                                </Badge>
                                                            )}
                                                            {/* Download for offline button */}
                                                            {downloadedIds.has(lesson.id) ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-xs text-emerald-600 hover:text-red-600 hover:bg-red-50 gap-1.5 px-3"
                                                                    onClick={(e) => handleRemoveLesson(e, lesson)}
                                                                    title={t('student.courses.courseLessons.titleRemoveOffline')}
                                                                >
                                                                    <HardDrive className="h-3.5 w-3.5" />
                                                                    <span className="hidden md:inline">{t('student.courses.courseLessons.btnSaved')}</span>
                                                                </Button>
                                                            ) : downloadingIds.has(lesson.id) ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    disabled
                                                                    className="h-8 text-xs gap-1.5 px-3"
                                                                >
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-xs text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 gap-1.5 px-3"
                                                                    onClick={(e) => handleDownloadLesson(e, lesson)}
                                                                    title={t('student.courses.courseLessons.titleDownloadOffline')}
                                                                >
                                                                    <Download className="h-3.5 w-3.5" />
                                                                    <span className="hidden md:inline">{t('student.courses.courseLessons.btnSave')}</span>
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                className={`rounded-xl h-10 px-6 font-bold transition-all ${isCompleted ? 'border-emerald-200 text-emerald-600' : 'border-slate-200 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600'
                                                                    }`}
                                                            >
                                                                {isCompleted ? t('student.courses.courseLessons.btnReview') : t('student.courses.courseLessons.btnStartLesson')}
                                                                <ChevronRight className="ml-2 h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                                {(!chapter.lessons || chapter.lessons.filter(l => l.is_published).length === 0) && (
                                    <div className="text-center py-6 text-slate-400 italic text-sm">
                                        {t('student.courses.courseLessons.noLessonsInChapter')}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
