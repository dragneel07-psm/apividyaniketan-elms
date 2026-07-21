// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, ChevronRight, Menu, FileText, Sparkles, Languages, Video as VideoIcon } from 'lucide-react';
import { useGamification } from '@/components/providers/gamification-provider';

// Additional Imports
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VideoPlayer } from "@/components/lessons/video-player";
import { InteractiveRenderer, LessonInteractiveRenderer, Interaction } from "@/components/lessons/interactive-renderer";
import { SafeHTML } from "@/components/ui/safe-html";
import { toast } from "sonner";
import { academicAPI, aiAPI, Chapter, Lesson, LessonAiArtifact, LessonProgress } from "@/lib/api";
import { useTranslation } from "@/lib/localization";
import { formatNumber } from "@/lib/i18n/format";

function normalizeChapters(payload: unknown): Chapter[] {
    if (Array.isArray(payload)) return payload as Chapter[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown[] }).results)) {
        return (payload as { results: Chapter[] }).results;
    }
    return [];
}

const VIDEO_SYNC_SECONDS_DELTA = 5;
const VIDEO_SYNC_PERCENT_DELTA = 2;

function toLessonProgressPercent(lesson: Lesson): number {
    if (lesson.completed || lesson.user_progress?.completed) return 100;
    return Math.max(0, Math.min(100, Number(lesson.progress_percent ?? lesson.user_progress?.progress_percent ?? 0)));
}

type LessonInteraction = Interaction & { position?: string };

export default function LessonPlayerPage() {
    const { t, locale } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const { awardXP } = useGamification();

    // -- STATE DEFINITIONS --
    const courseId = params.courseId as string;
    const lessonId = params.lessonId ? parseInt(params.lessonId as string) : null;

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [artifactLang, setArtifactLang] = useState<'en' | 'ne'>('en');
    const [artifactLoading, setArtifactLoading] = useState(false);
    const [artifactType, setArtifactType] = useState<'summary' | 'exam_notes' | null>(null);
    const [artifact, setArtifact] = useState<LessonAiArtifact | null>(null);

    // Video & Interactive State
    const [isVideoPlaying, setIsVideoPlaying] = useState(true);
    const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
    const [completedInteractions, setCompletedInteractions] = useState<Set<string>>(new Set());
    const lastSyncedProgressRef = useRef<{ seconds: number; percent: number }>({ seconds: 0, percent: 0 });
    const syncingProgressRef = useRef(false);

    // -- HELPERS --
    const persistCurrentVideoProgress = async () => {
        if (!lesson || lesson.content_type !== 'video') return;
        const computedPercent = videoDurationSeconds > 0
            ? (currentTime / videoDurationSeconds) * 100
            : toLessonProgressPercent(lesson);
        await syncVideoProgress(currentTime, computedPercent, true);
    };

    // Helper to find next lesson
    const navigateToNextLesson = async () => {
        if (!chapters.length || !lesson) return;
        await persistCurrentVideoProgress();

        // Flatten ONLY published lessons for navigation
        const allLessons = chapters.flatMap(c => (c.lessons || []).filter(l => l.is_published));
        const currentIndex = allLessons.findIndex(l => l.id === lesson.id);

        if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
            const nextLesson = allLessons[currentIndex + 1];
            router.push(`/student/courses/${courseId}/lessons/${nextLesson.id}`);
        } else {
            toast.success(t('student.courses.lessonView.toastCourseEnd'));
            router.push(`/student/courses/${courseId}`);
        }
    };

    const applyLessonProgressToState = useCallback((targetLessonId: number, completed: boolean, userProgress?: LessonProgress | null) => {
        setLesson((prev) => {
            if (!prev || prev.id !== targetLessonId) return prev;
            const mergedUserProgress = {
                ...(prev.user_progress || {}),
                ...(userProgress || {}),
                completed,
                progress_percent: completed ? 100 : Number(userProgress?.progress_percent ?? prev.user_progress?.progress_percent ?? prev.progress_percent ?? 0),
            } as LessonProgress;
            return {
                ...prev,
                completed,
                progress_percent: mergedUserProgress.progress_percent,
                user_progress: mergedUserProgress,
            };
        });

        setChapters((prev) =>
            prev.map((chapter) => ({
                ...chapter,
                lessons: (chapter.lessons || []).map((lessonItem) => {
                    if (lessonItem.id !== targetLessonId) return lessonItem;
                    const mergedUserProgress = {
                        ...(lessonItem.user_progress || {}),
                        ...(userProgress || {}),
                        completed,
                        progress_percent: completed ? 100 : Number(userProgress?.progress_percent ?? lessonItem.user_progress?.progress_percent ?? lessonItem.progress_percent ?? 0),
                    } as LessonProgress;
                    return {
                        ...lessonItem,
                        completed,
                        progress_percent: mergedUserProgress.progress_percent,
                        user_progress: mergedUserProgress,
                    };
                }),
            }))
        );
    }, []);

    const syncVideoProgress = useCallback(
        async (watchedSeconds: number, progressPercent: number, force = false) => {
            if (!lesson || lesson.content_type !== 'video') return;
            if (syncingProgressRef.current && !force) return;

            const safeSeconds = Math.max(0, watchedSeconds);
            const safePercent = Math.max(0, Math.min(100, progressPercent));
            const last = lastSyncedProgressRef.current;

            const shouldSync =
                force ||
                safePercent >= 99 ||
                safeSeconds - last.seconds >= VIDEO_SYNC_SECONDS_DELTA ||
                safePercent - last.percent >= VIDEO_SYNC_PERCENT_DELTA;

            if (!shouldSync) return;

            syncingProgressRef.current = true;
            try {
                const wasCompleted = Boolean(lesson.completed || lesson.user_progress?.completed);
                const payload = await academicAPI.updateLessonProgress(lesson.id, {
                    watched_seconds: safeSeconds,
                    duration_seconds: videoDurationSeconds > 0 ? videoDurationSeconds : undefined,
                    progress_percent: safePercent,
                });

                lastSyncedProgressRef.current = {
                    seconds: Math.max(last.seconds, safeSeconds),
                    percent: Math.max(last.percent, Number(payload.progress_percent || safePercent)),
                };

                applyLessonProgressToState(lesson.id, payload.completed, payload.user_progress);
                if (payload.completed && !wasCompleted) {
                    awardXP(50, "Lesson Completed");
                    toast.success(t('student.courses.lessonView.toastMarkedComplete'));
                }
            } catch {
                // Silent fail during streaming updates; user still gets lesson content.
            } finally {
                syncingProgressRef.current = false;
            }
        },
        [lesson, videoDurationSeconds, applyLessonProgressToState, awardXP, t]
    );

    // -- DATA FETCHING --
    useEffect(() => {
        const loadData = async () => {
            if (!courseId || !lessonId) return;

            setLoading(true);
            try {
                const subjectId = parseInt(courseId, 10);
                const [lessonData, chaptersData] = await Promise.all([
                    academicAPI.getLesson(lessonId),
                    academicAPI.getChapters(subjectId)
                ]);

                const mergedLesson: Lesson = {
                    ...lessonData,
                    completed: Boolean(lessonData.completed || lessonData.user_progress?.completed),
                    progress_percent: toLessonProgressPercent(lessonData),
                };
                setLesson(mergedLesson);
                setChapters(normalizeChapters(chaptersData));
                setCurrentTime(Number(lessonData.user_progress?.video_watched_seconds || 0));
                setVideoDurationSeconds(Number(lessonData.user_progress?.video_duration_seconds || 0));
                lastSyncedProgressRef.current = {
                    seconds: Number(lessonData.user_progress?.video_watched_seconds || 0),
                    percent: toLessonProgressPercent(mergedLesson),
                };
            } catch (error) {
                console.error("Failed to load lesson context", error);
                toast.error(t('student.courses.lessonView.toastLoadFail'));
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [courseId, lessonId]);

    const handleToggleComplete = async () => {
        if (!lesson) return;
        setCompleting(true);
        try {
            const result = await academicAPI.toggleLessonProgress(lesson.id);
            applyLessonProgressToState(lesson.id, result.completed, result.user_progress);

            if (result.completed) {
                toast.success(t('student.courses.lessonView.toastMarkedComplete'));
                awardXP(50, "Lesson Completed");
            } else {
                toast.success(t('student.courses.lessonView.toastMarkedIncomplete'));
            }

        } catch {
            toast.error(t('student.courses.lessonView.toastUpdateFail'));
        } finally {
            setCompleting(false);
        }
    };

    const handleNavigate = async (newLessonId: number) => {
        await persistCurrentVideoProgress();
        router.push(`/student/courses/${courseId}/lessons/${newLessonId}`);
    };

    const handleGenerateArtifact = async (type: 'summary' | 'exam_notes') => {
        if (!lesson) return;
        setArtifactLoading(true);
        setArtifactType(type);
        try {
            const payload = type === 'summary'
                ? await aiAPI.summarizeLesson(lesson.id, artifactLang)
                : await aiAPI.lessonExamNotes(lesson.id, artifactLang);
            setArtifact(payload);
        } catch (error) {
            console.error('Failed to generate lesson artifact', error);
            toast.error(t('student.courses.lessonView.toastGenerateAIFail'));
        } finally {
            setArtifactLoading(false);
        }
    };

    const publishedLessons = chapters.flatMap((c) => (c.lessons || []).filter((l) => l.is_published));
    const totalProgress = publishedLessons.reduce((sum, item) => sum + toLessonProgressPercent(item), 0);
    const overallProgressPercent = publishedLessons.length > 0 ? totalProgress / publishedLessons.length : 0;
    const currentLessonIndex = publishedLessons.findIndex((l) => l.id === lesson?.id);
    const isCurrentLessonCompleted = Boolean(lesson?.completed || lesson?.user_progress?.completed);

    const initialVideoProgress = (() => {
        if (!lesson || lesson.content_type !== 'video') return 0;
        const trackedDuration = Number(lesson.user_progress?.video_duration_seconds || 0);
        const trackedSeconds = Number(lesson.user_progress?.video_watched_seconds || 0);
        if (trackedDuration > 0 && trackedSeconds > 0) {
            return Math.max(0, Math.min(1, trackedSeconds / trackedDuration));
        }
        return Math.max(0, Math.min(1, toLessonProgressPercent(lesson) / 100));
    })();
    const textInteractions = (lesson?.interactive_data?.interactions || []) as LessonInteraction[];

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!lesson) return <div>{t('student.courses.lessonView.notFound')}</div>;

    // Sidebar Content Logic
    const SidebarContent = () => (
        <div className="h-full overflow-y-auto pr-2">
            {chapters.map((chapter, i) => (
                <div key={chapter.id} className="mb-6">
                    <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">
                        {t('student.courses.lessonView.chapterLabel', { num: formatNumber(i + 1, locale), title: chapter.title })}
                    </h3>
                    <div className="space-y-1">
                        {chapter.lessons?.filter(l => l.is_published).map((l) => {
                            const isCompleted = Boolean(l.completed || l.user_progress?.completed);
                            const lessonProgress = toLessonProgressPercent(l);
                            const isInProgress = !isCompleted && lessonProgress > 0;
                            return (
                                <button
                                    key={l.id}
                                    onClick={() => handleNavigate(l.id)}
                                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium transition-colors ${l.id === lessonId
                                        ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                                        : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isCompleted
                                        ? 'bg-emerald-100 border-emerald-200 text-emerald-600'
                                        : isInProgress
                                            ? 'bg-amber-50 border-amber-200 text-amber-600'
                                            : l.id === lessonId
                                                ? 'bg-white border-indigo-200 text-indigo-600'
                                                : 'bg-white border-slate-200 text-slate-300'
                                        }`}>
                                        {isCompleted
                                            ? <CheckCircle className="h-4 w-4" />
                                            : isInProgress
                                                ? <VideoIcon className="h-3.5 w-3.5" />
                                                : <div className="h-2 w-2 rounded-full bg-current" />}
                                    </div>
                                    <span className="line-clamp-2">
                                        {l.title}
                                        {isInProgress && (
                                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                                                {formatNumber(Math.round(lessonProgress), locale)}%
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex h-screen flex-col bg-white">
            {/* Player Header */}
            <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 lg:px-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                            await persistCurrentVideoProgress();
                            router.push(`/student/courses/${courseId}`);
                        }}
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-slate-900 lg:text-lg line-clamp-1">{lesson.title}</h1>
                            <div className="hidden lg:flex items-center gap-2 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                                <span className="text-[10px] font-black text-slate-500 uppercase">
                                    {t('student.courses.lessonView.progressComplete', { pct: formatNumber(Math.round(overallProgressPercent), locale) })}
                                </span>
                            </div>
                        </div>
                        <p className="hidden text-xs text-slate-500 lg:block">
                            {chapters.find(c => c.id === lesson.chapter)?.title || t('student.courses.lessonView.fallbackChapterTitle')}
                        </p>
                    </div>
                </div>

                <div className="hidden md:flex flex-1 max-w-xs mx-8 items-center gap-3">
                    <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${overallProgressPercent}%` }}
                            className="h-full bg-indigo-600"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={isCurrentLessonCompleted ? "default" : "outline"}
                        className={isCurrentLessonCompleted ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                        onClick={handleToggleComplete}
                        disabled={completing}
                    >
                        {isCurrentLessonCompleted ? (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" /> {t('student.courses.lessonView.btnCompleted')}
                            </>
                        ) : (
                            t('student.courses.lessonView.btnMarkComplete')
                        )}
                    </Button>

                    {/* Mobile Menu */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="lg:hidden">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right">
                            <SheetHeader className="mb-4 text-left">
                                <SheetTitle>{t('student.courses.lessonView.courseContentTitle')}</SheetTitle>
                            </SheetHeader>
                            <SidebarContent />
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="hidden w-80 shrink-0 border-r bg-slate-50 p-6 lg:block">
                    <SidebarContent />
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={lesson.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="mx-auto max-w-3xl space-y-8"
                        >
                            {/* Video Content with Interactivity */}
                            {lesson.content_type === 'video' && lesson.video_url && (
                                <div className="space-y-6">
                                    <div className="relative isolate">
                                        <VideoPlayer
                                            url={lesson.video_url}
                                            playing={isVideoPlaying && !activeInteractionId}
                                            initialProgress={initialVideoProgress}
                                            onDuration={(seconds) => setVideoDurationSeconds(seconds)}
                                            onPlay={() => setIsVideoPlaying(true)}
                                            onPause={() => setIsVideoPlaying(false)}
                                            onProgress={(state) => {
                                                setCurrentTime(state.playedSeconds);
                                                syncVideoProgress(state.playedSeconds, state.played * 100);

                                                // Check for interactions
                                                if (lesson.interactive_data?.interactions) {
                                                    const interactions = lesson.interactive_data.interactions as Interaction[];
                                                    const triggered = interactions.find(i =>
                                                        i.timestamp !== undefined &&
                                                        Math.abs(i.timestamp - state.playedSeconds) < 1 &&
                                                        !completedInteractions.has(i.id)
                                                    );

                                                    if (triggered && triggered.id !== activeInteractionId) {
                                                        setActiveInteractionId(triggered.id);
                                                        setIsVideoPlaying(false);
                                                    }
                                                }
                                            }}
                                            onComplete={() => {
                                                const finalSeconds = videoDurationSeconds > 0
                                                    ? videoDurationSeconds
                                                    : Math.max(currentTime, Number(lesson.duration_minutes || 0) * 60);
                                                syncVideoProgress(finalSeconds, 100, true);
                                            }}
                                        />

                                        {/* Interaction Overlay */}
                                        <AnimatePresence>
                                            {activeInteractionId && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 lg:p-8"
                                                >
                                                    <div className="w-full max-w-2xl">
                                                        <LessonInteractiveRenderer
                                                            interactions={lesson.interactive_data?.interactions || []}
                                                            activeInteractionId={activeInteractionId}
                                                            onComplete={(id) => {
                                                                setCompletedInteractions(prev => new Set(prev).add(id));
                                                                setActiveInteractionId(null);
                                                                setIsVideoPlaying(true);
                                                            }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <div className="space-y-4">
                                        <h2 className="text-3xl font-black text-slate-900">{lesson.title}</h2>
                                        {lesson.content && (
                                            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
                                                <SafeHTML html={lesson.content} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {(lesson.content_type === 'interactive' || lesson.content_type === 'quiz') && lesson.interactive_data && (
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black text-slate-900">{lesson.title}</h2>
                                        <p className="text-slate-500 font-medium">{t('student.courses.lessonView.interactiveSubtitle')}</p>
                                    </div>
                                        <InteractiveRenderer
                                            type={lesson.content_type}
                                            data={lesson.interactive_data}
                                            onComplete={() => {
                                                if (!isCurrentLessonCompleted) handleToggleComplete();
                                            }}
                                        />
                                    {lesson.content && (
                                        <div className="mt-8 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
                                            <SafeHTML html={lesson.content} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {lesson.content_type === 'text' && (
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-black text-slate-900">{lesson.title}</h2>
                                    <div className="space-y-6">
                                        {/* Start Interactions */}
                                        {textInteractions.filter((i) => i.position === 'start').map((i) => (
                                            <LessonInteractiveRenderer
                                                key={i.id}
                                                interactions={textInteractions}
                                                activeInteractionId={i.id}
                                                onComplete={(id) => setCompletedInteractions(prev => new Set(prev).add(id))}
                                            />
                                        ))}

                                        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
                                            {lesson.content ? (
                                                <SafeHTML html={lesson.content} />
                                            ) : (
                                                <p className="text-slate-500 italic">{t('student.courses.lessonView.noTextContent')}</p>
                                            )}
                                        </div>

                                        {/* Legacy Interactive Rendering (if no interactions array) */}
                                        {!lesson.interactive_data?.interactions && lesson.interactive_data && (
                                            <InteractiveRenderer
                                                type={lesson.content_type}
                                                data={lesson.interactive_data}
                                                onComplete={() => {
                                                    if (!isCurrentLessonCompleted) handleToggleComplete();
                                                }}
                                            />
                                        )}

                                        {/* End / Unspecified Interactions */}
                                        {textInteractions.filter((i) => i.position !== 'start' && i.timestamp === undefined).map((i) => (
                                            <LessonInteractiveRenderer
                                                key={i.id}
                                                interactions={textInteractions}
                                                activeInteractionId={i.id}
                                                onComplete={(id) => setCompletedInteractions(prev => new Set(prev).add(id))}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Materials */}
                            {lesson.materials && lesson.materials.length > 0 && (
                                <div className="space-y-4 pt-4 border-t">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-indigo-600" /> {t('student.courses.lessonView.materialsTitle')}
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {lesson.materials.map((material) => (
                                            <a
                                                key={material.id}
                                                href={material.file || material.link || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                                            >
                                                <div className="h-10 w-10 shrink-0 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                                                    {material.material_type === 'pdf' ? 'PDF' : 'FILE'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-slate-800">{material.title}</p>
                                                    <p className="text-xs text-slate-500">{t('student.courses.lessonView.materialDownload')}</p>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-indigo-600" />
                                        <h3 className="text-sm font-bold text-indigo-900">{t('student.courses.lessonView.aiSectionTitle')}</h3>
                                    </div>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                        <Languages className="h-3.5 w-3.5" />
                                        <select
                                            value={artifactLang}
                                            onChange={(e) => setArtifactLang(e.target.value as 'en' | 'ne')}
                                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                                        >
                                            <option value="en">{t('student.courses.lessonView.langEnglish')}</option>
                                            <option value="ne">{t('student.courses.lessonView.langNepali')}</option>
                                        </select>
                                    </label>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={artifactLoading}
                                        onClick={() => handleGenerateArtifact('summary')}
                                    >
                                        {artifactLoading && artifactType === 'summary' ? t('student.courses.lessonView.btnGenerating') : t('student.courses.lessonView.btnGenerateSummary')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={artifactLoading}
                                        onClick={() => handleGenerateArtifact('exam_notes')}
                                    >
                                        {artifactLoading && artifactType === 'exam_notes' ? t('student.courses.lessonView.btnGenerating') : t('student.courses.lessonView.btnGenerateExamNotes')}
                                    </Button>
                                </div>

                                {artifact && (
                                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                                        <p className="text-sm font-semibold text-slate-900">{artifact.summary}</p>
                                        {artifact.bullets.length > 0 && (
                                            <div>
                                                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{t('student.courses.lessonView.artifactBullets')}</p>
                                                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                                                    {artifact.bullets.map((item, idx) => <li key={`bullet-${idx}`}>{item}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {artifact.key_terms.length > 0 && (
                                            <div>
                                                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{t('student.courses.lessonView.artifactKeyTerms')}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {artifact.key_terms.map((term, idx) => (
                                                        <span key={`term-${idx}`} className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                                            {term}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {artifact.practice_questions.length > 0 && (
                                            <div>
                                                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{t('student.courses.lessonView.artifactPracticeQuestions')}</p>
                                                <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
                                                    {artifact.practice_questions.map((item, idx) => <li key={`question-${idx}`}>{item}</li>)}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Navigation Footer */}
                            <div className="flex justify-between items-center pt-10 pb-20 border-t border-slate-100">
                                <Button
                                    variant="outline"
                                    className="rounded-full px-6"
                                    onClick={() => {
                                        if (currentLessonIndex > 0) {
                                            handleNavigate(publishedLessons[currentLessonIndex - 1].id);
                                        }
                                    }}
                                    disabled={currentLessonIndex <= 0}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" /> {t('student.courses.lessonView.btnPrevious')}
                                </Button>

                                <Button
                                    className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 rounded-full px-8 h-12 font-bold"
                                    onClick={navigateToNextLesson}
                                >
                                    {currentLessonIndex === publishedLessons.length - 1
                                        ? t('student.courses.lessonView.btnFinishCourse')
                                        : t('student.courses.lessonView.btnNextLesson')}
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
