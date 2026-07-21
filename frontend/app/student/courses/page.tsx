// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { academicAPI, helpers, Subject } from '@/lib/api';
import { toast } from 'sonner';
import {
    BookOpen, Loader2, PlayCircle, CheckCircle2,
    ChevronRight, GraduationCap, Clock, User, Sparkles, Lock
} from 'lucide-react';
import { useTranslation } from '@/lib/localization';
import { formatNumber } from '@/lib/i18n/format';

const PALETTE = [
    { grad: 'from-indigo-500 to-violet-600', text: 'text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-100', bar: '[&>div]:bg-indigo-500 bg-indigo-100' },
    { grad: 'from-violet-500 to-purple-600', text: 'text-violet-600', light: 'bg-violet-50', border: 'border-violet-100', bar: '[&>div]:bg-violet-500 bg-violet-100' },
    { grad: 'from-emerald-500 to-teal-500', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-100', bar: '[&>div]:bg-emerald-500 bg-emerald-100' },
    { grad: 'from-rose-500 to-pink-500', text: 'text-rose-600', light: 'bg-rose-50', border: 'border-rose-100', bar: '[&>div]:bg-rose-500 bg-rose-100' },
    { grad: 'from-amber-500 to-orange-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-100', bar: '[&>div]:bg-amber-500 bg-amber-100' },
    { grad: 'from-sky-500 to-blue-600', text: 'text-sky-600', light: 'bg-sky-50', border: 'border-sky-100', bar: '[&>div]:bg-sky-500 bg-sky-100' },
];

export default function StudentCoursesPage() {
    const [courses, setCourses] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const { t, locale } = useTranslation();

    useEffect(() => {
        (async () => {
            try {
                const student = await academicAPI.getMyStudent();
                const subjects = await helpers.getStudentSubjects(student.id);
                setCourses(Array.isArray(subjects) ? subjects : []);
            } catch {
                toast.error(t('student.courses.errorLoadCourses'));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse">
                <BookOpen className="h-7 w-7 text-white" />
            </div>
            <p className="text-slate-400 text-sm font-medium animate-pulse">{t('student.courses.loadingCourses')}</p>
        </div>
    );

    const total = courses.length;
    const completed = courses.filter((c) => (c.progress_percentage ?? 0) >= 100).length;
    const inProgress = courses.filter((c) => (c.progress_percentage ?? 0) > 0 && (c.progress_percentage ?? 0) < 100).length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                        <GraduationCap className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">{t('student.courses.enrolledSubjects')}</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('student.courses.pageTitle')}</h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        {total !== 1
                            ? t('student.courses.subjectsThisTermPlural', { count: formatNumber(total, locale) })
                            : t('student.courses.subjectsThisTerm', { count: formatNumber(total, locale) })}
                    </p>
                </div>

                {/* Mini stats */}
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                        <p className="text-2xl font-black text-emerald-600">{formatNumber(completed, locale)}</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{t('student.courses.statDone')}</p>
                    </div>
                    <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                        <p className="text-2xl font-black text-indigo-600">{formatNumber(inProgress, locale)}</p>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{t('student.courses.statActive')}</p>
                    </div>
                    <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-center">
                        <p className="text-2xl font-black text-slate-600">{formatNumber(total - completed - inProgress, locale)}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('student.courses.statNotStarted')}</p>
                    </div>
                </div>
            </div>

            {/* ── Course Grid ─────────────────────────────────────────── */}
            {courses.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200 bg-transparent">
                    <CardContent className="py-24 text-center">
                        <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="font-bold text-slate-700 text-lg">{t('student.courses.noCoursesTitle')}</h3>
                        <p className="text-slate-400 text-sm mt-1">{t('student.courses.noCoursesHint')}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {courses.map((course, idx) => {
                        const c = PALETTE[idx % PALETTE.length];
                        const progress = course.progress_percentage ?? 0;
                        const totalLessons = course.total_lessons ?? 0;
                        const completedLessons = course.completed_lessons ?? 0;
                        const isComplete = progress >= 100;
                        const isNew = progress === 0;

                        return (
                            <Card
                                key={course.id}
                                className="border-0 shadow-md hover:shadow-xl transition-all duration-300 group overflow-hidden rounded-2xl"
                            >
                                {/* Color banner */}
                                <div className={`h-28 bg-gradient-to-br ${c.grad} relative overflow-hidden flex items-end p-4`}>
                                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,white,transparent)]" />
                                    <div className="absolute top-4 right-4 opacity-30">
                                        <BookOpen className="h-10 w-10 text-white" />
                                    </div>
                                    {course.code && (
                                        <Badge className="bg-white/25 text-white border-0 backdrop-blur-sm text-[10px] font-black tracking-widest uppercase">
                                            {course.code}
                                        </Badge>
                                    )}
                                    {isComplete && (
                                        <div className="absolute top-3 right-3 h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-md">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                        </div>
                                    )}
                                    {isNew && !isComplete && (
                                        <div className="absolute top-3 right-3">
                                            <Badge className="bg-white/30 text-white border-0 backdrop-blur-sm text-[9px] font-black gap-1">
                                                <Sparkles className="h-2.5 w-2.5" /> NEW
                                            </Badge>
                                        </div>
                                    )}
                                </div>

                                <CardContent className="p-5 space-y-4">
                                    <div>
                                        <h3 className="font-black text-slate-900 text-lg leading-tight line-clamp-2 group-hover:text-indigo-700 transition-colors">
                                            {course.name}
                                        </h3>
                                        {course.description && (
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{course.description}</p>
                                        )}
                                    </div>

                                    {/* Meta */}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                                        {course.teacher_name && (
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" /> {course.teacher_name}
                                            </span>
                                        )}
                                        {totalLessons > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {t('student.courses.lessons', { count: formatNumber(totalLessons, locale) })}
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-400">{t('student.courses.completedProgress', { completed: formatNumber(completedLessons, locale), total: formatNumber(totalLessons, locale) })}</span>
                                            <span className={isComplete ? 'text-emerald-600' : progress > 0 ? c.text : 'text-slate-300'}>
                                                {Math.round(progress)}%
                                            </span>
                                        </div>
                                        <Progress value={progress} className={`h-2 ${c.bar}`} />
                                    </div>

                                    {/* CTA */}
                                    <Link href={`/student/courses/${course.id}`} className="block">
                                        <Button className={`w-full h-10 text-sm font-bold rounded-xl gap-2 shadow-sm ${
                                            isComplete
                                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                                : `bg-gradient-to-r ${c.grad} hover:opacity-90`
                                        }`}>
                                            {isComplete ? (
                                                <><GraduationCap className="h-4 w-4" /> {t('student.courses.ctaReview')}</>
                                            ) : progress > 0 ? (
                                                <><PlayCircle className="h-4 w-4" /> {t('student.courses.ctaContinue')}</>
                                            ) : (
                                                <><PlayCircle className="h-4 w-4" /> {t('student.courses.ctaStart')}</>
                                            )}
                                            <ChevronRight className="h-4 w-4 ml-auto" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
