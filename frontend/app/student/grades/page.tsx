// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Award, TrendingUp, Clock, ChevronRight, Target, BrainCircuit,
    BarChart3, ArrowUpRight, Sparkles, BookOpen, Trophy
} from 'lucide-react';
import { academicAPI, Result, Assessment, Subject } from '@/lib/api';
import { ProjectGradesCard } from '@/components/projects/ProjectGradesCard';
import { useTranslation } from '@/lib/localization';
import { formatNumber, formatDate } from '@/lib/i18n/format';

type ResultWithMeta = Result & {
    assessmentDetails?: Assessment;
    subjectDetails?: Subject;
    percentage?: number;
};

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) return (payload as any).results as T[];
    return [];
}

const GRADE_LABEL = (pct: number) => {
    if (pct >= 90) return { label: 'A+', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (pct >= 80) return { label: 'A', color: 'text-teal-600', bg: 'bg-teal-50' };
    if (pct >= 70) return { label: 'B+', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (pct >= 60) return { label: 'B', color: 'text-indigo-600', bg: 'bg-indigo-50' };
    if (pct >= 50) return { label: 'C', color: 'text-violet-600', bg: 'bg-violet-50' };
    return { label: 'F', color: 'text-red-600', bg: 'bg-red-50' };
};

export default function StudentGradesPage() {
    const router = useRouter();
    const { t, locale } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<ResultWithMeta[]>([]);
    const [subjectMastery, setSubjectMastery] = useState<Array<{ name: string; progress: number }>>([]);
    const [stats, setStats] = useState({ averageScore: 0, completedAssessments: 0, totalXp: 0, topSubject: 'N/A' });

    useEffect(() => {
        async function loadData() {
            try {
                const [myStudent, allResultsRaw, allAssessmentsRaw, allSubjectsRaw] = await Promise.all([
                    academicAPI.getMyStudent(),
                    academicAPI.getResults().catch(() => []),
                    academicAPI.getAssessments().catch(() => []),
                    academicAPI.getSubjects().catch(() => []),
                ]);
                const allResults = toList<Result>(allResultsRaw).filter((r) => String(r.student) === String(myStudent.id));
                const allAssessments = toList<Assessment>(allAssessmentsRaw);
                const allSubjects = toList<Subject>(allSubjectsRaw);
                const assessmentMap = new Map(allAssessments.map((a) => [String(a.assessment_id), a]));
                const subjectMap = new Map(allSubjects.map((s) => [Number(s.id), s]));
                const enriched = allResults.map((r) => {
                    const ad = assessmentMap.get(String(r.assessment));
                    const sd = ad ? subjectMap.get(Number(ad.subject)) : undefined;
                    const tm = Number(ad?.total_marks || 0);
                    const pct = tm > 0 ? Math.round((Number(r.score || 0) / tm) * 100) : Number(r.score || 0);
                    return { ...r, assessmentDetails: ad, subjectDetails: sd, percentage: pct };
                }).sort((a, b) => new Date(b.submitted_at || '').getTime() - new Date(a.submitted_at || '').getTime());
                setResults(enriched);
                if (enriched.length > 0) {
                    const avg = Math.round(enriched.reduce((acc, r) => acc + (r.percentage || 0), 0) / enriched.length);
                    const xp = enriched.reduce((acc, r) => acc + Math.round((r.percentage || 0) * 1.5), 0);
                    const groups = new Map<string, number[]>();
                    enriched.forEach((r) => { const k = r.subjectDetails?.name || 'General'; groups.set(k, [...(groups.get(k) || []), r.percentage || 0]); });
                    const mastery = Array.from(groups.entries()).map(([n, s]) => ({ name: n, progress: Math.round(s.reduce((a, b) => a + b, 0) / s.length) })).sort((a, b) => b.progress - a.progress);
                    setSubjectMastery(mastery.slice(0, 6));
                    setStats({ averageScore: avg, completedAssessments: enriched.length, totalXp: xp, topSubject: mastery[0]?.name || 'N/A' });
                }
            } catch (e) { console.error('Failed to load grades', e); }
            finally { setLoading(false); }
        }
        loadData();
    }, []);

    const passCount = useMemo(() => results.filter((r) => (r.percentage || 0) >= 50).length, [results]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse">
                <Award className="h-7 w-7 text-white" />
            </div>
            <p className="text-slate-400 text-sm font-medium animate-pulse">{t('student.grades.loading')}</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                        <Award className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">{t('student.grades.academicRecords')}</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('student.grades.pageTitle')}</h1>
                    <p className="text-slate-500 mt-1 text-sm">{t('student.grades.subtitle')}</p>
                </div>
                <Button variant="outline" className="rounded-xl border-slate-200 shadow-sm gap-2" onClick={() => router.push('/student/assessments')}>
                    <TrendingUp className="h-4 w-4 text-indigo-500" /> {t('student.grades.viewAssessments')}
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <Card className="border-0 shadow-xl overflow-hidden rounded-2xl col-span-2 lg:col-span-1">
                    <CardContent className="p-0 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700" />
                        <div className="relative p-6">
                            <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-3">{t('student.grades.averageGrade')}</p>
                            <div className="flex items-end gap-2">
                                <span className="text-5xl font-black text-white">{formatNumber(stats.averageScore, locale)}%</span>
                                <span className={`text-xl font-black mb-1 ${GRADE_LABEL(stats.averageScore).color.replace('600', '200')}`}>
                                    {GRADE_LABEL(stats.averageScore).label}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-indigo-200 bg-white/10 w-fit px-2 py-1 rounded-full">
                                <ArrowUpRight className="h-3 w-3" /> {t('student.grades.currentPerformance')}
                            </div>
                        </div>
                        <TrendingUp className="absolute -bottom-3 -right-3 h-20 w-20 opacity-10 rotate-12 text-white" />
                    </CardContent>
                </Card>

                {[
                    { labelKey: 'student.grades.xpEarned' as const, value: formatNumber(stats.totalXp, locale), subKey: 'student.grades.keepPushing' as const, icon: Sparkles, color: 'from-amber-50 to-orange-50', icolor: 'text-amber-600', ibg: 'bg-amber-100' },
                    { labelKey: 'student.grades.totalAssessed' as const, value: formatNumber(stats.completedAssessments, locale), subKey: null as null, subDynamic: t('student.grades.passedCount', { count: formatNumber(passCount, locale) }), icon: Target, color: 'from-blue-50 to-indigo-50', icolor: 'text-blue-600', ibg: 'bg-blue-100' },
                    { labelKey: 'student.grades.topMastery' as const, value: stats.topSubject, subKey: 'student.grades.strongestArea' as const, icon: Trophy, color: 'from-emerald-50 to-teal-50', icolor: 'text-emerald-600', ibg: 'bg-emerald-100' },
                ].map((s) => (
                    <Card key={s.labelKey} className="border-0 shadow-md rounded-2xl overflow-hidden">
                        <CardContent className="p-5 relative">
                            <div className={`absolute inset-0 bg-gradient-to-br ${s.color}`} />
                            <div className="relative flex flex-col gap-3">
                                <div className={`h-10 w-10 rounded-xl ${s.ibg} flex items-center justify-center`}>
                                    <s.icon className={`h-5 w-5 ${s.icolor}`} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t(s.labelKey)}</p>
                                    <p className="text-2xl font-black text-slate-900 mt-1 truncate">{s.value}</p>
                                    <p className="text-[10px] text-slate-500 font-medium mt-1">{s.subDynamic ?? (s.subKey ? t(s.subKey) : '')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Results + Mastery */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Recent Assessments */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-slate-900">{t('student.grades.recentAssessments')}</h2>
                    <div className="space-y-3">
                        {results.map((result) => {
                            const pct = result.percentage || 0;
                            const grade = GRADE_LABEL(pct);
                            return (
                                <Card
                                    key={result.id}
                                    className="border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group rounded-xl overflow-hidden"
                                    onClick={() => router.push(`/student/assessments/${result.assessment}/results?result_id=${result.id}`)}
                                >
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-xl ${grade.bg} flex items-center justify-center shrink-0`}>
                                                <span className={`font-black text-sm ${grade.color}`}>{grade.label}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                                    {result.assessmentDetails?.title || t('student.grades.assessmentFallback', { id: String(result.assessment) })}
                                                </h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {result.submitted_at ? formatDate(new Date(result.submitted_at), locale) : 'N/A'}
                                                    </span>
                                                    {result.subjectDetails?.name && (
                                                        <Badge className="bg-slate-100 text-slate-500 border-0 text-[9px] font-bold">
                                                            {result.subjectDetails.name}
                                                        </Badge>
                                                    )}
                                                    {result.ai_feedback && (
                                                        <Badge className="bg-indigo-50 text-indigo-600 border-0 text-[9px] font-bold gap-1">
                                                            <BrainCircuit className="h-2.5 w-2.5" /> AI
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="text-right">
                                                    <div className="text-2xl font-black text-slate-900">{formatNumber(pct, locale)}%</div>
                                                    <Badge className={`${pct >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} border-0 text-[9px] font-bold`}>
                                                        {pct >= 50 ? t('student.grades.passed') : t('student.grades.retry')}
                                                    </Badge>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </div>
                                        <Progress value={pct} className="h-1.5 mt-3 bg-slate-100" />
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {results.length === 0 && (
                            <Card className="border-0 shadow-md rounded-xl">
                                <CardContent className="py-16 text-center">
                                    <BookOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 font-medium">{t('student.grades.noResultsYet')}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Subject Mastery */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900">{t('student.grades.subjectMastery')}</h2>
                    <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-br from-slate-50 to-white border-b border-slate-50 px-6 pt-5 pb-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
                                <BarChart3 className="h-4 w-4 text-indigo-600" /> {t('student.grades.topicProgress')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            {subjectMastery.map((s) => {
                                const g = GRADE_LABEL(s.progress);
                                return (
                                    <div key={s.name} className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-slate-700 truncate max-w-[140px]">{s.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-black ${g.color}`}>{g.label}</span>
                                                <span className="font-black text-slate-900 text-sm">{formatNumber(s.progress, locale)}%</span>
                                            </div>
                                        </div>
                                        <Progress value={s.progress} className="h-2.5 bg-slate-100" />
                                    </div>
                                );
                            })}
                            {subjectMastery.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-4">{t('student.grades.noMasteryData')}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Growth Insight */}
                    <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)' }}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400/20 rounded-full -mr-16 -mt-16 blur-3xl" />
                        <div className="relative p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-indigo-500/30 rounded-xl">
                                    <TrendingUp className="h-4 w-4 text-indigo-300" />
                                </div>
                                <h4 className="font-bold text-white">{t('student.grades.growthInsight')}</h4>
                            </div>
                            <p className="text-sm text-indigo-100 leading-relaxed mb-4">
                                {t('student.grades.growthInsightText', { subject: stats.topSubject })}
                            </p>
                            <Button
                                className="w-full bg-white text-indigo-900 hover:bg-white/95 font-bold rounded-xl shadow-md"
                                onClick={() => router.push('/student/learning-path')}
                            >
                                {t('student.grades.viewLearningPlan')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Project grades — Phase 9 #6 read-time aggregation */}
            <ProjectGradesCard detailHrefBase="/student/projects" />
        </div>
    );
}
