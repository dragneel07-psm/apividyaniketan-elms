// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    FileText, Calendar, CheckCircle2, AlertCircle, BookOpen,
    Upload, Clock, Loader2, ChevronRight, Flame, Award, Inbox
} from 'lucide-react';
import { academicAPI, Assessment, Submission } from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/localization';
import { formatNumber, formatDate } from '@/lib/i18n/format';

export default function AssignmentsDashboard() {
    const { t, locale } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<Assessment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try {
            setLoading(true);
            const student = await academicAPI.getMyStudent();
            const studentId = student?.student_id ?? null;
            const [allAssessments, allSubmissions] = await Promise.all([
                academicAPI.getAssessments(),
                academicAPI.getSubmissions(),
            ]);
            setAssignments(allAssessments.filter((a) => a.type === 'assignment' || !a.type));
            setSubmissions(studentId ? allSubmissions.filter((s) => s.student === studentId) : []);
        } catch {
            toast.error(t('student.assignments.errorLoad'));
        } finally {
            setLoading(false);
        }
    }

    const getDaysUntilDue = (dueDate: string) => {
        if (!dueDate) return 999;
        return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
    };

    // Build one Map for O(1) submission lookup instead of linear-scanning
    // submissions for every assignment on every filter pass.
    const submissionByAssessment = useMemo(() => {
        const map = new Map<string, Submission>();
        for (const s of submissions) map.set(String(s.assessment), s);
        return map;
    }, [submissions]);

    const { pending, submitted, graded } = useMemo(() => {
        const p: Assessment[] = [];
        const s: Assessment[] = [];
        const g: Assessment[] = [];
        for (const a of assignments) {
            const status = submissionByAssessment.get(a.assessment_id ?? '')?.status ?? 'pending';
            if (status === 'pending' || status === 'draft') p.push(a);
            else if (status === 'submitted') s.push(a);
            else if (status === 'graded') g.push(a);
        }
        return { pending: p, submitted: s, graded: g };
    }, [assignments, submissionByAssessment]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-slate-400 text-sm">{t('student.assignments.loading')}</p>
        </div>
    );

    const AssignmentCard = ({ assignment, status }: { assignment: Assessment; status: string }) => {
        const days = getDaysUntilDue(assignment.due_date ?? '');
        const isOverdue = days < 0;
        const isDueSoon = days >= 0 && days <= 3;
        const sub = submissionByAssessment.get(assignment.assessment_id ?? '');
        const score = sub?.result?.score;

        let urgencyColor = 'border-slate-100';
        if (status === 'pending') {
            if (isOverdue) urgencyColor = 'border-l-4 border-l-red-500';
            else if (isDueSoon) urgencyColor = 'border-l-4 border-l-orange-400';
            else urgencyColor = 'border-l-4 border-l-indigo-400';
        } else if (status === 'graded') {
            urgencyColor = 'border-l-4 border-l-emerald-500';
        } else {
            urgencyColor = 'border-l-4 border-l-blue-400';
        }

        return (
            <Card className={`flex flex-col hover:shadow-lg transition-all duration-200 border ${urgencyColor} overflow-hidden rounded-xl group`}>
                <CardContent className="p-5 space-y-4 flex-1 flex flex-col">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            {status === 'pending' && isOverdue && (
                                <Badge className="bg-red-100 text-red-700 border-0 text-[10px] font-bold">{t('student.assignments.badgeOverdue')}</Badge>
                            )}
                            {status === 'pending' && isDueSoon && !isOverdue && (
                                <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px] font-bold gap-1">
                                    <Flame className="h-2.5 w-2.5" /> {t('student.assignments.badgeDueSoon')}
                                </Badge>
                            )}
                            {status === 'graded' && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] font-bold">{t('student.assignments.badgeGraded')}</Badge>
                            )}
                            {status === 'submitted' && (
                                <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] font-bold">{t('student.assignments.badgeSubmitted')}</Badge>
                            )}
                            {status === 'pending' && !isOverdue && !isDueSoon && (
                                <Badge className="bg-slate-100 text-slate-500 border-0 text-[10px] font-bold">{t('student.assignments.badgePending')}</Badge>
                            )}
                        </div>
                        {assignment.total_marks && (
                            <span className="text-xs font-black text-slate-500 shrink-0">{formatNumber(Number(assignment.total_marks), locale)} {t('student.assignments.pts')}</span>
                        )}
                    </div>

                    <div className="flex-1">
                        <h3 className="font-bold text-slate-900 text-base line-clamp-2 group-hover:text-indigo-700 transition-colors">
                            {assignment.title}
                        </h3>
                        {assignment.description && (
                            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{assignment.description}</p>
                        )}
                    </div>

                    {/* Due date */}
                    <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-500">
                            {assignment.due_date ? formatDate(new Date(assignment.due_date), locale) : t('student.assignments.noDeadline')}
                        </span>
                        {status === 'pending' && (
                            <span className={`ml-auto font-bold ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-slate-400'}`}>
                                {isOverdue ? t('student.assignments.daysLate', { count: formatNumber(Math.abs(days), locale) }) : days === 0 ? t('student.assignments.dueToday') : t('student.assignments.daysLeft', { count: formatNumber(days, locale) })}
                            </span>
                        )}
                    </div>

                    {/* Score row for graded */}
                    {status === 'graded' && score !== undefined && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                            <Award className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="text-sm font-black text-emerald-700">
                                {formatNumber(Number(score), locale)} / {formatNumber(Number(assignment.total_marks), locale)} {t('student.assignments.pts')}
                            </span>
                            <span className="text-xs text-emerald-500 ml-auto font-medium">
                                {assignment.total_marks ? Math.round((Number(score) / Number(assignment.total_marks)) * 100) : 0}%
                            </span>
                        </div>
                    )}

                    {/* CTA */}
                    <div className="pt-1">
                        {status === 'pending' ? (
                            <Link href={`/student/assignments/${assignment.assessment_id}`} className="block">
                                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-xl font-bold">
                                    <Upload className="h-4 w-4" />
                                    {isOverdue ? t('student.assignments.submitNow') : t('student.assignments.startAssignment')}
                                    <ChevronRight className="h-4 w-4 ml-auto" />
                                </Button>
                            </Link>
                        ) : (
                            <Button variant="outline" className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl gap-2">
                                <FileText className="h-4 w-4" /> {t('student.assignments.viewDetails')}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">{t('student.assignments.sectionLabel')}</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('student.assignments.pageTitle')}</h1>
                <p className="text-slate-500 mt-1 text-sm">{t('student.assignments.subtitle')}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Card className="border-0 shadow-md overflow-hidden rounded-2xl">
                    <CardContent className="p-5 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50" />
                        <div className="relative flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">{t('student.assignments.statPending')}</p>
                                <p className="text-4xl font-black text-orange-700">{formatNumber(pending.length, locale)}</p>
                                <p className="text-[10px] text-orange-400 mt-2 font-medium">
                                    {t('student.assignments.overdueCount', { count: formatNumber(pending.filter((a) => getDaysUntilDue(a.due_date ?? '') < 0).length, locale) })}
                                </p>
                            </div>
                            <div className="h-14 w-14 rounded-2xl bg-orange-100 flex items-center justify-center">
                                <AlertCircle className="h-7 w-7 text-orange-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md overflow-hidden rounded-2xl">
                    <CardContent className="p-5 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50" />
                        <div className="relative flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">{t('student.assignments.statSubmitted')}</p>
                                <p className="text-4xl font-black text-blue-700">{formatNumber(submitted.length, locale)}</p>
                                <p className="text-[10px] text-blue-400 mt-2 font-medium">{t('student.assignments.awaitingGrades')}</p>
                            </div>
                            <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                                <Clock className="h-7 w-7 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md overflow-hidden rounded-2xl">
                    <CardContent className="p-5 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50" />
                        <div className="relative flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">{t('student.assignments.statGraded')}</p>
                                <p className="text-4xl font-black text-emerald-700">{formatNumber(graded.length, locale)}</p>
                                <p className="text-[10px] text-emerald-400 mt-2 font-medium">{t('student.assignments.resultsAvailable')}</p>
                            </div>
                            <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pending" className="space-y-6">
                <TabsList className="bg-white border border-slate-200 p-1 rounded-2xl shadow-sm w-full md:w-auto h-auto gap-1">
                    <TabsTrigger value="pending" className="rounded-xl px-5 py-2.5 font-bold text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                        {t('student.assignments.tabPending', { count: formatNumber(pending.length, locale) })}
                    </TabsTrigger>
                    <TabsTrigger value="submitted" className="rounded-xl px-5 py-2.5 font-bold text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                        {t('student.assignments.tabSubmitted', { count: formatNumber(submitted.length, locale) })}
                    </TabsTrigger>
                    <TabsTrigger value="graded" className="rounded-xl px-5 py-2.5 font-bold text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                        {t('student.assignments.tabGraded', { count: formatNumber(graded.length, locale) })}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    {pending.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {pending.map((a) => <AssignmentCard key={a.assessment_id} assignment={a} status="pending" />)}
                        </div>
                    ) : (
                        <EmptyState message={t('student.assignments.emptyPending')} icon={CheckCircle2} color="emerald" />
                    )}
                </TabsContent>

                <TabsContent value="submitted">
                    {submitted.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {submitted.map((a) => <AssignmentCard key={a.assessment_id} assignment={a} status="submitted" />)}
                        </div>
                    ) : (
                        <EmptyState message={t('student.assignments.emptySubmitted')} icon={FileText} color="blue" />
                    )}
                </TabsContent>

                <TabsContent value="graded">
                    {graded.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {graded.map((a) => <AssignmentCard key={a.assessment_id} assignment={a} status="graded" />)}
                        </div>
                    ) : (
                        <EmptyState message={t('student.assignments.emptyGraded')} icon={BookOpen} color="indigo" />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function EmptyState({ message, icon: Icon = Inbox, color = 'slate' }: { message: string; icon?: React.ElementType; color?: string }) {
    const bg: Record<string, string> = { emerald: 'bg-emerald-50 text-emerald-400 border-emerald-100', blue: 'bg-blue-50 text-blue-400 border-blue-100', indigo: 'bg-indigo-50 text-indigo-400 border-indigo-100', slate: 'bg-slate-50 text-slate-400 border-slate-200' };
    return (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 border ${bg[color] ?? bg.slate}`}>
                <Icon className="h-8 w-8" />
            </div>
            <p className="text-slate-500 font-medium max-w-xs text-center">{message}</p>
        </div>
    );
}
