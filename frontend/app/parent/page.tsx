// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, Brain, FileText, CheckCircle, Target, HelpCircle,
    GraduationCap, Wallet, CalendarDays, CalendarClock,
    AlertCircle, ChevronRight, TrendingUp, Activity
} from 'lucide-react';
import { academicAPI, aiAPI, Parent, Student } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/lib/localization';
import { formatNumber, formatDate } from '@/lib/i18n/format';
import { MotionCard } from '@/components/interactive/motion-card';
import { AnimatedCounter } from '@/components/interactive/animated-counter';
import { ProgressRing } from '@/components/interactive/progress-ring';

export default function ParentDashboard() {
    const [parentData, setParentData] = useState<Parent | null>(null);
    const [loading, setLoading] = useState(true);
    const [reportLoading, setReportLoading] = useState<string | null>(null);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [reportOpen, setReportOpen] = useState(false);
    const { toast } = useToast();
    const { t, locale } = useTranslation();

    useEffect(() => {
        academicAPI.getMyParent()
            .then(setParentData)
            .catch(() => toast({ title: 'Error', description: t('parent.dashboard.errorLoad'), variant: 'destructive' }))
            .finally(() => setLoading(false));
    }, [toast, t]);

    const fetchReport = async (studentId: string) => {
        setReportLoading(studentId);
        setReportOpen(true);
        setSelectedReport(null);
        try {
            const report = await aiAPI.getStudentReport(studentId);
            setSelectedReport(report);
        } catch {
            toast({ title: 'Error', description: t('parent.dashboard.errorReport'), variant: 'destructive' });
            setReportOpen(false);
        } finally {
            setReportLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        );
    }

    if (!parentData) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-700">{t('parent.dashboard.noProfileTitle')}</h2>
                <p className="text-slate-400 mt-1">{t('parent.dashboard.noProfileDesc')}</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-violet-600 font-bold mb-1">
                        <span className="text-[10px] uppercase tracking-[0.2em]">{t('parent.dashboard.sectionLabel')}</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {t('common.greeting', { name: parentData.user.first_name })}
                    </h1>
                    <p className="text-slate-500 font-medium">
                        {parentData.students.length !== 1
                            ? t('parent.dashboard.childrenLinked', { count: formatNumber(parentData.students.length, locale) })
                            : t('parent.dashboard.childLinked', { count: formatNumber(parentData.students.length, locale) })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/parent/meetings">
                        <Button variant="outline" className="gap-2 rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 text-xs font-bold h-9">
                            <CalendarClock className="h-4 w-4" /> {t('parent.dashboard.requestMeeting')}
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { href: '/parent/attendance', icon: CalendarDays, label: t('parent.dashboard.quickAttendance'), color: 'bg-blue-50 text-blue-600' },
                    { href: '/parent/grades', icon: GraduationCap, label: t('parent.dashboard.quickGrades'), color: 'bg-emerald-50 text-emerald-600' },
                    { href: '/parent/fees', icon: Wallet, label: t('parent.dashboard.quickFees'), color: 'bg-amber-50 text-amber-600' },
                    { href: '/parent/meetings', icon: CalendarClock, label: t('parent.dashboard.quickMeetings'), color: 'bg-violet-50 text-violet-600' },
                ].map(({ href, icon: Icon, label, color }, idx) => (
                    <Link key={href} href={href}>
                        <MotionCard index={idx} className="border-slate-200 cursor-pointer">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-bold text-slate-700">{label}</span>
                                <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />
                            </CardContent>
                        </MotionCard>
                    </Link>
                ))}
            </div>

            {/* Children cards */}
            {parentData.students.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-16 text-center">
                        <AlertCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">{t('parent.dashboard.noStudentsLinked')}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {parentData.students.map((child: Student, childIdx: number) => (
                        <MotionCard key={child.student_id} index={childIdx} className="border-slate-200 shadow-sm">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-11 w-11 rounded-full bg-violet-100 flex items-center justify-center font-black text-violet-700 text-base">
                                            {child.first_name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900">{child.first_name} {child.last_name}</p>
                                            <p className="text-xs text-slate-400 font-normal">{child.email}</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-violet-50 text-violet-700 border-violet-200 text-xs font-bold">
                                        {(child as any).class_name || t('parent.dashboard.noClass')}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-5">
                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { icon: <Activity className="h-4 w-4 text-indigo-500" />, label: t('parent.dashboard.statFocus'), value: child.focus_score || 0, suffix: '%', color: 'bg-indigo-50' },
                                        { icon: <TrendingUp className="h-4 w-4 text-orange-500" />, label: t('parent.dashboard.statStreak'), value: child.current_streak || 0, suffix: 'd', color: 'bg-orange-50' },
                                        { icon: <CalendarDays className="h-4 w-4 text-emerald-500" />, label: t('parent.dashboard.statAttendance'), value: (child as any).attendance_percentage || 0, suffix: '%', color: 'bg-emerald-50' },
                                    ].map((s, i) => (
                                        <div key={i} className={`${s.color} rounded-xl p-2.5 text-center`}>
                                            <div className="flex justify-center mb-1">{s.icon}</div>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</p>
                                            <p className="text-sm font-black text-slate-800">
                                                <AnimatedCounter value={s.value} locale={locale} suffix={s.suffix} />
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Attendance progress */}
                                {(parentData.user as any).tenant_features?.parent_attendance !== false && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500">{t('parent.dashboard.attendanceLast30')}</span>
                                        <ProgressRing value={(child as any).attendance_percentage || 0} size={44} strokeWidth={5} ringClassName="text-violet-600">
                                            <span className="text-[9px] font-black text-slate-700">
                                                {formatNumber((child as any).attendance_percentage || 0, locale)}%
                                            </span>
                                        </ProgressRing>
                                    </div>
                                )}

                                {/* Recent grades */}
                                {((child as any).recent_grades || []).length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText className="h-3.5 w-3.5" /> {t('parent.dashboard.recentResults')}
                                        </p>
                                        {((child as any).recent_grades as any[]).slice(0, 3).map((g, i) => (
                                            <div key={i} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 leading-tight">{g.assessment_title}</p>
                                                    <p className="text-[10px] text-slate-400">{g.subject}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-violet-700">{g.score}/{g.total_marks}</p>
                                                    <p className={`text-[10px] font-bold ${g.percentage >= 60 ? 'text-emerald-600' : 'text-red-500'}`}>{g.percentage}%</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Upcoming assessments */}
                                {((child as any).upcoming_assessments || []).length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <Target className="h-3.5 w-3.5" /> {t('parent.dashboard.upcoming')}
                                        </p>
                                        {((child as any).upcoming_assessments as any[]).slice(0, 2).map((a, i) => (
                                            <div key={i} className="flex justify-between items-center bg-amber-50/60 px-3 py-2 rounded-lg border border-amber-100">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 leading-tight">{a.title}</p>
                                                    <p className="text-[10px] text-slate-400">{a.subject}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-amber-700">
                                                        {formatDate(new Date(a.date), locale)}
                                                    </p>
                                                    <Badge variant="outline" className="text-[9px] px-1.5 h-4 uppercase">{a.type}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-50">
                                    <Link href={`/parent/children/${child.student_id}`}>
                                        <Button variant="outline" className="w-full h-9 text-xs font-bold rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 gap-1.5">
                                            <GraduationCap className="h-3.5 w-3.5" /> {t('parent.dashboard.btnDetails')}
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="outline"
                                        className="h-9 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
                                        onClick={() => fetchReport(child.student_id)}
                                        disabled={reportLoading === child.student_id}
                                    >
                                        {reportLoading === child.student_id
                                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('parent.dashboard.btnGenerating')}</>
                                            : <><Brain className="h-3.5 w-3.5" /> {t('parent.dashboard.btnAiReport')}</>
                                        }
                                    </Button>
                                </div>
                            </CardContent>
                        </MotionCard>
                    ))}
                </div>
            )}

            {/* AI Report Dialog */}
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black">
                            <Brain className="h-5 w-5 text-violet-600" /> {t('parent.dashboard.reportTitle')}
                        </DialogTitle>
                        {selectedReport && (
                            <DialogDescription>
                                {t('parent.dashboard.reportDesc', { name: selectedReport.student_name })}
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    {!selectedReport ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
                            <p className="text-slate-500 font-medium">{t('parent.dashboard.reportAnalysing')}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-violet-50 p-4 rounded-xl border border-violet-100">
                                <h4 className="font-bold text-violet-700 flex items-center gap-2 mb-2 text-sm">
                                    <CheckCircle className="h-4 w-4" /> {t('parent.dashboard.reportSummary')}
                                </h4>
                                <p className="text-sm leading-relaxed text-slate-700">{selectedReport.ai_report.summary}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                        <Target className="h-3.5 w-3.5" /> {t('parent.dashboard.reportStrengths')}
                                    </h4>
                                    <ul className="space-y-1">
                                        {(selectedReport.ai_report.strengths || []).map((s: string, i: number) => (
                                            <li key={i} className="text-xs text-slate-600 flex gap-2">
                                                <span className="text-emerald-500 font-bold mt-0.5">•</span> {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                                        <HelpCircle className="h-3.5 w-3.5" /> {t('parent.dashboard.reportAreasForGrowth')}
                                    </h4>
                                    <ul className="space-y-1">
                                        {(selectedReport.ai_report.weaknesses || []).map((w: string, i: number) => (
                                            <li key={i} className="text-xs text-slate-600 flex gap-2">
                                                <span className="text-orange-500 font-bold mt-0.5">•</span> {w}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="border-t pt-4 space-y-2">
                                <h4 className="text-sm font-bold text-slate-700">{t('parent.dashboard.reportRecommendations')}</h4>
                                {(selectedReport.ai_report.recommendations || []).map((r: string, i: number) => (
                                    <div key={i} className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100 italic">
                                        &ldquo;{r}&rdquo;
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
