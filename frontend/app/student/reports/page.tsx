// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"use client"

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { ProgressReport, ProgressReportHistoryItem } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Loader2, FileText, RefreshCw, Zap, TrendingUp, TrendingDown,
    Brain, BookOpen, Users, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/localization';

// ── Types ───────────────────────────────────────────────────────────────────

type ReportType = 'student' | 'parent' | 'teacher';

// ── Helpers ─────────────────────────────────────────────────────────────────

function riskClass(level: string) {
    const map: Record<string, string> = {
        high: 'bg-red-100 text-red-700 border-red-200',
        medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        low: 'bg-green-100 text-green-700 border-green-200',
    };
    return map[level?.toLowerCase()] ?? map.low;
}

function ScoreBar({ label, value, color = 'bg-indigo-500' }: {
    label: string; value: number; color?: string;
}) {
    const pct = Math.min(100, Math.max(0, Math.round(value)));
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function MetricTile({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
    return (
        <div className="rounded-xl border bg-card p-3 text-center space-y-1">
            <div className="flex justify-center">{icon}</div>
            <p className="text-lg font-bold">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
    );
}

// ── Report Panels ────────────────────────────────────────────────────────────

function StudentReportPanel({ data }: { data: ProgressReport['report'] }) {
    const { t } = useTranslation();
    const ai = data.ai ?? {};
    const m = data.metrics ?? {} as any;
    return (
        <div className="space-y-6">
            {ai.summary && (
                <Card className="border-indigo-100 bg-indigo-50/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Brain className="h-4 w-4 text-indigo-600" />{t('student.reports.aiSummary')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm leading-relaxed">{ai.summary}</p>
                        {ai.motivational_message && (
                            <p className="mt-2 text-sm text-indigo-600 font-medium italic">{ai.motivational_message}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MetricTile label={t('student.reports.metaAvgScore')} value={`${m.avg_score?.toFixed?.(1) ?? '–'}%`} icon={<TrendingUp className="h-4 w-4 text-indigo-600" />} />
                <MetricTile label={t('student.reports.metaAttendance')} value={`${m.attendance_rate?.toFixed?.(1) ?? '–'}%`} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
                <MetricTile label={t('student.reports.metaAiSessions')} value={m.tutor?.conversations_this_period ?? 0} icon={<Brain className="h-4 w-4 text-purple-600" />} />
                <MetricTile label={t('student.reports.metaPlanDone')} value={`${m.plan_completion_pct?.toFixed?.(0) ?? 0}%`} icon={<BookOpen className="h-4 w-4 text-blue-600" />} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(m.bkt?.skill_strengths?.length > 0) && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                                <TrendingUp className="h-4 w-4" />{t('student.reports.strengths')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {m.bkt.skill_strengths.map((s: any, i: number) => (
                                <ScoreBar key={i} label={s.skill} value={s.mastery_pct} color="bg-green-500" />
                            ))}
                        </CardContent>
                    </Card>
                )}

                {(m.bkt?.skill_gaps?.length > 0) && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                                <TrendingDown className="h-4 w-4" />{t('student.reports.areasToImprove')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {m.bkt.skill_gaps.map((g: any, i: number) => (
                                <ScoreBar key={i} label={g.skill} value={g.mastery_pct} color="bg-orange-400" />
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>

            {ai.recommended_actions?.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-500" />{t('student.reports.recommendedActions')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-1">
                            {ai.recommended_actions.map((a: string, i: number) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="text-indigo-500 font-bold text-xs mt-0.5">{i + 1}.</span>{a}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function ParentReportPanel({ data }: { data: ProgressReport['report'] }) {
    const { t } = useTranslation();
    const ai = data.ai ?? {};
    const m = data.metrics ?? {} as any;
    return (
        <div className="space-y-6">
            {ai.summary && (
                <Card className="border-blue-100 bg-blue-50/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />{t('student.reports.parentSummary')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm leading-relaxed">{ai.summary ?? ai.overview}</p>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <MetricTile label={t('student.reports.metaAvgScore')} value={`${m.avg_score?.toFixed?.(1) ?? '–'}%`} icon={<TrendingUp className="h-4 w-4 text-indigo-600" />} />
                <MetricTile label={t('student.reports.metaAttendance')} value={`${m.attendance_rate?.toFixed?.(1) ?? '–'}%`} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
                <MetricTile label={t('student.reports.metaAiTutorUse')} value={t('student.reports.metaAiTutorSessions', { count: m.tutor?.conversations_this_period ?? 0 })} icon={<Brain className="h-4 w-4 text-purple-600" />} />
            </div>

            {(ai.areas_to_watch?.length > 0) && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                            <AlertTriangle className="h-4 w-4" />{t('student.reports.areasToWatch')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-1">
                            {ai.areas_to_watch.map((a: string, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground">{a}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {(ai.home_support_tips ?? ai.home_tips)?.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-500" />{t('student.reports.howToHelpAtHome')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-1">
                            {(ai.home_support_tips ?? ai.home_tips).map((tip: string, i: number) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="text-blue-400 font-bold text-xs mt-0.5">•</span>{tip}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function TeacherReportPanel({ data }: { data: ProgressReport['report'] }) {
    const { t } = useTranslation();
    const ai = data.ai ?? {};
    const m = data.metrics ?? {} as any;
    const risk = (ai.risk_level ?? 'low').toLowerCase();
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{t('student.reports.riskLevel')}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${riskClass(risk)}`}>
                    {risk.toUpperCase()}
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MetricTile label={t('student.reports.metaAvgScore')} value={`${m.avg_score?.toFixed?.(1) ?? '–'}%`} icon={<TrendingUp className="h-4 w-4 text-indigo-600" />} />
                <MetricTile label={t('student.reports.metaAttendance')} value={`${m.attendance_rate?.toFixed?.(1) ?? '–'}%`} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
                <MetricTile label={t('student.reports.metaAiSessions')} value={m.tutor?.conversations_this_period ?? 0} icon={<Brain className="h-4 w-4 text-purple-600" />} />
                <MetricTile label={t('student.reports.metaPlanDone')} value={`${m.plan_completion_pct?.toFixed?.(0) ?? 0}%`} icon={<BookOpen className="h-4 w-4 text-blue-600" />} />
            </div>

            {ai.key_concerns?.length > 0 && (
                <Card className="border-red-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                            <AlertTriangle className="h-4 w-4" />{t('student.reports.keyConcerns')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-1">
                            {ai.key_concerns.map((c: string, i: number) => (
                                <li key={i} className="text-sm text-red-700">{c}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {ai.suggested_interventions?.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-500" />{t('student.reports.suggestedInterventions')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-1">
                            {ai.suggested_interventions.map((s: string, i: number) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="text-yellow-500 font-bold text-xs mt-0.5">{i + 1}.</span>{s}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {m.bkt?.skill_gaps?.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{t('student.reports.skillGaps')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {m.bkt.skill_gaps.map((g: any, i: number) => (
                            <ScoreBar key={i} label={g.skill} value={g.mastery_pct} color="bg-orange-400" />
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function StudentReportsPage() {
    const { t } = useTranslation();
    const [reportType, setReportType] = useState<ReportType>('student');
    const [reportResult, setReportResult] = useState<ProgressReport | null>(null);
    const [history, setHistory] = useState<ProgressReportHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const fetchReport = useCallback(async (type: ReportType) => {
        setLoading(true);
        try {
            const data = await api.ai.getMyProgressReport(type);
            setReportResult(data);
        } catch {
            setReportResult(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchReport(reportType); }, [fetchReport, reportType]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const data = await api.ai.generateMyProgressReport(reportType);
            setReportResult(data);
            toast.success(t('student.reports.toastGenerated'));
        } catch {
            toast.error(t('student.reports.toastGenerateFailed'));
        } finally {
            setGenerating(false);
        }
    };

    const handleShowHistory = async () => {
        if (!showHistory) {
            try {
                const data = await api.ai.getMyReportHistory(reportType, 10);
                setHistory(Array.isArray(data) ? data : []);
            } catch {
                setHistory([]);
            }
        }
        setShowHistory(v => !v);
    };

    const reportData = reportResult?.report ?? null;

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-4xl">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <FileText className="h-8 w-8 text-indigo-600" />
                        {t('student.reports.pageTitle')}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {t('student.reports.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => fetchReport(reportType)} title={t('student.reports.refreshTitle')}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleGenerate} disabled={generating}>
                        {generating
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('student.reports.generating')}</>
                            : <><Zap className="mr-2 h-4 w-4" />{t('student.reports.generateReport')}</>
                        }
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={reportType} onValueChange={v => setReportType(v as ReportType)}>
                <TabsList>
                    <TabsTrigger value="student">{t('student.reports.tabMyReport')}</TabsTrigger>
                    <TabsTrigger value="parent">{t('student.reports.tabParentView')}</TabsTrigger>
                    <TabsTrigger value="teacher">{t('student.reports.tabTeacherView')}</TabsTrigger>
                </TabsList>

                {(['student', 'parent', 'teacher'] as ReportType[]).map(type => (
                    <TabsContent key={type} value={type}>
                        {loading ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                            </div>
                        ) : !reportData ? (
                            <Card className="text-center p-12">
                                <div className="flex flex-col items-center space-y-4">
                                    <div className="p-4 bg-indigo-100 rounded-full">
                                        <FileText className="h-12 w-12 text-indigo-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold">{t('student.reports.noReportTitle')}</h3>
                                    <p className="text-muted-foreground max-w-sm text-sm">
                                        {t('student.reports.noReportHint')}
                                    </p>
                                    <Button onClick={handleGenerate} disabled={generating}>
                                        {generating ? t('student.reports.generating') : t('student.reports.generateReport')}
                                    </Button>
                                </div>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {/* Meta */}
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {reportResult?.cached ? t('student.reports.cached') : ''}
                                        {t('student.reports.generated')} {reportData.generated_at
                                            ? format(parseISO(reportData.generated_at), 'MMM d, yyyy h:mm a')
                                            : '–'}
                                    </span>
                                    {reportData.class_name && (
                                        <Badge variant="secondary">{reportData.class_name}</Badge>
                                    )}
                                </div>

                                {type === 'student' && <StudentReportPanel data={reportData} />}
                                {type === 'parent' && <ParentReportPanel data={reportData} />}
                                {type === 'teacher' && <TeacherReportPanel data={reportData} />}
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>

            {/* History */}
            {reportData && (
                <div>
                    <Button variant="ghost" size="sm" onClick={handleShowHistory}>
                        {showHistory ? t('student.reports.historyHide') : t('student.reports.historyShow')}
                    </Button>
                    {showHistory && (
                        <div className="mt-3 space-y-2">
                            {history.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t('student.reports.noPreviousReports')}</p>
                            ) : history.map((r, i) => (
                                <Card key={i} className="p-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">
                                            {r.generated_at ? format(parseISO(r.generated_at), 'MMM d, yyyy') : '–'}
                                        </span>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className="text-xs">{r.report_type}</Badge>
                                            {r.is_automated && <Badge variant="secondary" className="text-xs">{t('student.reports.historyAuto')}</Badge>}
                                        </div>
                                    </div>
                                    {r.report?.ai?.summary && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.report.ai.summary}</p>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
